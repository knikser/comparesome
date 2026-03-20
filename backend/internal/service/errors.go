package service

import (
	"errors"
	"strings"
)

var (
	ErrUnauthorized  = errors.New("unauthorized")
	ErrForbidden     = errors.New("forbidden")
	ErrNotFound      = errors.New("not found")
	ErrValidation    = errors.New("validation error")
	ErrLimitExceeded = errors.New("limit exceeded")
)

type ValidationError struct {
	Message     string
	FieldErrors map[string]string
}

func NewValidationError(message string, fieldErrors map[string]string) error {
	copied := map[string]string{}
	for key, value := range fieldErrors {
		trimmedKey := strings.TrimSpace(key)
		trimmedValue := strings.TrimSpace(value)
		if trimmedKey == "" || trimmedValue == "" {
			continue
		}
		copied[trimmedKey] = trimmedValue
	}
	return &ValidationError{
		Message:     strings.TrimSpace(message),
		FieldErrors: copied,
	}
}

func (e *ValidationError) Error() string {
	if strings.TrimSpace(e.Message) != "" {
		return e.Message
	}
	return ErrValidation.Error()
}

func (e *ValidationError) Unwrap() error {
	return ErrValidation
}

func GetValidationDetails(err error) (string, map[string]string, bool) {
	var validationErr *ValidationError
	if !errors.As(err, &validationErr) {
		return "", nil, false
	}
	copied := make(map[string]string, len(validationErr.FieldErrors))
	for key, value := range validationErr.FieldErrors {
		copied[key] = value
	}
	return strings.TrimSpace(validationErr.Message), copied, true
}
