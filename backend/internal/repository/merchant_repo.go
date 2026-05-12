package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

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

func (r *merchantRepo) ListAll(ctx context.Context) ([]*domain.Merchant, error) {
	query := fmt.Sprintf(`SELECT %s FROM merchants ORDER BY name`, merchantCols)
	rows, err := r.db.Query(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var merchants []*domain.Merchant
	for rows.Next() {
		m := &domain.Merchant{}
		if err := rows.Scan(&m.ID, &m.Name, &m.Email, &m.Phone, &m.Category, &m.Description, &m.Address, &m.City, &m.LogoURL, &m.Website, &m.MerchantCode, &m.IsVerified, &m.CreatedAt, &m.UpdatedAt); err != nil {
			return nil, err
		}
		merchants = append(merchants, m)
	}
	return merchants, nil
}

func (r *merchantRepo) Create(ctx context.Context, name, email, phone, category, description, address, city string) (*domain.Merchant, error) {
	m := &domain.Merchant{
		ID:       fmt.Sprintf("mch_%d", time.Now().UnixNano()),
		Name:     name,
		Category: domain.MerchantCategory(category),
	}
	if email != "" {
		m.Email = &email
	}
	if phone != "" {
		m.Phone = &phone
	}
	if description != "" {
		m.Description = &description
	}
	if address != "" {
		m.Address = &address
	}
	if city != "" {
		m.City = &city
	}
	code := fmt.Sprintf("M%d", time.Now().Unix()%1000000)
	m.MerchantCode = &code

	err := r.db.QueryRow(ctx, `
		INSERT INTO merchants (id, name, email, phone, category, description, address, city, merchant_code)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING created_at, updated_at`, m.ID, m.Name, m.Email, m.Phone, m.Category, m.Description, m.Address, m.City, m.MerchantCode).Scan(&m.CreatedAt, &m.UpdatedAt)
	return m, err
}

func (r *merchantRepo) Update(ctx context.Context, id string, name, email, phone, description string) error {
	_, err := r.db.Exec(ctx, `
		UPDATE merchants SET name = $1, email = $2, phone = $3, description = $4, updated_at = NOW()
		WHERE id = $5`, name, email, phone, description, id)
	return err
}

func (r *merchantRepo) Delete(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE merchants SET status = 'inactive' WHERE id = $1`, id)
	return err
}
