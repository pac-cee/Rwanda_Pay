package unit

import (
	"context"
	"testing"
	"time"

	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/jwt"
	"github.com/rwandapay/backend/tests/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"golang.org/x/crypto/bcrypt"
)

func newAuthService(userRepo *mocks.MockUserRepository, walletRepo *mocks.MockWalletRepository) *service.AuthService {
	jwtSvc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)
	return service.NewAuthService(userRepo, walletRepo, jwtSvc)
}

// ─── Register ─────────────────────────────────────────────────────────────────

func TestAuthService_Register_Success(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	userRepo.On("GetByEmail", context.Background(), "alice@example.com").
		Return(nil, domain.ErrNotFound)
	userRepo.On("Create", context.Background(), mock_any_user()).
		Return(nil)
	walletRepo.On("Create", context.Background(), mock_any_wallet()).
		Return(nil)

	result, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "alice@example.com",
		Password: "password123",
		Name:     "Alice Mugisha",
	})

	require.NoError(t, err)
	assert.NotNil(t, result.User)
	assert.NotNil(t, result.Wallet)
	assert.NotEmpty(t, result.Token)
	assert.Equal(t, "alice@example.com", result.User.Email)
	assert.Equal(t, "AM", result.User.Initials)
	assert.Equal(t, int64(0), result.Wallet.Balance)
	assert.Equal(t, "RWF", result.Wallet.Currency)

	userRepo.AssertExpectations(t)
	walletRepo.AssertExpectations(t)
}

func TestAuthService_Register_EmailAlreadyExists_ReturnsConflict(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	existingUser := &domain.User{ID: "existing-id", Email: "alice@example.com"}
	userRepo.On("GetByEmail", context.Background(), "alice@example.com").
		Return(existingUser, nil)

	_, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "alice@example.com",
		Password: "password123",
		Name:     "Alice",
	})

	assert.ErrorIs(t, err, domain.ErrConflict)
	userRepo.AssertExpectations(t)
}

func TestAuthService_Register_EmailNormalisedToLowercase(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	userRepo.On("GetByEmail", context.Background(), "alice@example.com").
		Return(nil, domain.ErrNotFound)
	userRepo.On("Create", context.Background(), mock_any_user()).
		Return(nil)
	walletRepo.On("Create", context.Background(), mock_any_wallet()).
		Return(nil)

	result, err := svc.Register(context.Background(), service.RegisterInput{
		Email:    "ALICE@EXAMPLE.COM",
		Password: "password123",
		Name:     "Alice",
	})

	require.NoError(t, err)
	assert.Equal(t, "alice@example.com", result.User.Email)
}

func TestAuthService_Register_InitialsGeneratedCorrectly(t *testing.T) {
	tests := []struct {
		name     string
		expected string
	}{
		{"Alice Mugisha", "AM"},
		{"Alice", "A"},
		{"Alice Marie Mugisha", "AM"}, // only first 2 words
		{"pacifique", "P"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			userRepo := &mocks.MockUserRepository{}
			walletRepo := &mocks.MockWalletRepository{}
			svc := newAuthService(userRepo, walletRepo)

			userRepo.On("GetByEmail", context.Background(), "test@example.com").
				Return(nil, domain.ErrNotFound)
			userRepo.On("Create", context.Background(), mock_any_user()).Return(nil)
			walletRepo.On("Create", context.Background(), mock_any_wallet()).Return(nil)

			result, err := svc.Register(context.Background(), service.RegisterInput{
				Email: "test@example.com", Password: "pass123", Name: tt.name,
			})
			require.NoError(t, err)
			assert.Equal(t, tt.expected, result.User.Initials)
		})
	}
}

// ─── Login ────────────────────────────────────────────────────────────────────

func TestAuthService_Login_Success(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &domain.User{
		ID:           "user-123",
		Email:        "alice@example.com",
		PasswordHash: string(hash),
		Name:         "Alice",
		Initials:     "A",
		IsActive:     true,
	}
	wallet := &domain.Wallet{
		ID:       "wallet-123",
		UserID:   "user-123",
		Balance:  50000,
		Currency: "RWF",
	}

	userRepo.On("GetByEmail", context.Background(), "alice@example.com").Return(user, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-123").Return(wallet, nil)

	result, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "alice@example.com",
		Password: "password123",
	})

	require.NoError(t, err)
	assert.Equal(t, "user-123", result.User.ID)
	assert.Equal(t, int64(50000), result.Wallet.Balance)
	assert.NotEmpty(t, result.Token)
}

