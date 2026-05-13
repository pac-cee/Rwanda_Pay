package integration

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/handler"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/tests/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func setupWalletApp() (*fiber.App, *mocks.MockWalletTxRepository, *mocks.MockCardRepository, *mocks.MockUserRepository, *mocks.MockTransactionRepository) {
	app := fiber.New()
	walletRepo := &mocks.MockWalletTxRepository{}
	cardRepo := &mocks.MockCardRepository{}
	userRepo := &mocks.MockUserRepository{}
	merchantRepo := &mocks.MockMerchantRepository{}
	userMerchantRepo := &mocks.MockUserMerchantRepository{}
	txRepo := &mocks.MockTransactionRepository{}

	walletSvc := service.NewWalletService(walletRepo, cardRepo, userRepo, merchantRepo, userMerchantRepo, txRepo, nil)
	walletHandler := handler.NewWalletHandler(walletSvc)

	// Mock auth middleware
	authMiddleware := func(c *fiber.Ctx) error {
		c.Locals("userID", "user-1")
		c.Locals("email", "alice@example.com")
		return c.Next()
	}

	app.Get("/api/v1/wallet", authMiddleware, walletHandler.GetBalance)
	app.Post("/api/v1/wallet/topup", authMiddleware, walletHandler.Topup)
	app.Post("/api/v1/wallet/transfer", authMiddleware, walletHandler.Transfer)
	app.Post("/api/v1/wallet/pay", authMiddleware, walletHandler.Pay)

	return app, walletRepo, cardRepo, userRepo, txRepo
}

// ─── GetBalance Tests ─────────────────────────────────────────────────────────

func TestIntegration_Wallet_GetBalance_Success(t *testing.T) {
	app, walletRepo, _, _, _ := setupWalletApp()

	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 50000, Currency: "RWF", IsFrozen: false}
	walletRepo.On("GetByUserID", mock.Anything, "user-1").Return(wallet, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/wallet", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.Equal(t, float64(50000), data["balance"])
	assert.Equal(t, "RWF", data["currency"])
	assert.Equal(t, false, data["frozen"])
}

// ─── Topup Tests ──────────────────────────────────────────────────────────────

func TestIntegration_Wallet_Topup_Success(t *testing.T) {
	app, walletRepo, cardRepo, _, txRepo := setupWalletApp()

	card := &domain.Card{ID: "card-1", UserID: "user-1", Last4: "4242", Label: "Bank of Kigali", Status: domain.CardStatusActive}
	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 10000}

	cardRepo.On("GetByIDAndUserID", mock.Anything, "card-1", "user-1").Return(card, nil)
	walletRepo.On("GetByUserID", mock.Anything, "user-1").Return(wallet, nil)
	walletRepo.On("TopupTx", mock.Anything, "wallet-1", "card-1", int64(5000)).Return(int64(15000), int64(5000), nil)
	txRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	reqBody := map[string]interface{}{
		"card_id": "card-1",
		"amount":  5000,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/topup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.Equal(t, float64(15000), data["balance"])
	assert.NotNil(t, data["transaction"])
}

