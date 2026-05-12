package repository

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type NotificationRepository interface {
	Create(ctx context.Context, notif *domain.Notification) error
	ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*domain.Notification, int, error)
	MarkAsRead(ctx context.Context, notifID, userID string) error
	MarkAllAsRead(ctx context.Context, userID string) error
	GetUnreadCount(ctx context.Context, userID string) (int, error)
	Delete(ctx context.Context, notifID, userID string) error
}

type notificationRepo struct {
	db *pgxpool.Pool
}

func NewNotificationRepository(db *pgxpool.Pool) NotificationRepository {
	return &notificationRepo{db: db}
}

func (r *notificationRepo) Create(ctx context.Context, notif *domain.Notification) error {
	query := `
		INSERT INTO notifications (id, user_id, type, title, message, transaction_id, is_read, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err := r.db.Exec(ctx, query,
		notif.ID, notif.UserID, notif.Type, notif.Title, notif.Message, notif.TransactionID, notif.IsRead,
	)
	return err
}

func (r *notificationRepo) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*domain.Notification, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 20
	}

	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM notifications WHERE user_id = $1`
	if err := r.db.QueryRow(ctx, countQuery, userID).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get notifications
	query := `
		SELECT id, user_id, type, title, message, transaction_id, is_read, created_at
		FROM notifications
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.db.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	notifs := make([]*domain.Notification, 0)
	for rows.Next() {
		n := &domain.Notification{}
		if err := rows.Scan(&n.ID, &n.UserID, &n.Type, &n.Title, &n.Message, &n.TransactionID, &n.IsRead, &n.CreatedAt); err != nil {
			return nil, 0, err
		}
		notifs = append(notifs, n)
	}

	return notifs, total, rows.Err()
}

func (r *notificationRepo) MarkAsRead(ctx context.Context, notifID, userID string) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, notifID, userID)
	return err
}

func (r *notificationRepo) MarkAllAsRead(ctx context.Context, userID string) error {
	query := `UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`
	_, err := r.db.Exec(ctx, query, userID)
	return err
}

func (r *notificationRepo) GetUnreadCount(ctx context.Context, userID string) (int, error) {
	var count int
	query := `SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = FALSE`
	err := r.db.QueryRow(ctx, query, userID).Scan(&count)
	if errors.Is(err, pgx.ErrNoRows) {
		return 0, nil
	}
	return count, err
}

func (r *notificationRepo) Delete(ctx context.Context, notifID, userID string) error {
	query := `DELETE FROM notifications WHERE id = $1 AND user_id = $2`
	_, err := r.db.Exec(ctx, query, notifID, userID)
	return err
}
