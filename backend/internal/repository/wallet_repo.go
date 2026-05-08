package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type walletRepo struct {
	db *pgxpool.Pool
}

func NewWalletRepository(db *pgxpool.Pool) WalletRepository {
	return &walletRepo{db: db}
}

func (r *walletRepo) Create(ctx context.Context, w *domain.Wallet) error {
	query := `
		INSERT INTO wallets (id, user_id, balance, currency)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at, updated_at`

	err := r.db.QueryRow(ctx, query, w.ID, w.UserID, w.Balance, w.Currency).
		Scan(&w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create wallet: %w", err)
	}
	return nil
}

func (r *walletRepo) GetByUserID(ctx context.Context, userID string) (*domain.Wallet, error) {
	query := `
		SELECT id, user_id, balance, currency, is_frozen, created_at, updated_at
		FROM wallets WHERE user_id = $1`

	w := &domain.Wallet{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&w.ID, &w.UserID, &w.Balance, &w.Currency,
		&w.IsFrozen, &w.CreatedAt, &w.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}
	return w, nil
}

func (r *walletRepo) UpdateBalance(ctx context.Context, walletID string, newBalance int64) error {
	query := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(ctx, query, newBalance, walletID)
	if err != nil {
		return fmt.Errorf("update wallet balance: %w", err)
	}
	return nil
}
