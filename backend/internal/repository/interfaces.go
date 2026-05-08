package repository

import (
	"context"

	"github.com/rwandapay/backend/internal/domain"
)

type UserRepository interface {
	Create(ctx context.Context, user *domain.User) error
	GetByID(ctx context.Context, id string) (*domain.User, error)
	GetByEmail(ctx context.Context, email string) (*domain.User, error)
	Update(ctx context.Context, user *domain.User) error
}

type WalletRepository interface {
	Create(ctx context.Context, wallet *domain.Wallet) error
	GetByUserID(ctx context.Context, userID string) (*domain.Wallet, error)
	UpdateBalance(ctx context.Context, walletID string, newBalance int64) error
}

type CardRepository interface {
	Create(ctx context.Context, card *domain.Card) error
	ListByUserID(ctx context.Context, userID string) ([]*domain.Card, error)
	GetByID(ctx context.Context, id string) (*domain.Card, error)
	GetByIDAndUserID(ctx context.Context, id, userID string) (*domain.Card, error)
	UpdateBalance(ctx context.Context, cardID string, newBalance int64) error
	Delete(ctx context.Context, id, userID string) error
	UnsetAllDefaults(ctx context.Context, userID string) error
	SetDefault(ctx context.Context, id string) error
	CountByUserID(ctx context.Context, userID string) (int, error)
}

type MerchantRepository interface {
	List(ctx context.Context, limit, offset int) ([]*domain.Merchant, error)
	GetByID(ctx context.Context, id string) (*domain.Merchant, error)
	GetByCode(ctx context.Context, code string) (*domain.Merchant, error)
	Search(ctx context.Context, query string, limit int) ([]*domain.Merchant, error)
}

type UserMerchantRepository interface {
	Upsert(ctx context.Context, um *domain.UserMerchant) error
	GetByUserAndMerchant(ctx context.Context, userID, merchantID string) (*domain.UserMerchant, error)
	ListFavourites(ctx context.Context, userID string) ([]*domain.UserMerchant, error)
	IncrementVisit(ctx context.Context, userID, merchantID string, amount int64) error
}

type TransactionRepository interface {
	Create(ctx context.Context, tx *domain.Transaction) error
	ListByUserID(ctx context.Context, userID string, limit, offset int, txType string) ([]*domain.Transaction, error)
	CountByUserID(ctx context.Context, userID string, txType string) (int, error)
	GetAnalytics(ctx context.Context, userID string, days int) (*Analytics, error)
}

// Analytics result from the DB
type Analytics struct {
	TotalIn    int64
	TotalOut   int64
	ByCategory map[string]int64
	Monthly    []MonthlyData
}

type MonthlyData struct {
	Month string
	In    int64
	Out   int64
}
