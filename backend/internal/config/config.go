package config

import (
	"fmt"
	"os"
)

type Config struct {
	AppEnv        string
	Port          string
	DatabaseDSN   string
	JWTSecret     string
	TokenTTLHours int
}

func Load() (Config, error) {
	cfg := Config{
		AppEnv:        getEnv("APP_ENV", "development"),
		Port:          getEnv("PORT", "8080"),
		DatabaseDSN:   os.Getenv("DATABASE_DSN"),
		JWTSecret:     getEnv("JWT_SECRET", "change-me-in-production"),
		TokenTTLHours: 24,
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
