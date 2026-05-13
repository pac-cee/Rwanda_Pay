package unit

import (
	"context"
	"testing"

	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/tests/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTransactionService(txRepo *mocks.MockTransactionRepository, userRepo *mocks.MockUserRepository) *service.TransactionService {
	return service.NewTransactionService(txRepo, userRepo)
}

// ─── List ─────────────────────────────────────────────────────────────────────

func TestTransactionService_List_Success(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	expected := []*domain.Transaction{
		{ID: "tx-1", UserID: "user-1", Type: domain.TxTypeTopup, Amount: 5000},
		{ID: "tx-2", UserID: "user-1", Type: domain.TxTypeSend, Amount: 1000},
	}

	txRepo.On("ListByUserID", context.Background(), "user-1", 20, 0, "").Return(expected, nil)
	txRepo.On("CountByUserID", context.Background(), "user-1", "").Return(2, nil)

	txs, total, err := svc.List(context.Background(), "user-1", 20, 0, "")

	require.NoError(t, err)
	assert.Len(t, txs, 2)
	assert.Equal(t, 2, total)
	txRepo.AssertExpectations(t)
}

func TestTransactionService_List_EmptyResult(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	txRepo.On("ListByUserID", context.Background(), "user-1", 20, 0, "").Return(nil, nil)
	txRepo.On("CountByUserID", context.Background(), "user-1", "").Return(0, nil)

	txs, total, err := svc.List(context.Background(), "user-1", 20, 0, "")

	require.NoError(t, err)
	assert.NotNil(t, txs)
	assert.Len(t, txs, 0)
	assert.Equal(t, 0, total)
}

func TestTransactionService_List_DefaultLimit(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	txRepo.On("ListByUserID", context.Background(), "user-1", 20, 0, "").Return([]*domain.Transaction{}, nil)
	txRepo.On("CountByUserID", context.Background(), "user-1", "").Return(0, nil)

	_, _, err := svc.List(context.Background(), "user-1", 0, 0, "")

	require.NoError(t, err)
	txRepo.AssertExpectations(t)
}

func TestTransactionService_List_MaxLimit(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	txRepo.On("ListByUserID", context.Background(), "user-1", 100, 0, "").Return([]*domain.Transaction{}, nil)
	txRepo.On("CountByUserID", context.Background(), "user-1", "").Return(0, nil)

	_, _, err := svc.List(context.Background(), "user-1", 200, 0, "")

	require.NoError(t, err)
	txRepo.AssertExpectations(t)
}

func TestTransactionService_List_FilterByType(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	expected := []*domain.Transaction{
		{ID: "tx-1", UserID: "user-1", Type: domain.TxTypeTopup, Amount: 5000},
	}

	txRepo.On("ListByUserID", context.Background(), "user-1", 20, 0, "topup").Return(expected, nil)
	txRepo.On("CountByUserID", context.Background(), "user-1", "topup").Return(1, nil)

	txs, total, err := svc.List(context.Background(), "user-1", 20, 0, "topup")

	require.NoError(t, err)
	assert.Len(t, txs, 1)
	assert.Equal(t, 1, total)
	assert.Equal(t, domain.TxTypeTopup, txs[0].Type)
}

// ─── Analytics ────────────────────────────────────────────────────────────────

func TestTransactionService_Analytics_Success(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	expected := &repository.Analytics{
		TotalIn:  50000,
		TotalOut: 20000,
		ByCategory: map[string]int64{
			"food":      5000,
			"transport": 3000,
		},
		Monthly: []repository.MonthlyData{
			{Month: "2025-01", In: 50000, Out: 20000},
		},
	}

	txRepo.On("GetAnalytics", context.Background(), "user-1", 30).Return(expected, nil)

	result, err := svc.Analytics(context.Background(), "user-1", 30)

	require.NoError(t, err)
	assert.Equal(t, int64(50000), result.TotalIn)
	assert.Equal(t, int64(20000), result.TotalOut)
	assert.Len(t, result.ByCategory, 2)
	assert.Len(t, result.Monthly, 1)
}

func TestTransactionService_Analytics_DefaultDays(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	txRepo.On("GetAnalytics", context.Background(), "user-1", 30).Return(&repository.Analytics{}, nil)

	_, err := svc.Analytics(context.Background(), "user-1", 0)

	require.NoError(t, err)
	txRepo.AssertExpectations(t)
}

func TestTransactionService_Analytics_MaxDays(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	txRepo.On("GetAnalytics", context.Background(), "user-1", 365).Return(&repository.Analytics{}, nil)

	_, err := svc.Analytics(context.Background(), "user-1", 500)

	require.NoError(t, err)
	txRepo.AssertExpectations(t)
}

// ─── GetLedger ────────────────────────────────────────────────────────────────

func TestTransactionService_GetLedger_Success(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	contact := &domain.User{ID: "user-2", Email: "bob@example.com", Name: "Bob"}
	expected := &repository.Ledger{
		Contact: contact,
		Transactions: []*domain.Transaction{
			{ID: "tx-1", Type: domain.TxTypeSend, Amount: 5000},
		},
		TotalSent:     5000,
		TotalReceived: 0,
		Net:           -5000,
	}

	userRepo.On("GetByEmail", context.Background(), "bob@example.com").Return(contact, nil)
	txRepo.On("GetLedger", context.Background(), "user-1", "user-2").Return(expected, nil)

	result, err := svc.GetLedger(context.Background(), "user-1", "bob@example.com")

	require.NoError(t, err)
	assert.Equal(t, "Bob", result.Contact.Name)
	assert.Len(t, result.Transactions, 1)
	assert.Equal(t, int64(5000), result.TotalSent)
}

func TestTransactionService_GetLedger_ContactNotFound(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	userRepo.On("GetByEmail", context.Background(), "nobody@example.com").Return(nil, domain.ErrNotFound)

	_, err := svc.GetLedger(context.Background(), "user-1", "nobody@example.com")

	assert.ErrorIs(t, err, domain.ErrNotFound)
}

func TestTransactionService_GetLedger_EmailNormalized(t *testing.T) {
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	svc := newTransactionService(txRepo, userRepo)

	contact := &domain.User{ID: "user-2", Email: "bob@example.com", Name: "Bob"}
	expected := &repository.Ledger{Contact: contact, Transactions: []*domain.Transaction{}}

	userRepo.On("GetByEmail", context.Background(), "bob@example.com").Return(contact, nil)
	txRepo.On("GetLedger", context.Background(), "user-1", "user-2").Return(expected, nil)

	_, err := svc.GetLedger(context.Background(), "user-1", "BOB@EXAMPLE.COM")

	require.NoError(t, err)
	userRepo.AssertExpectations(t)
}
