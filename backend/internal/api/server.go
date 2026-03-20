package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"comparesome/backend/internal/auth"
	"comparesome/backend/internal/i18n"
	"comparesome/backend/internal/middleware"
	"comparesome/backend/internal/service"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
)

type Server struct {
	store           *service.Store
	jwtManager      *auth.Manager
	allowedOrigins  map[string]struct{}
	allowAllOrigins bool
}

func NewServer(store *service.Store, jwtManager *auth.Manager, allowedOrigins []string) *Server {
	originsMap := make(map[string]struct{}, len(allowedOrigins))
	allowAllOrigins := false
	for _, origin := range allowedOrigins {
		trimmed := strings.TrimSpace(origin)
		if trimmed == "" {
			continue
		}
		if trimmed == "*" {
			allowAllOrigins = true
			continue
		}
		originsMap[trimmed] = struct{}{}
	}
	return &Server{
		store:           store,
		jwtManager:      jwtManager,
		allowedOrigins:  originsMap,
		allowAllOrigins: allowAllOrigins,
	}
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
			r.Get("/me/settings", s.meSettings)
			r.Put("/me/settings", s.updateMeSettings)
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
		origin := strings.TrimSpace(r.Header.Get("Origin"))
		if origin != "" {
			w.Header().Add("Vary", "Origin")
			if s.allowAllOrigins {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if _, ok := s.allowedOrigins[origin]; ok {
				w.Header().Set("Access-Control-Allow-Origin", origin)
			}
		}
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

type errorResponse struct {
	Error       string            `json:"error"`
	FieldErrors map[string]string `json:"fieldErrors,omitempty"`
}

func writeAPIError(w http.ResponseWriter, status int, message string, fieldErrors map[string]string) {
	message = strings.TrimSpace(message)
	if message == "" {
		message = "Request failed."
	}
	writeJSON(w, status, errorResponse{
		Error:       message,
		FieldErrors: fieldErrors,
	})
}

func decodeJSON(r *http.Request, target any) error {
	return json.NewDecoder(r.Body).Decode(target)
}

func handleServiceError(w http.ResponseWriter, r *http.Request, err error) {
	lang := i18n.LanguageFromRequest(r)
	switch {
	case err == nil:
		return
	case errors.Is(err, service.ErrUnauthorized):
		writeAPIError(w, http.StatusUnauthorized, i18n.Message(lang, "error.unauthorized"), nil)
	case errors.Is(err, service.ErrForbidden):
		writeAPIError(w, http.StatusForbidden, i18n.Message(lang, "error.forbidden"), nil)
	case errors.Is(err, service.ErrNotFound):
		writeAPIError(w, http.StatusNotFound, i18n.Message(lang, "error.not_found"), nil)
	case errors.Is(err, service.ErrLimitExceeded):
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.limit_exceeded"), nil)
	case errors.Is(err, service.ErrValidation):
		message := i18n.Message(lang, "error.validation")
		_, fieldErrors, ok := service.GetValidationDetails(err)
		if !ok {
			fieldErrors = nil
		}
		writeAPIError(w, http.StatusBadRequest, message, fieldErrors)
	default:
		writeAPIError(w, http.StatusInternalServerError, i18n.Message(lang, "error.internal"), nil)
	}
}

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	var req loginRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	user, err := s.store.Authenticate(r.Context(), req.Username, req.Password)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	token, err := s.jwtManager.GenerateToken(user.ID, user.Username, user.IsAdmin, user.MustChangePassword)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	_ = s.store.TouchLastLogin(r.Context(), user.ID)
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (s *Server) me(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeAPIError(w, http.StatusUnauthorized, i18n.Message(lang, "error.missing_claims"), nil)
		return
	}
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

func (s *Server) meSettings(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeAPIError(w, http.StatusUnauthorized, i18n.Message(lang, "error.missing_claims"), nil)
		return
	}
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"language": user.Language})
}

type updateMeSettingsRequest struct {
	Language string `json:"language"`
}

func (s *Server) updateMeSettings(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeAPIError(w, http.StatusUnauthorized, i18n.Message(lang, "error.missing_claims"), nil)
		return
	}
	var req updateMeSettingsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	user, err := s.store.UpdateUserLanguage(r.Context(), claims.UserID, req.Language)
	if err != nil {
		if errors.Is(err, service.ErrValidation) {
			writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_language"), nil)
			return
		}
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"user": user})
}