func TestIntegration_Wallet_Topup_AmountBelowMinimum(t *testing.T) {
	app, _, _, _, _ := setupWalletApp()

	reqBody := map[string]interface{}{
		"card_id": "card-1",
		"amount":  499,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/topup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}

func TestIntegration_Wallet_Topup_CardNotFound(t *testing.T) {
	app, _, cardRepo, _, _ := setupWalletApp()

	cardRepo.On("GetByIDAndUserID", mock.Anything, "bad-card", "user-1").Return(nil, domain.ErrCardNotFound)

	reqBody := map[string]interface{}{
		"card_id": "bad-card",
		"amount":  1000,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/topup", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}

// ─── Transfer Tests ───────────────────────────────────────────────────────────

func TestIntegration_Wallet_Transfer_Success(t *testing.T) {
	app, walletRepo, _, userRepo, txRepo := setupWalletApp()

	recipient := &domain.User{ID: "user-2", Email: "bob@example.com", Name: "Bob"}
	senderWallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 50000}
	recipientWallet := &domain.Wallet{ID: "wallet-2", UserID: "user-2", Balance: 10000}

	userRepo.On("GetByEmail", mock.Anything, "bob@example.com").Return(recipient, nil)
	walletRepo.On("GetByUserID", mock.Anything, "user-1").Return(senderWallet, nil)
	walletRepo.On("GetByUserID", mock.Anything, "user-2").Return(recipientWallet, nil)
	walletRepo.On("TransferTx", mock.Anything, "wallet-1", "wallet-2", int64(5000)).Return(int64(45000), int64(15000), nil)
	txRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	reqBody := map[string]interface{}{
		"recipient_email": "bob@example.com",
		"amount":          5000,
		"description":     "Lunch split",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/transfer", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.Equal(t, float64(45000), data["balance"])
}

func TestIntegration_Wallet_Transfer_SelfTransfer(t *testing.T) {
	app, _, _, _, _ := setupWalletApp()

	reqBody := map[string]interface{}{
		"recipient_email": "alice@example.com",
		"amount":          1000,
		"description":     "test",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/transfer", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	assert.Contains(t, result["error"], "cannot transfer to yourself")
}

func TestIntegration_Wallet_Transfer_RecipientNotFound(t *testing.T) {
	app, _, _, userRepo, _ := setupWalletApp()

	userRepo.On("GetByEmail", mock.Anything, "nobody@example.com").Return(nil, domain.ErrNotFound)

	reqBody := map[string]interface{}{
		"recipient_email": "nobody@example.com",
		"amount":          1000,
		"description":     "test",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/transfer", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}

func TestIntegration_Wallet_Transfer_InsufficientFunds(t *testing.T) {
	app, walletRepo, _, userRepo, _ := setupWalletApp()

	recipient := &domain.User{ID: "user-2", Email: "bob@example.com", Name: "Bob"}
	senderWallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 100}
	recipientWallet := &domain.Wallet{ID: "wallet-2", UserID: "user-2", Balance: 0}

	userRepo.On("GetByEmail", mock.Anything, "bob@example.com").Return(recipient, nil)
	walletRepo.On("GetByUserID", mock.Anything, "user-1").Return(senderWallet, nil)
	walletRepo.On("GetByUserID", mock.Anything, "user-2").Return(recipientWallet, nil)
	walletRepo.On("TransferTx", mock.Anything, "wallet-1", "wallet-2", int64(5000)).Return(int64(0), int64(0), domain.ErrInsufficientFunds)

	reqBody := map[string]interface{}{
		"recipient_email": "bob@example.com",
		"amount":          5000,
		"description":     "test",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/transfer", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}

// ─── Pay Tests ────────────────────────────────────────────────────────────────

func TestIntegration_Wallet_Pay_Success(t *testing.T) {
	app, walletRepo, _, _, txRepo := setupWalletApp()

	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 20000}

	walletRepo.On("GetByUserID", mock.Anything, "user-1").Return(wallet, nil)
	walletRepo.On("PayTx", mock.Anything, "wallet-1", int64(2000)).Return(int64(18000), nil)
	txRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	reqBody := map[string]interface{}{
		"amount":      2000,
		"description": "Simba Supermarket",
		"category":    "food",
		"is_nfc":      true,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/pay", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.Equal(t, float64(18000), data["balance"])

	tx := data["transaction"].(map[string]interface{})
	assert.Equal(t, "payment", tx["type"])
	assert.Equal(t, float64(2000), tx["amount"])
}

func TestIntegration_Wallet_Pay_ZeroAmount(t *testing.T) {
	app, _, _, _, _ := setupWalletApp()

	reqBody := map[string]interface{}{
		"amount":      0,
		"description": "test",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/pay", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}

func TestIntegration_Wallet_Pay_InsufficientFunds(t *testing.T) {
	app, walletRepo, _, _, _ := setupWalletApp()

	wallet := &domain.Wallet{ID: "wallet-1", UserID: "user-1", Balance: 500}

	walletRepo.On("GetByUserID", mock.Anything, "user-1").Return(wallet, nil)
	walletRepo.On("PayTx", mock.Anything, "wallet-1", int64(5000)).Return(int64(0), domain.ErrInsufficientFunds)

	reqBody := map[string]interface{}{
		"amount":      5000,
		"description": "test",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/pay", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}
