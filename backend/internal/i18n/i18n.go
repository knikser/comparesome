package i18n

import (
	"fmt"
	"net/http"
	"strings"
)

const (
	LangRU = "ru"
	LangEN = "en"
)

func NormalizeLanguage(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case LangEN:
		return LangEN
	default:
		return LangRU
	}
}

func LanguageFromRequest(r *http.Request) string {
	return NormalizeLanguage(r.URL.Query().Get("lang"))
}

func Message(lang, key string, args ...any) string {
	template, ok := messages[NormalizeLanguage(lang)][key]
	if !ok {
		template = messages[LangRU][key]
	}
	return fmt.Sprintf(template, args...)
}

var messages = map[string]map[string]string{
	LangRU: {
		"error.unauthorized":              "не авторизован",
		"error.forbidden":                 "доступ запрещен",
		"error.not_found":                 "не найдено",
		"error.validation":                "ошибка валидации",
		"error.limit_exceeded":            "превышен лимит",
		"error.internal":                  "внутренняя ошибка сервера",
		"error.invalid_payload":           "некорректное тело запроса",
		"error.missing_claims":            "отсутствуют данные авторизации",
		"error.invalid_comparison_id":     "некорректный id сравнения",
		"error.invalid_variant_id":        "некорректный id варианта",
		"error.missing_bearer_token":      "отсутствует Bearer токен",
		"error.invalid_token":             "некорректный токен",
		"error.admin_required":            "требуется роль администратора",
		"error.password_change_required":  "требуется смена пароля",
		"error.feature_flag_check_failed": "не удалось проверить feature flag",
		"error.feature_disabled":          "функция отключена: %s",
		"error.invalid_language":          "поддерживаются только языки ru и en",
	},
	LangEN: {
		"error.unauthorized":              "unauthorized",
		"error.forbidden":                 "forbidden",
		"error.not_found":                 "not found",
		"error.validation":                "validation error",
		"error.limit_exceeded":            "limit exceeded",
		"error.internal":                  "internal server error",
		"error.invalid_payload":           "invalid payload",
		"error.missing_claims":            "missing auth claims",
		"error.invalid_comparison_id":     "invalid comparison id",
		"error.invalid_variant_id":        "invalid variant id",
		"error.missing_bearer_token":      "missing bearer token",
		"error.invalid_token":             "invalid token",
		"error.admin_required":            "admin role required",
		"error.password_change_required":  "password change required",
		"error.feature_flag_check_failed": "feature flag check failed",
		"error.feature_disabled":          "feature disabled: %s",
		"error.invalid_language":          "only ru and en languages are supported",
	},
}
