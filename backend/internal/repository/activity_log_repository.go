package repository

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type ActivityLogRepository interface {
	Create(ctx context.Context, log *domain.ActivityLog) error
	List(ctx context.Context, limit, offset int) ([]*domain.ActivityLog, int, error)
}

type activityLogRepo struct {
	db *pgxpool.Pool
}

func NewActivityLogRepository(db *pgxpool.Pool) ActivityLogRepository {
	return &activityLogRepo{db: db}
}

func (r *activityLogRepo) Create(ctx context.Context, log *domain.ActivityLog) error {
	query := `
		INSERT INTO activity_logs (id, user_id, action, ip_address, user_agent, duration_ms, status_code, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err := r.db.Exec(ctx, query,
		log.ID, log.UserID, log.Action, log.IPAddress, log.UserAgent, log.DurationMs, log.StatusCode,
	)
	return err
}

func (r *activityLogRepo) List(ctx context.Context, limit, offset int) ([]*domain.ActivityLog, int, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}

	// Get total count
	var total int
	countQuery := `SELECT COUNT(*) FROM activity_logs`
	if err := r.db.QueryRow(ctx, countQuery).Scan(&total); err != nil {
		return nil, 0, err
	}

	// Get logs
	query := `
		SELECT id, user_id, action, ip_address, user_agent, duration_ms, status_code, created_at
		FROM activity_logs
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	logs := make([]*domain.ActivityLog, 0)
	for rows.Next() {
		log := &domain.ActivityLog{}
		if err := rows.Scan(&log.ID, &log.UserID, &log.Action, &log.IPAddress, &log.UserAgent, &log.DurationMs, &log.StatusCode, &log.CreatedAt); err != nil {
			return nil, 0, err
		}
		logs = append(logs, log)
	}

	return logs, total, rows.Err()
}
