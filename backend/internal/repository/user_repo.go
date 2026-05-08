package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type userRepo struct {
	db *pgxpool.Pool
}

func NewUserRepository(db *pgxpool.Pool) UserRepository {
	return &userRepo{db: db}
}

func (r *userRepo) Create(ctx context.Context, u *domain.User) error {
	query := `
		INSERT INTO users (id, email, password_hash, name, phone, initials, is_verified, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING created_at, updated_at`

	err := r.db.QueryRow(ctx, query,
		u.ID, u.Email, u.PasswordHash, u.Name, u.Phone,
		u.Initials, u.IsVerified, u.IsActive,
	).Scan(&u.CreatedAt, &u.UpdatedAt)

	if err != nil {
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

func (r *userRepo) GetByID(ctx context.Context, id string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, name, phone, initials,
		       is_verified, is_active, created_at, updated_at
		FROM users WHERE id = $1 AND is_active = TRUE`

	u := &domain.User{}
	err := r.db.QueryRow(ctx, query, id).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Phone,
		&u.Initials, &u.IsVerified, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return u, nil
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	query := `
		SELECT id, email, password_hash, name, phone, initials,
		       is_verified, is_active, created_at, updated_at
		FROM users WHERE email = $1`

	u := &domain.User{}
	err := r.db.QueryRow(ctx, query, email).Scan(
		&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.Phone,
		&u.Initials, &u.IsVerified, &u.IsActive, &u.CreatedAt, &u.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return u, nil
}

func (r *userRepo) Update(ctx context.Context, u *domain.User) error {
	query := `
		UPDATE users SET name = $1, phone = $2, initials = $3, updated_at = NOW()
		WHERE id = $4
		RETURNING updated_at`

	err := r.db.QueryRow(ctx, query, u.Name, u.Phone, u.Initials, u.ID).
		Scan(&u.UpdatedAt)
	if err != nil {
		return fmt.Errorf("update user: %w", err)
	}
	return nil
}
