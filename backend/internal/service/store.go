package service

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"sort"
	"strings"
	"time"

	"comparesome/backend/internal/i18n"
	"comparesome/backend/internal/model"

	"golang.org/x/crypto/bcrypt"
)

type Store struct {
	db *sql.DB
}

func NewStore(db *sql.DB) *Store {
	return &Store{db: db}
}

func normalizeUsername(v string) string {
	return strings.ToLower(strings.TrimSpace(v))
}

func normalizeLanguage(v string) (string, bool) {
	lang := i18n.NormalizeLanguage(v)
	if lang != strings.ToLower(strings.TrimSpace(v)) {
		return "", false
	}
	return lang, true
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func (s *Store) Authenticate(ctx context.Context, username, password string) (*model.User, error) {
	username = normalizeUsername(username)
	if username == "" || password == "" {
		return nil, ErrValidation
	}

	var user model.User
	var hash string
	err := s.db.QueryRowContext(ctx, `
		SELECT id, username, password_hash, is_admin, must_change_password, language, created_at
		FROM users
		WHERE username = $1
	`, username).Scan(&user.ID, &user.Username, &hash, &user.IsAdmin, &user.MustChangePassword, &user.Language, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrUnauthorized
		}
		return nil, err
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) != nil {
		return nil, ErrUnauthorized
	}
	return &user, nil
}

func (s *Store) ChangePassword(ctx context.Context, userID int64, oldPassword, newPassword string) error {
	if len(newPassword) < 6 {
		return fmt.Errorf("%w: password must be at least 6 chars", ErrValidation)
	}

	var currentHash string
	err := s.db.QueryRowContext(ctx, `SELECT password_hash FROM users WHERE id = $1`, userID).Scan(&currentHash)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}
	if bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(oldPassword)) != nil {
		return ErrUnauthorized
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	_, err = s.db.ExecContext(ctx, `
		UPDATE users
		SET password_hash = $1, must_change_password = FALSE
		WHERE id = $2
	`, string(hash), userID)
	return err
}