func TestAuthService_Login_WrongPassword_ReturnsInvalidCredentials(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	hash, _ := bcrypt.GenerateFromPassword([]byte("correctpassword"), bcrypt.DefaultCost)
	user := &domain.User{ID: "user-123", Email: "alice@example.com", PasswordHash: string(hash)}
	userRepo.On("GetByEmail", context.Background(), "alice@example.com").Return(user, nil)

	_, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "alice@example.com",
		Password: "wrongpassword",
	})

	assert.ErrorIs(t, err, domain.ErrInvalidCredentials)
}

func TestAuthService_Login_UserNotFound_ReturnsInvalidCredentials(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	userRepo.On("GetByEmail", context.Background(), "nobody@example.com").
		Return(nil, domain.ErrNotFound)

	_, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "nobody@example.com",
		Password: "password123",
	})

	assert.ErrorIs(t, err, domain.ErrInvalidCredentials)
}

func TestAuthService_Login_EmailNormalisedToLowercase(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	hash, _ := bcrypt.GenerateFromPassword([]byte("password123"), bcrypt.DefaultCost)
	user := &domain.User{ID: "user-123", Email: "alice@example.com", PasswordHash: string(hash)}
	wallet := &domain.Wallet{ID: "w-1", UserID: "user-123", Balance: 0, Currency: "RWF"}

	userRepo.On("GetByEmail", context.Background(), "alice@example.com").Return(user, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-123").Return(wallet, nil)

	result, err := svc.Login(context.Background(), service.LoginInput{
		Email:    "ALICE@EXAMPLE.COM",
		Password: "password123",
	})

	require.NoError(t, err)
	assert.NotNil(t, result)
}

// ─── GetMe ────────────────────────────────────────────────────────────────────

func TestAuthService_GetMe_Success(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	user := &domain.User{ID: "user-123", Email: "alice@example.com", Name: "Alice"}
	wallet := &domain.Wallet{ID: "w-1", UserID: "user-123", Balance: 25000, Currency: "RWF"}

	userRepo.On("GetByID", context.Background(), "user-123").Return(user, nil)
	walletRepo.On("GetByUserID", context.Background(), "user-123").Return(wallet, nil)

	result, err := svc.GetMe(context.Background(), "user-123")

	require.NoError(t, err)
	assert.Equal(t, "alice@example.com", result.User.Email)
	assert.Equal(t, int64(25000), result.Wallet.Balance)
}

func TestAuthService_GetMe_UserNotFound_ReturnsError(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	userRepo.On("GetByID", context.Background(), "ghost-id").Return(nil, domain.ErrNotFound)

	_, err := svc.GetMe(context.Background(), "ghost-id")
	assert.ErrorIs(t, err, domain.ErrNotFound)
}

// ─── UpdateProfile ────────────────────────────────────────────────────────────

func TestAuthService_UpdateProfile_UpdatesNameAndInitials(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	user := &domain.User{ID: "user-123", Name: "Old Name", Initials: "ON"}
	userRepo.On("GetByID", context.Background(), "user-123").Return(user, nil)
	userRepo.On("Update", context.Background(), user).Return(nil)

	updated, err := svc.UpdateProfile(context.Background(), "user-123", "New Name", nil)

	require.NoError(t, err)
	assert.Equal(t, "New Name", updated.Name)
	assert.Equal(t, "NN", updated.Initials)
}

func TestAuthService_UpdateProfile_UpdatesPhone(t *testing.T) {
	userRepo := &mocks.MockUserRepository{}
	walletRepo := &mocks.MockWalletRepository{}
	svc := newAuthService(userRepo, walletRepo)

	user := &domain.User{ID: "user-123", Name: "Alice"}
	phone := "+250788000000"
	userRepo.On("GetByID", context.Background(), "user-123").Return(user, nil)
	userRepo.On("Update", context.Background(), user).Return(nil)

	updated, err := svc.UpdateProfile(context.Background(), "user-123", "", &phone)

	require.NoError(t, err)
	assert.Equal(t, &phone, updated.Phone)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

import "github.com/stretchr/testify/mock"

func mock_any_user() interface{} {
	return mock.MatchedBy(func(u *domain.User) bool {
		return u.ID != "" && u.Email != "" && u.PasswordHash != ""
	})
}

func mock_any_wallet() interface{} {
	return mock.MatchedBy(func(w *domain.Wallet) bool {
		return w.ID != "" && w.UserID != "" && w.Balance == 0 && w.Currency == "RWF"
	})
}

// Suppress unused import
var _ = time.Now
