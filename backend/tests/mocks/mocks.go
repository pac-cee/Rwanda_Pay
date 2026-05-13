package mocks

import (
	"context"

	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
	"github.com/stretchr/testify/mock"
)

// ─── UserRepository Mock ──────────────────────────────────────────────────────

type MockUserRepository struct {
	mock.Mock
}

func (m *MockUserRepository) Create(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) GetByID(ctx context.Context, id string) (*domain.User, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	args := m.Called(ctx, email)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.User), args.Error(1)
}

func (m *MockUserRepository) Update(ctx context.Context, user *domain.User) error {
	args := m.Called(ctx, user)
	return args.Error(0)
}

func (m *MockUserRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockUserRepository) Count(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

func (m *MockUserRepository) CountActiveToday(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

func (m *MockUserRepository) ListAll(ctx context.Context, limit, offset int) ([]*domain.User, int, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.User), args.Int(1), args.Error(2)
}

// ─── WalletRepository Mock (basic) ───────────────────────────────────────────

type MockWalletRepository struct {
	mock.Mock
}

func (m *MockWalletRepository) Create(ctx context.Context, wallet *domain.Wallet) error {
	args := m.Called(ctx, wallet)
	return args.Error(0)
}

func (m *MockWalletRepository) GetByUserID(ctx context.Context, userID string) (*domain.Wallet, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Wallet), args.Error(1)
}

func (m *MockWalletRepository) UpdateBalance(ctx context.Context, walletID string, newBalance int64) error {
	args := m.Called(ctx, walletID, newBalance)
	return args.Error(0)
}

// ─── WalletTxRepository Mock (with atomic transaction methods) ────────────────

type MockWalletTxRepository struct {
	MockWalletRepository
}

func (m *MockWalletTxRepository) TransferTx(ctx context.Context, senderWalletID, recipientWalletID string, amount int64) (int64, int64, error) {
	args := m.Called(ctx, senderWalletID, recipientWalletID, amount)
	return args.Get(0).(int64), args.Get(1).(int64), args.Error(2)
}

func (m *MockWalletTxRepository) TopupTx(ctx context.Context, walletID, cardID string, amount int64) (int64, int64, error) {
	args := m.Called(ctx, walletID, cardID, amount)
	return args.Get(0).(int64), args.Get(1).(int64), args.Error(2)
}

func (m *MockWalletTxRepository) PayTx(ctx context.Context, walletID string, amount int64) (int64, error) {
	args := m.Called(ctx, walletID, amount)
	return args.Get(0).(int64), args.Error(1)
}

// ─── CardRepository Mock ──────────────────────────────────────────────────────

type MockCardRepository struct {
	mock.Mock
}

func (m *MockCardRepository) Create(ctx context.Context, card *domain.Card) error {
	args := m.Called(ctx, card)
	return args.Error(0)
}

func (m *MockCardRepository) ListByUserID(ctx context.Context, userID string) ([]*domain.Card, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Card), args.Error(1)
}

func (m *MockCardRepository) GetByID(ctx context.Context, id string) (*domain.Card, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Card), args.Error(1)
}

func (m *MockCardRepository) GetByIDAndUserID(ctx context.Context, id, userID string) (*domain.Card, error) {
	args := m.Called(ctx, id, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Card), args.Error(1)
}

func (m *MockCardRepository) UpdateBalance(ctx context.Context, cardID string, newBalance int64) error {
	args := m.Called(ctx, cardID, newBalance)
	return args.Error(0)
}

func (m *MockCardRepository) Delete(ctx context.Context, id, userID string) error {
	args := m.Called(ctx, id, userID)
	return args.Error(0)
}

func (m *MockCardRepository) UnsetAllDefaults(ctx context.Context, userID string) error {
	args := m.Called(ctx, userID)
	return args.Error(0)
}

