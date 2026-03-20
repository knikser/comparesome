package model

import "time"

type User struct {
	ID                 int64     `json:"id"`
	Username           string    `json:"username"`
	IsAdmin            bool      `json:"isAdmin"`
	MustChangePassword bool      `json:"mustChangePassword"`
	Language           string    `json:"language"`
	CreatedAt          time.Time `json:"createdAt"`
}

type FeatureFlag struct {
	Key     string `json:"key"`
	Enabled bool   `json:"enabled"`
}

type AppSettings struct {
	MaxVariantsPerUser int `json:"maxVariantsPerUser"`
}

type Comparison struct {
	ID            int64     `json:"id"`
	Name          string    `json:"name"`
	CreatedBy     int64     `json:"createdBy"`
	CreatedByName string    `json:"createdByName"`
	CreatedAt     time.Time `json:"createdAt"`
	VariantsCount int       `json:"variantsCount,omitempty"`
}

type ComparisonParticipant struct {
	UserID   int64  `json:"userId"`
	Username string `json:"username"`
}

type VariantRating struct {
	VariantID int64     `json:"variantId"`
	UserID    int64     `json:"userId"`
	Username  string    `json:"username"`
	Pros      string    `json:"pros"`
	Cons      string    `json:"cons"`
	Rank      int       `json:"rank"`
	UpdatedAt time.Time `json:"updatedAt"`
}

type Variant struct {
	ID            int64           `json:"id"`
	ComparisonID  int64           `json:"comparisonId"`
	Title         string          `json:"title"`
	Description   string          `json:"description"`
	CreatedBy     int64           `json:"createdBy"`
	CreatedByName string          `json:"createdByName"`
	CreatedAt     time.Time       `json:"createdAt"`
	AverageRank   float64         `json:"averageRank"`
	RatingCount   int             `json:"ratingCount"`
	Ratings       []VariantRating `json:"ratings"`
}

type ComparisonDetail struct {
	Comparison   Comparison              `json:"comparison"`
	Participants []ComparisonParticipant `json:"participants"`
	Variants     []Variant               `json:"variants"`
}

type DashboardVariant struct {
	VariantID      int64   `json:"variantId"`
	VariantTitle   string  `json:"variantTitle"`
	ComparisonID   int64   `json:"comparisonId"`
	ComparisonName string  `json:"comparisonName"`
	AverageRank    float64 `json:"averageRank"`
	RatingCount    int     `json:"ratingCount"`
}

type DashboardComparison struct {
	Comparison  Comparison         `json:"comparison"`
	TopVariants []DashboardVariant `json:"topVariants"`
}

type DashboardData struct {
	LastComparisons  []DashboardComparison `json:"lastComparisons"`
	TopRatedVariants []DashboardVariant    `json:"topRatedVariants"`
}
