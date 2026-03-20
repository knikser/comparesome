package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"

	"comparesome/backend/internal/auth"
	"comparesome/backend/internal/i18n"
)

type contextKey string

const claimsKey contextKey = "claims"

type ErrorResponse struct {
	Error string `json:"error"`
}

func writeError(w http.ResponseWriter, status int, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(ErrorResponse{Error: message})
}

func writeLocalizedError(w http.ResponseWriter, r *http.Request, status int, messageKey string, args ...any) {
	lang := i18n.LanguageFromRequest(r)
	writeError(w, status, i18n.Message(lang, messageKey, args...))
}

func AuthRequired(manager *auth.Manager) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				writeLocalizedError(w, r, http.StatusUnauthorized, "error.missing_bearer_token")
				return
			}
			token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
			claims, err := manager.ParseToken(token)
			if err != nil {
				writeLocalizedError(w, r, http.StatusUnauthorized, "error.invalid_token")
				return
			}
			ctx := context.WithValue(r.Context(), claimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetClaims(ctx context.Context) *auth.Claims {
	claims, _ := ctx.Value(claimsKey).(*auth.Claims)
	return claims
}

func RequireAdmin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetClaims(r.Context())
		if claims == nil || !claims.IsAdmin {
			writeLocalizedError(w, r, http.StatusForbidden, "error.admin_required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func RequirePasswordChanged(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetClaims(r.Context())
		if claims == nil {
			writeLocalizedError(w, r, http.StatusUnauthorized, "error.missing_claims")
			return
		}
		if claims.MustChangePassword {
			writeLocalizedError(w, r, http.StatusForbidden, "error.password_change_required")
			return
		}
		next.ServeHTTP(w, r)
	})
}
