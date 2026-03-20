package config

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	AppEnv             string
	Port               string
	DatabaseDSN        string
	JWTSecret          string
	TokenTTLHours      int
	CORSAllowedOrigins []string
}

func Load() (Config, error) {
	cfg := Config{
		AppEnv:        getEnv("APP_ENV", "development"),
		Port:          getEnv("PORT", "8080"),
		DatabaseDSN:   os.Getenv("DATABASE_DSN"),
		JWTSecret:     getEnv("JWT_SECRET", "change-me-in-production"),
		TokenTTLHours: 24,
		CORSAllowedOrigins: parseCSV(getEnv(
			"CORS_ALLOWED_ORIGINS",
			"http://localhost:5173,http://localhost:5443,http://158.160.231.213,http://каргины.рф,https://каргины.рф",
		)),
	}

	if cfg.DatabaseDSN == "" {
		return Config{}, fmt.Errorf("DATABASE_DSN is required")
	}
	return cfg, nil
}

func getEnv(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func parseCSV(input string) []string {
	parts := strings.Split(input, ",")
	result := make([]string, 0, len(parts))
	for _, part := range parts {
		value := strings.TrimSpace(part)
		if value == "" {
			continue
		}
		result = append(result, value)
	}
	return result
}
