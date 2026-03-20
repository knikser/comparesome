package service

import "errors"

var (
	ErrUnauthorized  = errors.New("unauthorized")
	ErrForbidden     = errors.New("forbidden")
	ErrNotFound      = errors.New("not found")
	ErrValidation    = errors.New("validation error")
	ErrLimitExceeded = errors.New("limit exceeded")
)
