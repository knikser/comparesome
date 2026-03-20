package service

import "testing"

func TestNormalizeUsername(t *testing.T) {
	got := normalizeUsername("  Alice ")
	if got != "alice" {
		t.Fatalf("expected alice, got %q", got)
	}
}

func TestRound2(t *testing.T) {
	got := round2(7.666)
	if got != 7.67 {
		t.Fatalf("expected 7.67, got %v", got)
	}
}
