package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"comparesome/backend/internal/auth"
	"comparesome/backend/internal/middleware"
	"comparesome/backend/internal/service"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

type Server struct {
	store      *service.Store
	jwtManager *auth.Manager
}

func NewServer(store *service.Store, jwtManager *auth.Manager) *Server {
	return &Server{store: store, jwtManager: jwtManager}
}

func (s *Server) Router() http.Handler {
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(s.cors)

	r.Get("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	r.Route("/api", func(r chi.Router) {
		r.Post("/auth/login", s.login)

		r.Group(func(r chi.Router) {
			r.Use(middleware.AuthRequired(s.jwtManager))
			r.Get("/me", s.me)
			r.Post("/auth/change-password", s.changePassword)

			r.Group(func(r chi.Router) {
				r.Use(middleware.RequirePasswordChanged)
				r.With(middleware.RequireFeature("dashboard.view", s.store.IsFeatureEnabled)).Get("/dashboard", s.dashboard)

				r.Get("/users", s.users)
				r.With(middleware.RequireFeature("comparisons.create", s.store.IsFeatureEnabled)).Post("/comparisons", s.createComparison)
				r.Get("/comparisons", s.listComparisons)
				r.Get("/comparisons/{comparisonID}", s.getComparison)
				r.With(middleware.RequireFeature("variants.create", s.store.IsFeatureEnabled)).Post("/comparisons/{comparisonID}/variants", s.createVariant)
				r.With(middleware.RequireFeature("ratings.edit", s.store.IsFeatureEnabled)).Put("/variants/{variantID}/rating", s.rateVariant)

				r.Route("/admin", func(r chi.Router) {
					r.Use(middleware.RequireAdmin)
					r.With(middleware.RequireFeature("admin.panel", s.store.IsFeatureEnabled)).Get("/users", s.adminUsers)
					r.With(middleware.RequireFeature("admin.panel", s.store.IsFeatureEnabled)).Post("/users", s.adminCreateUser)
					r.With(middleware.RequireFeature("admin.panel", s.store.IsFeatureEnabled)).Get("/feature-flags", s.adminFeatureFlags)
					r.With(middleware.RequireFeature("admin.panel", s.store.IsFeatureEnabled)).Put("/feature-flags/{key}", s.adminUpdateFeatureFlag)
					r.With(middleware.RequireFeature("admin.panel", s.store.IsFeatureEnabled)).Get("/settings", s.adminGetSettings)
					r.With(middleware.RequireFeature("admin.panel", s.store.IsFeatureEnabled)).Put("/settings", s.adminUpdateSettings)
				})
			})
		})
	})

	return r
}

func (s *Server) cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func decodeJSON(r *http.Request, target any) error {
	return json.NewDecoder(r.Body).Decode(target)
}

func handleServiceError(w http.ResponseWriter, err error) {
	switch {
	case err == nil:
		return
	case errors.Is(err, service.ErrUnauthorized):
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": err.Error()})
	case errors.Is(err, service.ErrForbidden):
		writeJSON(w, http.StatusForbidden, map[string]string{"error": err.Error()})
	case errors.Is(err, service.ErrNotFound):
		writeJSON(w, http.StatusNotFound, map[string]string{"error": err.Error()})
	case errors.Is(err, service.ErrLimitExceeded):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	case errors.Is(err, service.ErrValidation):
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
	default:
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "internal server error"})
	}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	user, err := s.store.Authenticate(r.Context(), req.Username, req.Password)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	token, err := s.jwtManager.GenerateToken(user.ID, user.Username, user.IsAdmin, user.MustChangePassword)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	_ = s.store.TouchLastLogin(r.Context(), user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing claims"})
		return
	}
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

type changePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "missing claims"})
		return
	}
	var req changePasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	if err := s.store.ChangePassword(r.Context(), claims.UserID, req.OldPassword, req.NewPassword); err != nil {
		handleServiceError(w, err)
		return
	}
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	token, err := s.jwtManager.GenerateToken(user.ID, user.Username, user.IsAdmin, user.MustChangePassword)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	data, err := s.store.BuildDashboard(r.Context(), claims.UserID, claims.IsAdmin)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (s *Server) users(w http.ResponseWriter, r *http.Request) {
	users, err := s.store.ListUsers(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

type createComparisonRequest struct {
	Name           string  `json:"name"`
	ParticipantIDs []int64 `json:"participantIds"`
}

func (s *Server) createComparison(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	var req createComparisonRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	cmp, err := s.store.CreateComparison(r.Context(), claims.UserID, req.Name, req.ParticipantIDs)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, cmp)
}

func (s *Server) listComparisons(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	items, err := s.store.ListComparisons(r.Context(), claims.UserID, claims.IsAdmin)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"comparisons": items})
}

func parseIDParam(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(chi.URLParam(r, key)), 10, 64)
}

func (s *Server) getComparison(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	id, err := parseIDParam(r, "comparisonID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comparison id"})
		return
	}
	cmp, err := s.store.GetComparison(r.Context(), id, claims.UserID, claims.IsAdmin)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, cmp)
}

type createVariantRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

func (s *Server) createVariant(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	comparisonID, err := parseIDParam(r, "comparisonID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid comparison id"})
		return
	}
	var req createVariantRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	variant, err := s.store.CreateVariant(r.Context(), comparisonID, claims.UserID, claims.IsAdmin, req.Title, req.Description)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, variant)
}

type rateVariantRequest struct {
	Pros string `json:"pros"`
	Cons string `json:"cons"`
	Rank int    `json:"rank"`
}

func (s *Server) rateVariant(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	variantID, err := parseIDParam(r, "variantID")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid variant id"})
		return
	}
	var req rateVariantRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	err = s.store.RateVariant(r.Context(), variantID, claims.UserID, claims.IsAdmin, req.Pros, req.Cons, req.Rank)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) adminUsers(w http.ResponseWriter, r *http.Request) {
	s.users(w, r)
}

type adminCreateUserRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	IsAdmin  bool   `json:"isAdmin"`
}

func (s *Server) adminCreateUser(w http.ResponseWriter, r *http.Request) {
	var req adminCreateUserRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	user, err := s.store.CreateUser(r.Context(), req.Username, req.Password, req.IsAdmin)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func (s *Server) adminFeatureFlags(w http.ResponseWriter, r *http.Request) {
	flags, err := s.store.ListFeatureFlags(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"flags": flags})
}

type updateFeatureFlagRequest struct {
	Enabled bool `json:"enabled"`
}

func (s *Server) adminUpdateFeatureFlag(w http.ResponseWriter, r *http.Request) {
	key := strings.TrimSpace(chi.URLParam(r, "key"))
	var req updateFeatureFlagRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	if err := s.store.SetFeatureFlag(r.Context(), key, req.Enabled); err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.GetSettings(r.Context())
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

type updateSettingsRequest struct {
	MaxVariantsPerUser int `json:"maxVariantsPerUser"`
}

func (s *Server) adminUpdateSettings(w http.ResponseWriter, r *http.Request) {
	var req updateSettingsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "invalid payload"})
		return
	}
	settings, err := s.store.UpdateSettings(r.Context(), req.MaxVariantsPerUser)
	if err != nil {
		handleServiceError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, settings)
}
