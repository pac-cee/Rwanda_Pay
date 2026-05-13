package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/handler"
	"github.com/rwandapay/backend/internal/repository"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/crypto"
	"github.com/rwandapay/backend/tests/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

// ─── Card API Tests ───────────────────────────────────────────────────────────

func setupCardApp() (*fiber.App, *mocks.MockCardRepository) {
	app := fiber.New()
	cardRepo := &mocks.MockCardRepository{}
	cryptoSvc, _ := crypto.NewService("6368616e676520746869732070617373776f726420746f206120736563726574")
	cardSvc := service.NewCardService(cardRepo, cryptoSvc)
	cardHandler := handler.NewCardHandler(cardSvc)

	authMiddleware := func(c *fiber.Ctx) error {
		c.Locals("userID", "user-1")
		return c.Next()
	}

	app.Get("/api/v1/cards", authMiddleware, cardHandler.List)
	app.Post("/api/v1/cards", authMiddleware, cardHandler.Add)
	app.Delete("/api/v1/cards/:id", authMiddleware, cardHandler.Delete)
	app.Put("/api/v1/cards/:id/default", authMiddleware, cardHandler.SetDefault)
	app.Put("/api/v1/cards/:id/balance", authMiddleware, cardHandler.AddBalance)

	return app, cardRepo
}