func (s *Store) CreateUser(ctx context.Context, username, password string, isAdmin bool) (*model.User, error) {
	username = normalizeUsername(username)
	if username == "" || password == "" {
		return nil, ErrValidation
	}
	if len(password) < 6 {
		return nil, fmt.Errorf("%w: password must be at least 6 chars", ErrValidation)
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return nil, err
	}
	var user model.User
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO users(username, password_hash, is_admin, must_change_password, language)
		VALUES ($1, $2, $3, TRUE, 'ru')
		RETURNING id, username, is_admin, must_change_password, language, created_at
	`, username, string(hash), isAdmin).Scan(&user.ID, &user.Username, &user.IsAdmin, &user.MustChangePassword, &user.Language, &user.CreatedAt)
	if err != nil {
		if strings.Contains(strings.ToLower(err.Error()), "duplicate") {
			return nil, fmt.Errorf("%w: username already exists", ErrValidation)
		}
		return nil, err
	}
	return &user, nil
}

func (s *Store) ListUsers(ctx context.Context) ([]model.User, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id, username, is_admin, must_change_password, language, created_at
		FROM users
		ORDER BY username ASC
	`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := make([]model.User, 0)
	for rows.Next() {
		var user model.User
		if err := rows.Scan(&user.ID, &user.Username, &user.IsAdmin, &user.MustChangePassword, &user.Language, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	return users, rows.Err()
}

func (s *Store) GetUserByID(ctx context.Context, userID int64) (*model.User, error) {
	var user model.User
	err := s.db.QueryRowContext(ctx, `
		SELECT id, username, is_admin, must_change_password, language, created_at
		FROM users
		WHERE id = $1
	`, userID).Scan(&user.ID, &user.Username, &user.IsAdmin, &user.MustChangePassword, &user.Language, &user.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &user, nil
}

func (s *Store) ListFeatureFlags(ctx context.Context) ([]model.FeatureFlag, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT key, enabled FROM feature_flags ORDER BY key ASC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	flags := make([]model.FeatureFlag, 0)
	for rows.Next() {
		var f model.FeatureFlag
		if err := rows.Scan(&f.Key, &f.Enabled); err != nil {
			return nil, err
		}
		flags = append(flags, f)
	}
	return flags, rows.Err()
}

func (s *Store) SetFeatureFlag(ctx context.Context, key string, enabled bool) error {
	if strings.TrimSpace(key) == "" {
		return ErrValidation
	}
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO feature_flags(key, enabled)
		VALUES ($1, $2)
		ON CONFLICT (key) DO UPDATE SET enabled = EXCLUDED.enabled
	`, key, enabled)
	return err
}

func (s *Store) IsFeatureEnabled(ctx context.Context, key string) (bool, error) {
	var enabled bool
	err := s.db.QueryRowContext(ctx, `SELECT enabled FROM feature_flags WHERE key = $1`, key).Scan(&enabled)
	if err != nil {
		if err == sql.ErrNoRows {
			return false, nil
		}
		return false, err
	}
	return enabled, nil
}

func (s *Store) GetSettings(ctx context.Context) (model.AppSettings, error) {
	var out model.AppSettings
	err := s.db.QueryRowContext(ctx, `SELECT max_variants_per_user FROM app_settings WHERE id = 1`).Scan(&out.MaxVariantsPerUser)
	if err != nil {
		return model.AppSettings{}, err
	}
	return out, nil
}

func (s *Store) UpdateSettings(ctx context.Context, maxVariants int) (model.AppSettings, error) {
	if maxVariants < 1 || maxVariants > 50 {
		return model.AppSettings{}, fmt.Errorf("%w: maxVariantsPerUser must be 1..50", ErrValidation)
	}
	_, err := s.db.ExecContext(ctx, `
		UPDATE app_settings
		SET max_variants_per_user = $1, updated_at = NOW()
		WHERE id = 1
	`, maxVariants)
	if err != nil {
		return model.AppSettings{}, err
	}
	return s.GetSettings(ctx)
}

func (s *Store) CreateComparison(ctx context.Context, creatorID int64, name string, participantIDs []int64) (*model.Comparison, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return nil, ErrValidation
	}
	all := []int64{creatorID}
	seen := map[int64]struct{}{creatorID: {}}
	for _, id := range participantIDs {
		if _, ok := seen[id]; ok {
			continue
		}
		seen[id] = struct{}{}
		all = append(all, id)
	}
	if len(all) > 5 {
		return nil, fmt.Errorf("%w: max 5 users per comparison", ErrLimitExceeded)
	}

	// Ensure all requested users exist.
	for _, uid := range all {
		var exists bool
		err := s.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1)`, uid).Scan(&exists)
		if err != nil {
			return nil, err
		}
		if !exists {
			return nil, fmt.Errorf("%w: user %d does not exist", ErrValidation, uid)
		}
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	var cmp model.Comparison
	err = tx.QueryRowContext(ctx, `
		INSERT INTO comparisons(name, created_by)
		VALUES ($1, $2)
		RETURNING id, name, created_by, created_at
	`, name, creatorID).Scan(&cmp.ID, &cmp.Name, &cmp.CreatedBy, &cmp.CreatedAt)
	if err != nil {
		return nil, err
	}

	for _, uid := range all {
		if _, err := tx.ExecContext(ctx, `INSERT INTO comparison_users(comparison_id, user_id) VALUES ($1, $2)`, cmp.ID, uid); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	creator, err := s.GetUserByID(ctx, creatorID)
	if err == nil {
		cmp.CreatedByName = creator.Username
	}
	return &cmp, nil
}

func (s *Store) hasComparisonAccess(ctx context.Context, comparisonID, userID int64, isAdmin bool) (bool, error) {
	if isAdmin {
		return true, nil
	}
	var exists bool
	err := s.db.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM comparison_users
			WHERE comparison_id = $1 AND user_id = $2
		)
	`, comparisonID, userID).Scan(&exists)
	return exists, err
}

func (s *Store) ListComparisons(ctx context.Context, userID int64, isAdmin bool) ([]model.Comparison, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.id, c.name, c.created_by, u.username, c.created_at,
			(SELECT COUNT(*) FROM variants v WHERE v.comparison_id = c.id) AS variants_count
		FROM comparisons c
		JOIN users u ON u.id = c.created_by
		WHERE $1::bool OR EXISTS (
			SELECT 1 FROM comparison_users cu WHERE cu.comparison_id = c.id AND cu.user_id = $2
		)
		ORDER BY c.created_at DESC
	`, isAdmin, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.Comparison, 0)
	for rows.Next() {
		var c model.Comparison
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedBy, &c.CreatedByName, &c.CreatedAt, &c.VariantsCount); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) GetComparison(ctx context.Context, comparisonID, userID int64, isAdmin bool) (*model.ComparisonDetail, error) {
	ok, err := s.hasComparisonAccess(ctx, comparisonID, userID, isAdmin)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrForbidden
	}

	var cmp model.Comparison
	err = s.db.QueryRowContext(ctx, `
		SELECT c.id, c.name, c.created_by, u.username, c.created_at
		FROM comparisons c
		JOIN users u ON u.id = c.created_by
		WHERE c.id = $1
	`, comparisonID).Scan(&cmp.ID, &cmp.Name, &cmp.CreatedBy, &cmp.CreatedByName, &cmp.CreatedAt)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, ErrNotFound
		}
		return nil, err
	}

	participants := make([]model.ComparisonParticipant, 0)
	partRows, err := s.db.QueryContext(ctx, `
		SELECT u.id, u.username
		FROM comparison_users cu
		JOIN users u ON u.id = cu.user_id
		WHERE cu.comparison_id = $1
		ORDER BY u.username ASC
	`, comparisonID)
	if err != nil {
		return nil, err
	}
	defer partRows.Close()
	for partRows.Next() {
		var p model.ComparisonParticipant
		if err := partRows.Scan(&p.UserID, &p.Username); err != nil {
			return nil, err
		}
		participants = append(participants, p)
	}
	if err := partRows.Err(); err != nil {
		return nil, err
	}

	variants := make([]model.Variant, 0)
	vRows, err := s.db.QueryContext(ctx, `
		SELECT v.id, v.comparison_id, v.title, v.description, v.created_by, cu.username, v.created_at,
			COALESCE(AVG(vr.rank), 0), COUNT(vr.id)
		FROM variants v
		JOIN users cu ON cu.id = v.created_by
		LEFT JOIN variant_ratings vr ON vr.variant_id = v.id
		WHERE v.comparison_id = $1
		GROUP BY v.id, cu.username
		ORDER BY COALESCE(AVG(vr.rank), 0) DESC, v.created_at DESC
	`, comparisonID)
	if err != nil {
		return nil, err
	}
	defer vRows.Close()

	variantIDs := make([]int64, 0)
	varMap := map[int64]*model.Variant{}
	for vRows.Next() {
		var v model.Variant
		if err := vRows.Scan(&v.ID, &v.ComparisonID, &v.Title, &v.Description, &v.CreatedBy, &v.CreatedByName, &v.CreatedAt, &v.AverageRank, &v.RatingCount); err != nil {
			return nil, err
		}
		v.AverageRank = round2(v.AverageRank)
		v.Ratings = []model.VariantRating{}
		variants = append(variants, v)
		variantIDs = append(variantIDs, v.ID)
		varMap[v.ID] = &variants[len(variants)-1]
	}
	if err := vRows.Err(); err != nil {
		return nil, err
	}

	if len(variantIDs) > 0 {
		rRows, err := s.db.QueryContext(ctx, `
			SELECT vr.variant_id, vr.user_id, u.username, vr.pros, vr.cons, vr.rank, vr.updated_at
			FROM variant_ratings vr
			JOIN users u ON u.id = vr.user_id
			JOIN variants v ON v.id = vr.variant_id
			WHERE v.comparison_id = $1
			ORDER BY vr.updated_at DESC
		`, comparisonID)
		if err != nil {
			return nil, err
		}
		defer rRows.Close()
		for rRows.Next() {
			var rating model.VariantRating
			if err := rRows.Scan(&rating.VariantID, &rating.UserID, &rating.Username, &rating.Pros, &rating.Cons, &rating.Rank, &rating.UpdatedAt); err != nil {
				return nil, err
			}
			if v, ok := varMap[rating.VariantID]; ok {
				v.Ratings = append(v.Ratings, rating)
			}
		}
		if err := rRows.Err(); err != nil {
			return nil, err
		}
	}

	return &model.ComparisonDetail{
		Comparison:   cmp,
		Participants: participants,
		Variants:     variants,
	}, nil
}