func (m *MockCardRepository) SetDefault(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

func (m *MockCardRepository) CountByUserID(ctx context.Context, userID string) (int, error) {
	args := m.Called(ctx, userID)
	return args.Int(0), args.Error(1)
}

// ─── MerchantRepository Mock ──────────────────────────────────────────────────

type MockMerchantRepository struct {
	mock.Mock
}

func (m *MockMerchantRepository) List(ctx context.Context, limit, offset int) ([]*domain.Merchant, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) GetByID(ctx context.Context, id string) (*domain.Merchant, error) {
	args := m.Called(ctx, id)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) GetByCode(ctx context.Context, code string) (*domain.Merchant, error) {
	args := m.Called(ctx, code)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) Search(ctx context.Context, query string, limit int) ([]*domain.Merchant, error) {
	args := m.Called(ctx, query, limit)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) ListAll(ctx context.Context) ([]*domain.Merchant, error) {
	args := m.Called(ctx)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) Create(ctx context.Context, name, email, phone, category, description, address, city string) (*domain.Merchant, error) {
	args := m.Called(ctx, name, email, phone, category, description, address, city)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.Merchant), args.Error(1)
}

func (m *MockMerchantRepository) Update(ctx context.Context, id, name, email, phone, description string) error {
	args := m.Called(ctx, id, name, email, phone, description)
	return args.Error(0)
}

func (m *MockMerchantRepository) Delete(ctx context.Context, id string) error {
	args := m.Called(ctx, id)
	return args.Error(0)
}

// ─── UserMerchantRepository Mock ──────────────────────────────────────────────

type MockUserMerchantRepository struct {
	mock.Mock
}

func (m *MockUserMerchantRepository) Upsert(ctx context.Context, um *domain.UserMerchant) error {
	args := m.Called(ctx, um)
	return args.Error(0)
}

func (m *MockUserMerchantRepository) GetByUserAndMerchant(ctx context.Context, userID, merchantID string) (*domain.UserMerchant, error) {
	args := m.Called(ctx, userID, merchantID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*domain.UserMerchant), args.Error(1)
}

func (m *MockUserMerchantRepository) ListFavourites(ctx context.Context, userID string) ([]*domain.UserMerchant, error) {
	args := m.Called(ctx, userID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.UserMerchant), args.Error(1)
}

func (m *MockUserMerchantRepository) IncrementVisit(ctx context.Context, userID, merchantID string, amount int64) error {
	args := m.Called(ctx, userID, merchantID, amount)
	return args.Error(0)
}

// ─── TransactionRepository Mock ───────────────────────────────────────────────

type MockTransactionRepository struct {
	mock.Mock
}

func (m *MockTransactionRepository) Create(ctx context.Context, tx *domain.Transaction) error {
	args := m.Called(ctx, tx)
	return args.Error(0)
}

func (m *MockTransactionRepository) ListByUserID(ctx context.Context, userID string, limit, offset int, txType string) ([]*domain.Transaction, error) {
	args := m.Called(ctx, userID, limit, offset, txType)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).([]*domain.Transaction), args.Error(1)
}

func (m *MockTransactionRepository) CountByUserID(ctx context.Context, userID string, txType string) (int, error) {
	args := m.Called(ctx, userID, txType)
	return args.Int(0), args.Error(1)
}

func (m *MockTransactionRepository) GetAnalytics(ctx context.Context, userID string, days int) (*repository.Analytics, error) {
	args := m.Called(ctx, userID, days)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Analytics), args.Error(1)
}

func (m *MockTransactionRepository) GetLedger(ctx context.Context, userID, contactID string) (*repository.Ledger, error) {
	args := m.Called(ctx, userID, contactID)
	if args.Get(0) == nil {
		return nil, args.Error(1)
	}
	return args.Get(0).(*repository.Ledger), args.Error(1)
}

func (m *MockTransactionRepository) Count(ctx context.Context) (int, error) {
	args := m.Called(ctx)
	return args.Int(0), args.Error(1)
}

func (m *MockTransactionRepository) GetTotalVolume(ctx context.Context) (int64, error) {
	args := m.Called(ctx)
	return args.Get(0).(int64), args.Error(1)
}

func (m *MockTransactionRepository) ListAll(ctx context.Context, limit, offset int) ([]*domain.Transaction, int, error) {
	args := m.Called(ctx, limit, offset)
	if args.Get(0) == nil {
		return nil, 0, args.Error(2)
	}
	return args.Get(0).([]*domain.Transaction), args.Int(1), args.Error(2)
}
