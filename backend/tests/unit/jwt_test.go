package unit

import (
	"testing"
	"time"

	jwtlib "github.com/golang-jwt/jwt/v5"
	"github.com/rwandapay/backend/pkg/jwt"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestJWT_Sign_ReturnsNonEmptyToken(t *testing.T) {
	svc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)
	token, err := svc.Sign("user-123", "test@example.com")
	require.NoError(t, err)
	assert.NotEmpty(t, token)
}

func TestJWT_Verify_ValidToken_ReturnsClaims(t *testing.T) {
	svc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)

	token, err := svc.Sign("user-123", "test@example.com")
	require.NoError(t, err)

	claims, err := svc.Verify(token)
	require.NoError(t, err)
	assert.Equal(t, "user-123", claims.UserID)
	assert.Equal(t, "test@example.com", claims.Email)
}

func TestJWT_Verify_WrongSecret_ReturnsError(t *testing.T) {
	signer := jwt.NewService("correct-secret-32-chars-minimum!", 168)
	verifier := jwt.NewService("wrong-secret-32-chars-minimum-!!", 168)

	token, err := signer.Sign("user-123", "test@example.com")
	require.NoError(t, err)

	_, err = verifier.Verify(token)
	assert.Error(t, err)
}

func TestJWT_Verify_TamperedToken_ReturnsError(t *testing.T) {
	svc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)

	token, err := svc.Sign("user-123", "test@example.com")
	require.NoError(t, err)

	// Tamper with the payload section
	tampered := token[:len(token)-5] + "XXXXX"
	_, err = svc.Verify(tampered)
	assert.Error(t, err)
}

func TestJWT_Verify_ExpiredToken_ReturnsError(t *testing.T) {
	svc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)

	// Manually create an already-expired token
	claims := jwt.Claims{
		UserID: "user-123",
		Email:  "test@example.com",
		RegisteredClaims: jwtlib.RegisteredClaims{
			ExpiresAt: jwtlib.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwtlib.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
	}
	raw := jwtlib.NewWithClaims(jwtlib.SigningMethodHS256, claims)
	expiredToken, err := raw.SignedString([]byte("test-secret-32-chars-minimum-ok!"))
	require.NoError(t, err)

	_, err = svc.Verify(expiredToken)
	assert.Error(t, err)
}

func TestJWT_Verify_EmptyToken_ReturnsError(t *testing.T) {
	svc := jwt.NewService("test-secret-32-chars-minimum-ok!", 168)
	_, err := svc.Verify("")
	assert.Error(t, err)
}
