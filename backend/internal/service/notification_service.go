package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
)

type NotificationService struct {
	repo repository.NotificationRepository
}

func NewNotificationService(repo repository.NotificationRepository) *NotificationService {
	return &NotificationService{repo: repo}
}

func (s *NotificationService) Create(ctx context.Context, userID string, notifType domain.NotificationType, title, message string, transactionID *string) error {
	notif := &domain.Notification{
		ID:            uuid.NewString(),
		UserID:        userID,
		Type:          notifType,
		Title:         title,
		Message:       message,
		TransactionID: transactionID,
		IsRead:        false,
	}
	return s.repo.Create(ctx, notif)
}

func (s *NotificationService) List(ctx context.Context, userID string, limit, offset int) ([]*domain.Notification, int, error) {
	return s.repo.ListByUserID(ctx, userID, limit, offset)
}

func (s *NotificationService) MarkAsRead(ctx context.Context, notifID, userID string) error {
	return s.repo.MarkAsRead(ctx, notifID, userID)
}

func (s *NotificationService) MarkAllAsRead(ctx context.Context, userID string) error {
	return s.repo.MarkAllAsRead(ctx, userID)
}

func (s *NotificationService) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	return s.repo.GetUnreadCount(ctx, userID)
}

func (s *NotificationService) Delete(ctx context.Context, notifID, userID string) error {
	return s.repo.Delete(ctx, notifID, userID)
}

// Helper methods to create specific notification types
func (s *NotificationService) NotifyPaymentReceived(ctx context.Context, userID, senderName string, amount int64, txID string) error {
	title := "Money Received"
	message := fmt.Sprintf("You received %s RWF from %s", formatAmount(amount), senderName)
	return s.Create(ctx, userID, domain.NotifTypePaymentReceived, title, message, &txID)
}

func (s *NotificationService) NotifyPaymentSent(ctx context.Context, userID, recipientName string, amount int64, txID string) error {
	title := "Payment Sent"
	message := fmt.Sprintf("You sent %s RWF to %s", formatAmount(amount), recipientName)
	return s.Create(ctx, userID, domain.NotifTypePaymentSent, title, message, &txID)
}

func (s *NotificationService) NotifyTopupSuccess(ctx context.Context, userID string, amount int64, txID string) error {
	title := "Wallet Topped Up"
	message := fmt.Sprintf("Your wallet was topped up with %s RWF", formatAmount(amount))
	return s.Create(ctx, userID, domain.NotifTypeTopupSuccess, title, message, &txID)
}

func (s *NotificationService) NotifyCardAdded(ctx context.Context, userID, cardLabel string) error {
	title := "Card Added"
	message := fmt.Sprintf("Your %s card was successfully added", cardLabel)
	return s.Create(ctx, userID, domain.NotifTypeCardAdded, title, message, nil)
}

func (s *NotificationService) NotifyPaymentSuccess(ctx context.Context, userID, merchant string, amount int64, txID string) error {
	title := "Payment Successful"
	message := fmt.Sprintf("You paid %s RWF to %s", formatAmount(amount), merchant)
	return s.Create(ctx, userID, domain.NotifTypePaymentSuccess, title, message, &txID)
}

func formatAmount(amount int64) string {
	// Simple formatting: 1000 -> "1,000"
	s := fmt.Sprintf("%d", amount)
	n := len(s)
	if n <= 3 {
		return s
	}
	result := ""
	for i, c := range s {
		if i > 0 && (n-i)%3 == 0 {
			result += ","
		}
		result += string(c)
	}
	return result
}
