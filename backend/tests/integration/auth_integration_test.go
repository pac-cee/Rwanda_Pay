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
	"github.com/rwandapay/backend/pkg/jwt"
	"github.com/rwandapay/backend/tests/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func setupAuthApp() (*fiber.App, *mocks.MockUserRepository, *mocks.MockWalletRepository) {
	app := fiber.New()
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	jwtSvc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)
	authSvc := service.NewAuthService(userRepo, walletRepo, jwtSvc)
	authHandler := handler.NewAuthHandler(authSvc)

	app.Post("/api/v1/auth/register", authHandler.Register)
	app.Post("/api/v1/auth/login", authHandler.Login)
	app.Get("/api/v1/auth/me", func(c *fiber.Ctx) error {
		// Mock auth middleware
		token := c.Get("Authorization")
		if token == "" {
			return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
		}
		token = token[7:] // Remove "Bearer "
		claims, err := jwtSvc.Verify(token)
		if err != nil {
			return c.Status(401).JSON(fiber.Map{"error": "invalid token"})
		}
		c.Locals("userID", claims.UserID)
		return authHandler.Me(c)
	})

	return app, userRepo, walletRepo
}

// ─── Register Tests ───────────────────────────────────────────────────────────

func TestIntegration_Auth_Register_Success(t *testing.T) {
	app, userRepo, walletRepo := setupAuthApp()

	userRepo.On("GetByEmail", mock.Anything, "alice@example.com").Return(nil, domain.ErrNotFound)
	userRepo.On("Create", mock.Anything, mock.Anything).Return(nil)
	walletRepo.On("Create", mock.Anything, mock.Anything).Return(nil)

	reqBody := map[string]interface{}{
		"email":    "alice@example.com",
		"password": "password123",
		"name":     "Alice Mugisha",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 201, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.NotNil(t, data["user"])
	assert.NotNil(t, data["wallet"])
	assert.NotNil(t, data["token"])

	user := data["user"].(map[string]interface{})
	assert.Equal(t, "alice@example.com", user["email"])
	assert.Equal(t, "AM", user["initials"])
	assert.Nil(t, user["password_hash"]) // Must not be exposed

	wallet := data["wallet"].(map[string]interface{})
	assert.Equal(t, float64(0), wallet["balance"])
}

func TestIntegration_Auth_Register_DuplicateEmail(t *testing.T) {
	app, userRepo, _ := setupAuthApp()

	existingUser := &domain.User{ID: "existing-id", Email: "alice@example.com"}
	userRepo.On("GetByEmail", mock.Anything, "alice@example.com").Return(existingUser, nil)

	reqBody := map[string]interface{}{
		"email":    "alice@example.com",
		"password": "password123",
		"name":     "Alice",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 409, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)
	assert.Contains(t, result["error"], "already registered")
}

func TestIntegration_Auth_Register_InvalidInput(t *testing.T) {
	app, _, _ := setupAuthApp()

	tests := []struct {
		name     string
		body     map[string]interface{}
		expected int
	}{
		{
			name:     "missing email",
			body:     map[string]interface{}{"password": "pass123", "name": "Alice"},
			expected: 400,
		},
		{
			name:     "short password",
			body:     map[string]interface{}{"email": "alice@example.com", "password": "123", "name": "Alice"},
			expected: 400,
		},
		{
			name:     "missing name",
			body:     map[string]interface{}{"email": "alice@example.com", "password": "pass123"},
			expected: 400,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			body, _ := json.Marshal(tt.body)
			req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/register", bytes.NewReader(body))
			req.Header.Set("Content-Type", "application/json")

			resp, err := app.Test(req)
			require.NoError(t, err)
			assert.Equal(t, tt.expected, resp.StatusCode)
		})
	}
}

// ─── Login Tests ──────────────────────────────────────────────────────────────

func TestIntegration_Auth_Login_Success(t *testing.T) {
	app, userRepo, walletRepo := setupAuthApp()

	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &domain.User{
		ID:           "user-123",
		Email:        "alice@example.com",
		PasswordHash: string(hash),
		Name:         "Alice",
		Initials:     "A",
	}
	wallet := &domain.Wallet{ID: "wallet-123", UserID: "user-123", Balance: 50000, Currency: "RWF"}

	userRepo.On("GetByEmail", mock.Anything, "alice@example.com").Return(user, nil)
	walletRepo.On("GetByUserID", mock.Anything, "user-123").Return(wallet, nil)

	reqBody := map[string]interface{}{
		"email":    "alice@example.com",
		"password": "password123",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	assert.NotNil(t, data["token"])
	
	wallet_data := data["wallet"].(map[string]interface{})
	assert.Equal(t, float64(50000), wallet_data["balance"])
}

func TestIntegration_Auth_Login_WrongPassword(t *testing.T) {
	app, userRepo, _ := setupAuthApp()

	hash, _ := bcrypt.GenerateFromPassword([]byte("correctpassword"), bcrypt.DefaultCost)
	user := &domain.User{ID: "user-123", Email: "alice@example.com", PasswordHash: string(hash)}

	userRepo.On("GetByEmail", mock.Anything, "alice@example.com").Return(user, nil)

	reqBody := map[string]interface{}{
		"email":    "alice@example.com",
		"password": "wrongpassword",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}

func TestIntegration_Auth_Login_UserNotFound(t *testing.T) {
	app, userRepo, _ := setupAuthApp()

	userRepo.On("GetByEmail", mock.Anything, "nobody@example.com").Return(nil, domain.ErrNotFound)

	reqBody := map[string]interface{}{
		"email":    "nobody@example.com",
		"password": "password123",
	}
	body, _ := json.Marshal(reqBody)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/auth/login", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 400, resp.StatusCode)
}

// ─── GetMe Tests ──────────────────────────────────────────────────────────────

func TestIntegration_Auth_GetMe_Success(t *testing.T) {
	app, userRepo, walletRepo := setupAuthApp()

	user := &domain.User{ID: "user-123", Email: "alice@example.com", Name: "Alice", Initials: "A"}
	wallet := &domain.Wallet{ID: "w-1", UserID: "user-123", Balance: 75000, Currency: "RWF"}

	userRepo.On("GetByID", mock.Anything, "user-123").Return(user, nil)
	walletRepo.On("GetByUserID", mock.Anything, "user-123").Return(wallet, nil)

	// Generate valid token
	jwtSvc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)
	token, _ := jwtSvc.Sign("user-123", "alice@example.com")

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 200, resp.StatusCode)

	var result map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&result)

	data := result["data"].(map[string]interface{})
	user_data := data["user"].(map[string]interface{})
	assert.Equal(t, "alice@example.com", user_data["email"])

	wallet_data := data["wallet"].(map[string]interface{})
	assert.Equal(t, float64(75000), wallet_data["balance"])
}

func TestIntegration_Auth_GetMe_NoToken(t *testing.T) {
	app, _, _ := setupAuthApp()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}

func TestIntegration_Auth_GetMe_InvalidToken(t *testing.T) {
	app, _, _ := setupAuthApp()

	req := httptest.NewRequest(http.MethodGet, "/api/v1/auth/me", nil)
	req.Header.Set("Authorization", "Bearer invalid-token-xyz")

	resp, err := app.Test(req)
	require.NoError(t, err)
	assert.Equal(t, 401, resp.StatusCode)
}