func (s *Store) CreateVariant(ctx context.Context, comparisonID, userID int64, isAdmin bool, title, description string) (*model.Variant, error) {
	title = strings.TrimSpace(title)
	description = strings.TrimSpace(description)
	if title == "" {
		return nil, ErrValidation
	}
	ok, err := s.hasComparisonAccess(ctx, comparisonID, userID, isAdmin)
	if err != nil {
		return nil, err
	}
	if !ok {
		return nil, ErrForbidden
	}

	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, err
	}
	var cnt int
	err = s.db.QueryRowContext(ctx, `
		SELECT COUNT(*) FROM variants WHERE comparison_id = $1 AND created_by = $2
	`, comparisonID, userID).Scan(&cnt)
	if err != nil {
		return nil, err
	}
	if cnt >= settings.MaxVariantsPerUser {
		return nil, fmt.Errorf("%w: max variants per user reached (%d)", ErrLimitExceeded, settings.MaxVariantsPerUser)
	}

	var v model.Variant
	err = s.db.QueryRowContext(ctx, `
		INSERT INTO variants(comparison_id, title, description, created_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, comparison_id, title, description, created_by, created_at
	`, comparisonID, title, description, userID).Scan(&v.ID, &v.ComparisonID, &v.Title, &v.Description, &v.CreatedBy, &v.CreatedAt)
	if err != nil {
		return nil, err
	}

	user, err := s.GetUserByID(ctx, userID)
	if err == nil {
		v.CreatedByName = user.Username
	}
	return &v, nil
}

