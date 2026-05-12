package domain

import "time"

type ActivityLog struct {
	ID          string    `json:"id"`
	UserID      *string   `json:"user_id"`
	Action      string    `json:"action"`
	IPAddress   string    `json:"ip_address"`
	UserAgent   string    `json:"user_agent"`
	DurationMs  int       `json:"duration_ms"`
	StatusCode  int       `json:"status_code"`
	CreatedAt   time.Time `json:"created_at"`
}