func TestAPI_Cards_List_Success(t *testing.T) {
	app, cardRepo := setupCardApp()

	cards := []*domain.Card{
		{ID: "card-1", UserID: "user-1", Last4: "4242", Label: "Bank of Kigali"},
		{ID: "card-2", UserID: "user-1", Last4: "5678", Label: "I&M Bank"},
	}
	cardRepo.On("ListByUserID", mock.Anything, "user-1").Return(cards, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/cards", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	cardsList := data["cards"].([]interface{})
	assert.Len(t, cardsList, 2)
}

func TestAPI_Cards_List_EmptyResult(t *testing.T) {
	app, cardRepo := setupCardApp()

	cardRepo.On("ListByUserID", mock.Anything, "user-1").Return(nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/cards", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}

func TestAPI_Cards_Add_Success(t *testing.T) {
	app, cardRepo := setupCardApp()

	cardRepo.On("CountByUserID", mock.Anything, "user-1").Return(0, nil)
	cardRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	reqBody := map[string]interface{}{
		"card_number": "4111111111111111",
		"expiry_date": "12/27",
		"cvv":         "123",
		"holder_name": "Alice Mugisha",
		"network":     "visa",
		"label":       "Bank of Kigali",
		"balance":     100000,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	card := data["card"].(map[string]interface{})
	assert.Equal(t, "1111", card["last4"])
	assert.Nil(t, card["card_number"]) // Must not be exposed
	assert.Nil(t, card["cvv"])          // Must not be exposed
}

func TestAPI_Cards_Add_InvalidCardNumber(t *testing.T) {
	app, _ := setupCardApp()

	reqBody := map[string]interface{}{
		"card_number": "123456789", // only 9 digits
		"expiry_date": "12/27",
		"cvv":         "123",
		"holder_name": "Alice",
		"network":     "visa",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/cards", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}

func TestAPI_Cards_Delete_Success(t *testing.T) {
	app, cardRepo := setupCardApp()

	card := &domain.Card{ID: "card-1", UserID: "user-1", IsDefault: false}
	cardRepo.On("GetByIDAndUserID", mock.Anything, "card-1", "user-1").Return(card, nil)
	cardRepo.On("Delete", mock.Anything, "card-1", "user-1").Return(nil)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/cards/card-1", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}

func TestAPI_Cards_Delete_NotFound(t *testing.T) {
	app, cardRepo := setupCardApp()

	cardRepo.On("GetByIDAndUserID", mock.Anything, "bad-id", "user-1").Return(nil, domain.ErrCardNotFound)

	req := httptest.NewRequest(http.MethodDelete, "/api/v1/cards/bad-id", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}

func TestAPI_Cards_SetDefault_Success(t *testing.T) {
	app, cardRepo := setupCardApp()

	card := &domain.Card{ID: "card-2", UserID: "user-1", IsDefault: false}
	cardRepo.On("GetByIDAndUserID", mock.Anything, "card-2", "user-1").Return(card, nil)
	cardRepo.On("UnsetAllDefaults", mock.Anything, "user-1").Return(nil)
	cardRepo.On("SetDefault", mock.Anything, "card-2").Return(nil)

	req := httptest.NewRequest(http.MethodPut, "/api/v1/cards/card-2/default", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}

func TestAPI_Cards_AddBalance_Success(t *testing.T) {
	app, cardRepo := setupCardApp()

	card := &domain.Card{ID: "card-1", UserID: "user-1", Balance: 10000, Status: domain.CardStatusActive}
	cardRepo.On("GetByIDAndUserID", mock.Anything, "card-1", "user-1").Return(card, nil)
	cardRepo.On("UpdateBalance", mock.Anything, "card-1", int64(60000)).Return(nil)

	reqBody := map[string]interface{}{
		"amount": 50000,
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPut, "/api/v1/cards/card-1/balance", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}

// ─── Transaction API Tests ────────────────────────────────────────────────────

func setupTransactionApp() (*fiber.App, *mocks.MockTransactionRepository, *mocks.MockUserRepository) {
	app := fiber.New()
	txRepo := &mocks.MockTransactionRepository{}
	userRepo := &mocks.MockUserRepository{}
	txSvc := service.NewTransactionService(txRepo, userRepo)
	txHandler := handler.NewTransactionHandler(txSvc)

	authMiddleware := func(c *fiber.Ctx) error {
		c.Locals("userID", "user-1")
		return c.Next()
	}

	app.Get("/api/v1/transactions", authMiddleware, txHandler.List)
	app.Get("/api/v1/transactions/analytics", authMiddleware, txHandler.Analytics)
	app.Get("/api/v1/transactions/ledger/:email", authMiddleware, txHandler.Ledger)

	return app, txRepo, userRepo
}

func TestAPI_Transactions_List_Success(t *testing.T) {
	app, txRepo, _ := setupTransactionApp()

	txs := []*domain.Transaction{
		{ID: "tx-1", UserID: "user-1", Type: domain.TxTypeTopup, Amount: 5000},
		{ID: "tx-2", UserID: "user-1", Type: domain.TxTypeSend, Amount: 1000},
	}

	txRepo.On("ListByUserID", mock.Anything, "user-1", 20, 0, "").Return(txs, nil)
	txRepo.On("CountByUserID", mock.Anything, "user-1", "").Return(2, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/transactions", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	txList := data["transactions"].([]interface{})
	assert.Len(t, txList, 2)
	assert.Equal(t, float64(2), data["total"])
}

func TestAPI_Transactions_List_WithPagination(t *testing.T) {
	app, txRepo, _ := setupTransactionApp()

	txs := []*domain.Transaction{
		{ID: "tx-3", UserID: "user-1", Type: domain.TxTypePayment, Amount: 2000},
	}

	txRepo.On("ListByUserID", mock.Anything, "user-1", 10, 20, "").Return(txs, nil)
	txRepo.On("CountByUserID", mock.Anything, "user-1", "").Return(25, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/transactions?limit=10&offset=20", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.Equal(t, float64(10), data["limit"])
	assert.Equal(t, float64(20), data["offset"])
}

func TestAPI_Transactions_List_FilterByType(t *testing.T) {
	app, txRepo, _ := setupTransactionApp()

	txs := []*domain.Transaction{
		{ID: "tx-1", UserID: "user-1", Type: domain.TxTypeTopup, Amount: 5000},
	}

	txRepo.On("ListByUserID", mock.Anything, "user-1", 20, 0, "topup").Return(txs, nil)
	txRepo.On("CountByUserID", mock.Anything, "user-1", "topup").Return(1, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/transactions?type=topup", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)
}

func TestAPI_Transactions_Analytics_Success(t *testing.T) {
	app, txRepo, _ := setupTransactionApp()

	analytics := &repository.Analytics{
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

	txRepo.On("GetAnalytics", mock.Anything, "user-1", 30).Return(analytics, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/transactions/analytics", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.Equal(t, float64(50000), data["total_in"])
	assert.Equal(t, float64(20000), data["total_out"])
	assert.NotNil(t, data["by_category"])
	assert.NotNil(t, data["monthly"])
}

func TestAPI_Transactions_Ledger_Success(t *testing.T) {
	app, txRepo, userRepo := setupTransactionApp()

	contact := &domain.User{ID: "user-2", Email: "bob@example.com", Name: "Bob", Initials: "B"}
	ledger := &repository.Ledger{
		Contact: contact,
		Transactions: []*domain.Transaction{
			{ID: "tx-1", Type: domain.TxTypeSend, Amount: 5000},
		},
		TotalSent:     5000,
		TotalReceived: 0,
		Net:           -5000,
	}

	userRepo.On("GetByEmail", mock.Anything, "bob@example.com").Return(contact, nil)
	txRepo.On("GetLedger", mock.Anything, "user-1", "user-2").Return(ledger, nil)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/transactions/ledger/bob@example.com", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	contactData := data["contact"].(map[string]interface{})
	assert.Equal(t, "Bob", contactData["name"])
	assert.Equal(t, float64(5000), data["total_sent"])
	assert.Equal(t, float64(-5000), data["net"])
}

func TestAPI_Transactions_Ledger_ContactNotFound(t *testing.T) {
	app, _, userRepo := setupTransactionApp()

	userRepo.On("GetByEmail", mock.Anything, "nobody@example.com").Return(nil, domain.ErrNotFound)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/transactions/ledger/nobody@example.com", nil)
	resp, err := app.Test(req)

	require.NoError(t, err)
	assert.Equal(t, 404, resp.StatusCode)
}
