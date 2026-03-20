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
				writeError(w, http.StatusInternalServerError, "feature flag check failed")
				return
			}
			if !enabled {
				writeError(w, http.StatusForbidden, "feature disabled: "+flagKey)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
