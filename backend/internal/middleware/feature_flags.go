package middleware

import (
	"context"
	"net/http"
)

type FlagChecker func(ctx context.Context, key string) (bool, error)

func RequireFeature(flagKey string, checker FlagChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			enabled, err := checker(r.Context(), flagKey)
			if err != nil {
				writeLocalizedError(w, r, http.StatusInternalServerError, "error.feature_flag_check_failed")
				return
			}
			if !enabled {
				writeLocalizedError(w, r, http.StatusForbidden, "error.feature_disabled", flagKey)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
