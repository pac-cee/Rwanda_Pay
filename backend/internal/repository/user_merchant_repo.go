package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type userMerchantRepo struct {
	db *pgxpool.Pool
}

func NewUserMerchantRepository(db *pgxpool.Pool) UserMerchantRepository {
	return &userMerchantRepo{db: db}
}

func (r *userMerchantRepo) Upsert(ctx context.Context, um *domain.UserMerchant) error {
	query := `
		INSERT INTO user_merchants (id, user_id, merchant_id, is_favourite, status)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (user_id, merchant_id) DO UPDATE
		SET is_favourite = EXCLUDED.is_favourite, updated_at = NOW()`
	_, err := r.db.Exec(ctx, query, um.ID, um.UserID, um.MerchantID, um.IsFavourite, "active")
	return err
}

func (r *userMerchantRepo) GetByUserAndMerchant(ctx context.Context, userID, merchantID string) (*domain.UserMerchant, error) {
	um := &domain.UserMerchant{}
	err := r.db.QueryRow(ctx, `
		SELECT id, user_id, merchant_id, is_favourite, total_spent, visit_count, last_visited_at, created_at
		FROM user_merchants WHERE user_id = $1 AND merchant_id = $2`,
		userID, merchantID,
	).Scan(&um.ID, &um.UserID, &um.MerchantID, &um.IsFavourite,
		&um.TotalSpent, &um.VisitCount, &um.LastVisitedAt, &um.CreatedAt)
	if err != nil {
		return nil, err
	}
	return um, nil
}

func (r *userMerchantRepo) ListFavourites(ctx context.Context, userID string) ([]*domain.UserMerchant, error) {
	rows, err := r.db.Query(ctx, `
		SELECT um.id, um.user_id, um.merchant_id, um.is_favourite,
		       um.total_spent, um.visit_count, um.last_visited_at, um.created_at,
		       m.id, m.name, m.category
		FROM user_merchants um
		JOIN merchants m ON um.merchant_id = m.id
		WHERE um.user_id = $1 AND um.is_favourite = TRUE`, userID)
	if err != nil {
		return nil, fmt.Errorf("list favourites: %w", err)
	}
	defer rows.Close()

	var result []*domain.UserMerchant
	for rows.Next() {
		um := &domain.UserMerchant{Merchant: &domain.Merchant{}}
		if err := rows.Scan(
			&um.ID, &um.UserID, &um.MerchantID, &um.IsFavourite,
			&um.TotalSpent, &um.VisitCount, &um.LastVisitedAt, &um.CreatedAt,
			&um.Merchant.ID, &um.Merchant.Name, &um.Merchant.Category,
		); err != nil {
			return nil, err
		}
		result = append(result, um)
	}
	return result, nil
}

func (r *userMerchantRepo) IncrementVisit(ctx context.Context, userID, merchantID string, amount int64) error {
	now := time.Now()
	_, err := r.db.Exec(ctx, `
		INSERT INTO user_merchants (id, user_id, merchant_id, total_spent, visit_count, last_visited_at)
		VALUES ($1, $2, $3, $4, 1, $5)
		ON CONFLICT (user_id, merchant_id) DO UPDATE
		SET total_spent = user_merchants.total_spent + $4,
		    visit_count = user_merchants.visit_count + 1,
		    last_visited_at = $5,
		    updated_at = NOW()`,
		uuid.NewString(), userID, merchantID, amount, now,
	)
	return err
}