type changePasswordRequest struct {
	OldPassword string `json:"oldPassword"`
	NewPassword string `json:"newPassword"`
}

func (s *Server) changePassword(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		writeAPIError(w, http.StatusUnauthorized, i18n.Message(lang, "error.missing_claims"), nil)
		return
	}
	var req changePasswordRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	if err := s.store.ChangePassword(r.Context(), claims.UserID, req.OldPassword, req.NewPassword); err != nil {
		handleServiceError(w, r, err)
		return
	}
	user, err := s.store.GetUserByID(r.Context(), claims.UserID)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	token, err := s.jwtManager.GenerateToken(user.ID, user.Username, user.IsAdmin, user.MustChangePassword)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"token": token, "user": user})
}

func (s *Server) dashboard(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	data, err := s.store.BuildDashboard(r.Context(), claims.UserID, claims.IsAdmin)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, data)
}

func (s *Server) users(w http.ResponseWriter, r *http.Request) {
	users, err := s.store.ListUsers(r.Context())
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"users": users})
}

type createComparisonRequest struct {
	Name           string  `json:"name"`
	ParticipantIDs []int64 `json:"participantIds"`
}

func (s *Server) createComparison(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	var req createComparisonRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	cmp, err := s.store.CreateComparison(r.Context(), claims.UserID, req.Name, req.ParticipantIDs)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, cmp)
}

func (s *Server) listComparisons(w http.ResponseWriter, r *http.Request) {
	claims := middleware.GetClaims(r.Context())
	items, err := s.store.ListComparisons(r.Context(), claims.UserID, claims.IsAdmin)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"comparisons": items})
}

func parseIDParam(r *http.Request, key string) (int64, error) {
	return strconv.ParseInt(strings.TrimSpace(chi.URLParam(r, key)), 10, 64)
}

func (s *Server) getComparison(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	id, err := parseIDParam(r, "comparisonID")
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_comparison_id"), nil)
		return
	}
	cmp, err := s.store.GetComparison(r.Context(), id, claims.UserID, claims.IsAdmin)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, cmp)
}

type createVariantRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
}

func (s *Server) createVariant(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	comparisonID, err := parseIDParam(r, "comparisonID")
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_comparison_id"), nil)
		return
	}
	var req createVariantRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	variant, err := s.store.CreateVariant(r.Context(), comparisonID, claims.UserID, claims.IsAdmin, req.Title, req.Description)
	if err != nil {
		handleServiceError(w, r, err)
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
	lang := i18n.LanguageFromRequest(r)
	claims := middleware.GetClaims(r.Context())
	variantID, err := parseIDParam(r, "variantID")
	if err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_variant_id"), nil)
		return
	}
	var req rateVariantRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	err = s.store.RateVariant(r.Context(), variantID, claims.UserID, claims.IsAdmin, req.Pros, req.Cons, req.Rank)
	if err != nil {
		handleServiceError(w, r, err)
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
	lang := i18n.LanguageFromRequest(r)
	var req adminCreateUserRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	user, err := s.store.CreateUser(r.Context(), req.Username, req.Password, req.IsAdmin)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusCreated, user)
}

func (s *Server) adminFeatureFlags(w http.ResponseWriter, r *http.Request) {
	flags, err := s.store.ListFeatureFlags(r.Context())
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"flags": flags})
}

type updateFeatureFlagRequest struct {
	Enabled bool `json:"enabled"`
}

func (s *Server) adminUpdateFeatureFlag(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	key := strings.TrimSpace(chi.URLParam(r, "key"))
	var req updateFeatureFlagRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	if err := s.store.SetFeatureFlag(r.Context(), key, req.Enabled); err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]bool{"ok": true})
}

func (s *Server) adminGetSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.store.GetSettings(r.Context())
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, settings)
}

type updateSettingsRequest struct {
	MaxVariantsPerUser int `json:"maxVariantsPerUser"`
}

func (s *Server) adminUpdateSettings(w http.ResponseWriter, r *http.Request) {
	lang := i18n.LanguageFromRequest(r)
	var req updateSettingsRequest
	if err := decodeJSON(r, &req); err != nil {
		writeAPIError(w, http.StatusBadRequest, i18n.Message(lang, "error.invalid_payload"), nil)
		return
	}
	settings, err := s.store.UpdateSettings(r.Context(), req.MaxVariantsPerUser)
	if err != nil {
		handleServiceError(w, r, err)
		return
	}
	writeJSON(w, http.StatusOK, settings)
}
