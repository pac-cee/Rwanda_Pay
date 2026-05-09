package unit

import (
	"context"
	"testing"

	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/tests/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newWalletService(
	walletRepo *mocks.MockWalletTxRepository,
	cardRepo *mocks.MockCardRepository,
	userRepo *mocks.MockUserRepository,
	merchantRepo *mocks.MockMerchantRepository,
	userMerchantRepo *mocks.MockUserMerchantRepository,
	txRepo *mocks.MockTransactionRepository,
) *service.WalletService {
	return service.NewWalletService(walletRepo, cardRepo, userRepo, merchantRepo, userMerchantRepo, txRepo)
}

// ─── Topup ────────────────────────────────────────────────────────────────────

func TestWalletService_Topup_Success(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	cardRepo := &mocks.MockCardRepository{}
	userRepo := &mocks.MockUserRepository{}
	merchantRepo := &mocks.MockMerchantRepository{}
	userMerchantRepo := &mocks.MockUserMerchantRepository{}
	txRepo := &mocks.MockTransactionRepository{}
	svc := newWalletService(walletRepo, cardRepo, userRepo, merchantRepo, userMerchantRepo, txRepo)

	card := &domain.Card{
		ID:     "card-1",
		UserID: "user-1",
		Last4:  "4242",
		Label:  "Bank of Kigali",
		Status: domain.CardStatusActive,
	}
	wallet := &domain.Wallet{
		ID:       "wallet-1",
		UserID:   "user-1",
		Balance:  10000,
		IsFrozen: false,
	}

	cardRepo.On("GetByIDAndUserID", context.Background(), "card-1", "user-1").Return(card, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(wallet, nil)
	walletRepo.On("TopupTx", context.Background(), "wallet-1", "card-1", int64(5000)).
		Return(int64(15000), int64(5000), nil)
	txRepo.On("Create", context.Background(), mock.MatchedBy(func(tx *domain.Transaction) bool {
		return tx.Type == domain.TxTypeTopup && tx.Amount == 5000 && tx.UserID == "user-1"
	})).Return(nil)

	result, err := svc.Topup(context.Background(), service.TopupInput{
		UserID: "user-1",
		CardID: "card-1",
		Amount: 5000,
	})

	require.NoError(t, err)
	assert.Equal(t, int64(15000), result.Balance)
	assert.Equal(t, domain.TxTypeTopup, result.Transaction.Type)
	assert.Equal(t, int64(5000), result.Transaction.Amount)

	walletRepo.AssertExpectations(t)
	cardRepo.AssertExpectations(t)
	txRepo.AssertExpectations(t)
}

func TestWalletService_Topup_AmountBelowMinimum_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	cardRepo := &mocks.MockCardRepository{}
	svc := newWalletService(walletRepo, cardRepo, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	_, err := svc.Topup(context.Background(), service.TopupInput{
		UserID: "user-1", CardID: "card-1", Amount: 499,
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestWalletService_Topup_AmountAboveMaximum_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	cardRepo := &mocks.MockCardRepository{}
	svc := newWalletService(walletRepo, cardRepo, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	_, err := svc.Topup(context.Background(), service.TopupInput{
		UserID: "user-1", CardID: "card-1", Amount: 5_000_001,
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestWalletService_Topup_CardNotFound_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	cardRepo := &mocks.MockCardRepository{}
	svc := newWalletService(walletRepo, cardRepo, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	cardRepo.On("GetByIDAndUserID", context.Background(), "bad-card", "user-1").
		Return(nil, domain.ErrCardNotFound)

	_, err := svc.Topup(context.Background(), service.TopupInput{
		UserID: "user-1", CardID: "bad-card", Amount: 1000,
	})

	assert.ErrorIs(t, err, domain.ErrCardNotFound)
}

func TestWalletService_Topup_InsufficientCardFunds_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	cardRepo := &mocks.MockCardRepository{}
	svc := newWalletService(walletRepo, cardRepo, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	card := &domain.Card{ID: "card-1", UserID: "user-1", Status: domain.CardStatusActive}
	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 0}

	cardRepo.On("GetByIDAndUserID", context.Background(), "card-1", "user-1").Return(card, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(wallet, nil)
	walletRepo.On("TopupTx", context.Background(), "wallet-1", "card-1", int64(5000)).
		Return(int64(0), int64(0), domain.ErrInsufficientCardFunds)

	_, err := svc.Topup(context.Background(), service.TopupInput{
		UserID: "user-1", CardID: "card-1", Amount: 5000,
	})

	assert.ErrorIs(t, err, domain.ErrInsufficientCardFunds)
}

// ─── Transfer ─────────────────────────────────────────────────────────────────

func TestWalletService_Transfer_Success(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	cardRepo := &mocks.MockCardRepository{}
	userRepo := &mocks.MockUserRepository{}
	txRepo := &mocks.MockTransactionRepository{}
	svc := newWalletService(walletRepo, cardRepo, userRepo,
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, txRepo)

	recipient := &domain.User{ID: "user-2", Email: "bob@example.com", Name: "Bob"}
	senderWallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 50000}
	recipientWallet := &domain.Wallet{ID: "wallet-2", UserID: "user-2", Balance: 10000}

	userRepo.On("GetByEmail", context.Background(), "bob@example.com").Return(recipient, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(senderWallet, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-2").Return(recipientWallet, nil)
	walletRepo.On("TransferTx", context.Background(), "wallet-1", "wallet-2", int64(5000)).
		Return(int64(45000), int64(15000), nil)
	txRepo.On("Create", context.Background(), mock.MatchedBy(func(tx *domain.Transaction) bool {
		return tx.Type == domain.TxTypeSend && tx.UserID == "user-1"
	})).Return(nil)
	txRepo.On("Create", context.Background(), mock.MatchedBy(func(tx *domain.Transaction) bool {
		return tx.Type == domain.TxTypeReceive && tx.UserID == "user-2"
	})).Return(nil)

	result, err := svc.Transfer(context.Background(), service.TransferInput{
		SenderID:       "user-1",
		SenderEmail:    "alice@example.com",
		RecipientEmail: "bob@example.com",
		Amount:         5000,
		Description:    "Lunch split",
	})

	require.NoError(t, err)
	assert.Equal(t, int64(45000), result.Balance)
	assert.Equal(t, domain.TxTypeSend, result.Transaction.Type)

	walletRepo.AssertExpectations(t)
	txRepo.AssertExpectations(t)
}

func TestWalletService_Transfer_SelfTransfer_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	_, err := svc.Transfer(context.Background(), service.TransferInput{
		SenderID:       "user-1",
		SenderEmail:    "alice@example.com",
		RecipientEmail: "alice@example.com",
		Amount:         1000,
		Description:    "test",
	})

	assert.ErrorIs(t, err, domain.ErrSelfTransfer)
}

func TestWalletService_Transfer_AmountBelowMinimum_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	_, err := svc.Transfer(context.Background(), service.TransferInput{
		SenderID:       "user-1",
		SenderEmail:    "alice@example.com",
		RecipientEmail: "bob@example.com",
		Amount:         99,
		Description:    "test",
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestWalletService_Transfer_RecipientNotFound_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, userRepo,
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	userRepo.On("GetByEmail", context.Background(), "nobody@example.com").
		Return(nil, domain.ErrNotFound)

	_, err := svc.Transfer(context.Background(), service.TransferInput{
		SenderID:       "user-1",
		SenderEmail:    "alice@example.com",
		RecipientEmail: "nobody@example.com",
		Amount:         1000,
		Description:    "test",
	})

	assert.ErrorIs(t, err, domain.ErrRecipientNotFound)
}

func TestWalletService_Transfer_InsufficientFunds_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	userRepo := &mocks.MockUserRepository{}
	txRepo := &mocks.MockTransactionRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, userRepo,
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, txRepo)

	recipient := &domain.User{ID: "user-2", Email: "bob@example.com", Name: "Bob"}
	senderWallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 100}
	recipientWallet := &domain.Wallet{ID: "wallet-2", UserID: "user-2", Balance: 0}

	userRepo.On("GetByEmail", context.Background(), "bob@example.com").Return(recipient, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(senderWallet, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-2").Return(recipientWallet, nil)
	walletRepo.On("TransferTx", context.Background(), "wallet-1", "wallet-2", int64(5000)).
		Return(int64(0), int64(0), domain.ErrInsufficientFunds)

	_, err := svc.Transfer(context.Background(), service.TransferInput{
		SenderID:       "user-1",
		SenderEmail:    "alice@example.com",
		RecipientEmail: "bob@example.com",
		Amount:         5000,
		Description:    "test",
	})

	assert.ErrorIs(t, err, domain.ErrInsufficientFunds)
}

// ─── Pay ──────────────────────────────────────────────────────────────────────

func TestWalletService_Pay_Success(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	txRepo := &mocks.MockTransactionRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, txRepo)

	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 20000}

	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(wallet, nil)
	walletRepo.On("PayTx", context.Background(), "wallet-1", int64(2000)).
		Return(int64(18000), nil)
	txRepo.On("Create", context.Background(), mock.MatchedBy(func(tx *domain.Transaction) bool {
		return tx.Type == domain.TxTypePayment && tx.Amount == 2000 && tx.UserID == "user-1"
	})).Return(nil)

	result, err := svc.Pay(context.Background(), service.PayInput{
		UserID:      "user-1",
		Amount:      2000,
		Description: "Simba Supermarket",
		Category:    domain.TxCategoryFood,
	})

	require.NoError(t, err)
	assert.Equal(t, int64(18000), result.Balance)
	assert.Equal(t, domain.TxTypePayment, result.Transaction.Type)
	assert.Equal(t, domain.TxCategoryFood, result.Transaction.Category)

	walletRepo.AssertExpectations(t)
	txRepo.AssertExpectations(t)
}

func TestWalletService_Pay_ZeroAmount_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	_, err := svc.Pay(context.Background(), service.PayInput{
		UserID: "user-1", Amount: 0, Description: "test",
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestWalletService_Pay_InsufficientFunds_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 500}

	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(wallet, nil)
	walletRepo.On("PayTx", context.Background(), "wallet-1", int64(5000)).
		Return(int64(0), domain.ErrInsufficientFunds)

	_, err := svc.Pay(context.Background(), service.PayInput{
		UserID: "user-1", Amount: 5000, Description: "test",
	})

	assert.ErrorIs(t, err, domain.ErrInsufficientFunds)
}

func TestWalletService_Pay_FrozenWallet_ReturnsError(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 50000, IsFrozen: true}

	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(wallet, nil)
	walletRepo.On("PayTx", context.Background(), "wallet-1", int64(1000)).
		Return(int64(0), domain.ErrWalletFrozen)

	_, err := svc.Pay(context.Background(), service.PayInput{
		UserID: "user-1", Amount: 1000, Description: "test",
	})

	assert.ErrorIs(t, err, domain.ErrWalletFrozen)
}

// ─── GetBalance ───────────────────────────────────────────────────────────────

func TestWalletService_GetBalance_Success(t *testing.T) {
	walletRepo := &mocks.MockWalletTxRepository{}
	svc := newWalletService(walletRepo, &mocks.MockCardRepository{}, &mocks.MockUserRepository{},
		&mocks.MockMerchantRepository{}, &mocks.MockUserMerchantRepository{}, &mocks.MockTransactionRepository{})

	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 75000, Currency: "RWF"}
	walletRepo.On("GetByUserID", context.Background(), "user-1").Return(wallet, nil)

	result, err := svc.GetBalance(context.Background(), "user-1")

	require.NoError(t, err)
	assert.Equal(t, int64(75000), result.Balance)
	assert.Equal(t, "RWF", result.Currency)
}