func (s *Store) RateVariant(ctx context.Context, variantID, userID int64, isAdmin bool, pros, cons string, rank int) error {
	if rank < 1 || rank > 10 {
		return fmt.Errorf("%w: rank must be 1..10", ErrValidation)
	}
	var comparisonID int64
	err := s.db.QueryRowContext(ctx, `SELECT comparison_id FROM variants WHERE id = $1`, variantID).Scan(&comparisonID)
	if err != nil {
		if err == sql.ErrNoRows {
			return ErrNotFound
		}
		return err
	}
	ok, err := s.hasComparisonAccess(ctx, comparisonID, userID, isAdmin)
	if err != nil {
		return err
	}
	if !ok {
		return ErrForbidden
	}

	_, err = s.db.ExecContext(ctx, `
		INSERT INTO variant_ratings(variant_id, user_id, pros, cons, rank, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW())
		ON CONFLICT (variant_id, user_id)
		DO UPDATE SET pros = EXCLUDED.pros, cons = EXCLUDED.cons, rank = EXCLUDED.rank, updated_at = NOW()
	`, variantID, userID, strings.TrimSpace(pros), strings.TrimSpace(cons), rank)
	return err
}

func (s *Store) BuildDashboard(ctx context.Context, userID int64, isAdmin bool) (*model.DashboardData, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT c.id, c.name, c.created_by, u.username, c.created_at,
			(SELECT COUNT(*) FROM variants v WHERE v.comparison_id = c.id) as variants_count
		FROM comparisons c
		JOIN users u ON u.id = c.created_by
		WHERE $1::bool OR EXISTS (
			SELECT 1 FROM comparison_users cu WHERE cu.comparison_id = c.id AND cu.user_id = $2
		)
		ORDER BY c.created_at DESC
		LIMIT 8
	`, isAdmin, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	last := make([]model.DashboardComparison, 0)
	for rows.Next() {
		var c model.Comparison
		if err := rows.Scan(&c.ID, &c.Name, &c.CreatedBy, &c.CreatedByName, &c.CreatedAt, &c.VariantsCount); err != nil {
			return nil, err
		}
		top, err := s.getTopVariantsForComparison(ctx, c.ID, 2)
		if err != nil {
			return nil, err
		}
		last = append(last, model.DashboardComparison{Comparison: c, TopVariants: top})
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	topRows, err := s.db.QueryContext(ctx, `
		SELECT v.id, v.title, c.id, c.name, COALESCE(AVG(vr.rank), 0), COUNT(vr.id)
		FROM variants v
		JOIN comparisons c ON c.id = v.comparison_id
		LEFT JOIN variant_ratings vr ON vr.variant_id = v.id
		WHERE $1::bool OR EXISTS (
			SELECT 1 FROM comparison_users cu WHERE cu.comparison_id = v.comparison_id AND cu.user_id = $2
		)
		GROUP BY v.id, c.id, c.name
		ORDER BY COALESCE(AVG(vr.rank), 0) DESC, COUNT(vr.id) DESC, v.id DESC
		LIMIT 10
	`, isAdmin, userID)
	if err != nil {
		return nil, err
	}
	defer topRows.Close()

	top := make([]model.DashboardVariant, 0)
	for topRows.Next() {
		var v model.DashboardVariant
		if err := topRows.Scan(&v.VariantID, &v.VariantTitle, &v.ComparisonID, &v.ComparisonName, &v.AverageRank, &v.RatingCount); err != nil {
			return nil, err
		}
		v.AverageRank = round2(v.AverageRank)
		top = append(top, v)
	}
	if err := topRows.Err(); err != nil {
		return nil, err
	}

	return &model.DashboardData{
		LastComparisons:  last,
		TopRatedVariants: top,
	}, nil
}

func (s *Store) getTopVariantsForComparison(ctx context.Context, comparisonID int64, limit int) ([]model.DashboardVariant, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT v.id, v.title, c.id, c.name, COALESCE(AVG(vr.rank), 0), COUNT(vr.id)
		FROM variants v
		JOIN comparisons c ON c.id = v.comparison_id
		LEFT JOIN variant_ratings vr ON vr.variant_id = v.id
		WHERE v.comparison_id = $1
		GROUP BY v.id, c.id, c.name
		ORDER BY COALESCE(AVG(vr.rank), 0) DESC, COUNT(vr.id) DESC, v.id DESC
		LIMIT $2
	`, comparisonID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]model.DashboardVariant, 0)
	for rows.Next() {
		var v model.DashboardVariant
		if err := rows.Scan(&v.VariantID, &v.VariantTitle, &v.ComparisonID, &v.ComparisonName, &v.AverageRank, &v.RatingCount); err != nil {
			return nil, err
		}
		v.AverageRank = round2(v.AverageRank)
		out = append(out, v)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	sort.SliceStable(out, func(i, j int) bool {
		if out[i].AverageRank == out[j].AverageRank {
			return out[i].RatingCount > out[j].RatingCount
		}
		return out[i].AverageRank > out[j].AverageRank
	})
	return out, nil
}

func (s *Store) TouchLastLogin(ctx context.Context, userID int64) error {
	_, err := s.db.ExecContext(ctx, `UPDATE users SET created_at = created_at WHERE id = $1`, userID)
	return err
}

func (s *Store) UpdateUserLanguage(ctx context.Context, userID int64, language string) (*model.User, error) {
	lang, ok := normalizeLanguage(language)
	if !ok {
		return nil, fmt.Errorf("%w: unsupported language", ErrValidation)
	}
	res, err := s.db.ExecContext(ctx, `UPDATE users SET language = $1 WHERE id = $2`, lang, userID)
	if err != nil {
		return nil, err
	}
	affected, err := res.RowsAffected()
	if err != nil {
		return nil, err
	}
	if affected == 0 {
		return nil, ErrNotFound
	}
	return s.GetUserByID(ctx, userID)
}

func (s *Store) Now() time.Time {
	return time.Now().UTC()
}
