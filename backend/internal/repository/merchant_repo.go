package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type merchantRepo struct {
	db *pgxpool.Pool
}

func NewMerchantRepository(db *pgxpool.Pool) MerchantRepository {
	return &merchantRepo{db: db}
}

func scanMerchant(row pgx.Row) (*domain.Merchant, error) {
	m := &domain.Merchant{}
	err := row.Scan(
		&m.ID, &m.Name, &m.Email, &m.Phone, &m.Category,
		&m.Description, &m.Address, &m.City, &m.LogoURL,
		&m.Website, &m.MerchantCode, &m.IsVerified, &m.CreatedAt, &m.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan merchant: %w", err)
	}
	return m, nil
}

const merchantCols = `id, name, email, phone, category, description, address,
	city, logo_url, website, merchant_code, is_verified, created_at, updated_at`

func (r *merchantRepo) List(ctx context.Context, limit, offset int) ([]*domain.Merchant, error) {
	query := fmt.Sprintf(`SELECT %s FROM merchants WHERE status = 'active' ORDER BY name LIMIT $1 OFFSET $2`, merchantCols)
	rows, err := r.db.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list merchants: %w", err)
	}
	defer rows.Close()

	var merchants []*domain.Merchant
	for rows.Next() {
		m := &domain.Merchant{}
		if err := rows.Scan(
			&m.ID, &m.Name, &m.Email, &m.Phone, &m.Category,
			&m.Description, &m.Address, &m.City, &m.LogoURL,
			&m.Website, &m.MerchantCode, &m.IsVerified, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan merchant row: %w", err)
		}
		merchants = append(merchants, m)
	}
	return merchants, nil
}

func (r *merchantRepo) GetByID(ctx context.Context, id string) (*domain.Merchant, error) {
	query := fmt.Sprintf(`SELECT %s FROM merchants WHERE id = $1`, merchantCols)
	return scanMerchant(r.db.QueryRow(ctx, query, id))
}

func (r *merchantRepo) GetByCode(ctx context.Context, code string) (*domain.Merchant, error) {
	query := fmt.Sprintf(`SELECT %s FROM merchants WHERE merchant_code = $1`, merchantCols)
	return scanMerchant(r.db.QueryRow(ctx, query, code))
}

func (r *merchantRepo) Search(ctx context.Context, query string, limit int) ([]*domain.Merchant, error) {
	q := fmt.Sprintf(`SELECT %s FROM merchants WHERE status = 'active'
		AND (name ILIKE $1 OR merchant_code ILIKE $1) ORDER BY name LIMIT $2`, merchantCols)
	rows, err := r.db.Query(ctx, q, "%"+query+"%", limit)
	if err != nil {
		return nil, fmt.Errorf("search merchants: %w", err)
	}
	defer rows.Close()

	var merchants []*domain.Merchant
	for rows.Next() {
		m := &domain.Merchant{}
		if err := rows.Scan(
			&m.ID, &m.Name, &m.Email, &m.Phone, &m.Category,
			&m.Description, &m.Address, &m.City, &m.LogoURL,
			&m.Website, &m.MerchantCode, &m.IsVerified, &m.CreatedAt, &m.UpdatedAt,
		); err != nil {
			return nil, err
		}
		merchants = append(merchants, m)
	}
	return merchants, nil
}
