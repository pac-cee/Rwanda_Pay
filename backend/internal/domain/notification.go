package domain

import "time"

type NotificationType string

const (
	NotifTypePaymentReceived NotificationType = "payment_received"
	NotifTypePaymentSent     NotificationType = "payment_sent"
	NotifTypeTopupSuccess    NotificationType = "topup_success"
	NotifTypeCardAdded       NotificationType = "card_added"
	NotifTypePaymentSuccess  NotificationType = "payment_success"
	NotifTypePaymentFailed   NotificationType = "payment_failed"
	NotifTypeSystem          NotificationType = "system"
)

type Notification struct {
	ID            string           `json:"id"`
	UserID        string           `json:"user_id"`
	Type          NotificationType `json:"type"`
	Title         string           `json:"title"`
	Message       string           `json:"message"`
	TransactionID *string          `json:"transaction_id,omitempty"`
	IsRead        bool             `json:"is_read"`
	CreatedAt     time.Time        `json:"created_at"`
}
