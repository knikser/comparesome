package db

import (
	"context"
	"database/sql"
	"fmt"

	_ "github.com/jackc/pgx/v5/stdlib"
	"golang.org/x/crypto/bcrypt"
)

func Open(ctx context.Context, dsn string) (*sql.DB, error) {
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.PingContext(ctx); err != nil {
		return nil, err
	}
	return db, nil
}

func Migrate(ctx context.Context, conn *sql.DB) error {
	stmts := []string{
		`
		CREATE TABLE IF NOT EXISTS users (
			id BIGSERIAL PRIMARY KEY,
			username TEXT UNIQUE NOT NULL,
			password_hash TEXT NOT NULL,
			is_admin BOOLEAN NOT NULL DEFAULT FALSE,
			must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS feature_flags (
			key TEXT PRIMARY KEY,
			enabled BOOLEAN NOT NULL DEFAULT TRUE
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS app_settings (
			id INT PRIMARY KEY,
			max_variants_per_user INT NOT NULL DEFAULT 10,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS comparisons (
			id BIGSERIAL PRIMARY KEY,
			name TEXT NOT NULL,
			created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS comparison_users (
			comparison_id BIGINT NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			PRIMARY KEY (comparison_id, user_id)
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS variants (
			id BIGSERIAL PRIMARY KEY,
			comparison_id BIGINT NOT NULL REFERENCES comparisons(id) ON DELETE CASCADE,
			title TEXT NOT NULL,
			description TEXT NOT NULL DEFAULT '',
			created_by BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		);
		`,
		`
		CREATE TABLE IF NOT EXISTS variant_ratings (
			id BIGSERIAL PRIMARY KEY,
			variant_id BIGINT NOT NULL REFERENCES variants(id) ON DELETE CASCADE,
			user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			pros TEXT NOT NULL DEFAULT '',
			cons TEXT NOT NULL DEFAULT '',
			rank INT NOT NULL CHECK (rank BETWEEN 1 AND 10),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			UNIQUE (variant_id, user_id)
		);
		`,
		`CREATE INDEX IF NOT EXISTS idx_variants_comparison_id ON variants(comparison_id);`,
		`CREATE INDEX IF NOT EXISTS idx_variant_ratings_variant_id ON variant_ratings(variant_id);`,
		`CREATE INDEX IF NOT EXISTS idx_comparison_users_user_id ON comparison_users(user_id);`,
	}

	for _, stmt := range stmts {
		if _, err := conn.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("migrate failed: %w", err)
		}
	}

	adminHash, err := bcrypt.GenerateFromPassword([]byte("admin"), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	if _, err := conn.ExecContext(ctx, `
		INSERT INTO users(username, password_hash, is_admin, must_change_password)
		VALUES ('admin', $1, TRUE, TRUE)
		ON CONFLICT (username) DO NOTHING;
	`, string(adminHash)); err != nil {
		return err
	}

	defaultFlags := []string{"comparisons.create", "variants.create", "ratings.edit", "dashboard.view", "admin.panel"}
	for _, key := range defaultFlags {
		if _, err := conn.ExecContext(ctx, `INSERT INTO feature_flags(key, enabled) VALUES ($1, TRUE) ON CONFLICT (key) DO NOTHING`, key); err != nil {
			return err
		}
	}

	if _, err := conn.ExecContext(ctx, `
		INSERT INTO app_settings(id, max_variants_per_user)
		VALUES (1, 10)
		ON CONFLICT (id) DO NOTHING;
	`); err != nil {
		return err
	}

	return nil
}
