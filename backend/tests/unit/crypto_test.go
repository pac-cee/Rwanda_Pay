package unit

import (
	"testing"

	"github.com/rwandapay/backend/pkg/crypto"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

const validKey = "6368616e676520746869732070617373776f726420746f206120736563726574"

func TestCrypto_Encrypt_ReturnsNonEmptyHex(t *testing.T) {
	svc, err := crypto.NewService(validKey)
	require.NoError(t, err)

	ciphertext, err := svc.Encrypt("4111111111111111")
	require.NoError(t, err)
	assert.NotEmpty(t, ciphertext)
	assert.NotEqual(t, "4111111111111111", ciphertext)
}

func TestCrypto_Decrypt_ReturnsOriginalPlaintext(t *testing.T) {
	svc, err := crypto.NewService(validKey)
	require.NoError(t, err)

	original := "4111111111111111"
	ciphertext, err := svc.Encrypt(original)
	require.NoError(t, err)

	plaintext, err := svc.Decrypt(ciphertext)
	require.NoError(t, err)
	assert.Equal(t, original, plaintext)
}

func TestCrypto_Encrypt_TwoCallsProduceDifferentCiphertexts(t *testing.T) {
	// AES-GCM uses a random nonce — same plaintext should produce different ciphertexts
	svc, err := crypto.NewService(validKey)
	require.NoError(t, err)

	c1, err := svc.Encrypt("4111111111111111")
	require.NoError(t, err)
	c2, err := svc.Encrypt("4111111111111111")
	require.NoError(t, err)

	assert.NotEqual(t, c1, c2, "each encryption should produce a unique ciphertext due to random nonce")
}

func TestCrypto_Decrypt_WrongKey_ReturnsError(t *testing.T) {
	svc1, err := crypto.NewService(validKey)
	require.NoError(t, err)

	ciphertext, err := svc1.Encrypt("4111111111111111")
	require.NoError(t, err)

	// Different key
	svc2, err := crypto.NewService("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
	require.NoError(t, err)

	_, err = svc2.Decrypt(ciphertext)
	assert.Error(t, err)
}

func TestCrypto_NewService_ShortKey_ReturnsError(t *testing.T) {
	_, err := crypto.NewService("tooshort")
	assert.Error(t, err)
}

func TestCrypto_Decrypt_InvalidHex_ReturnsError(t *testing.T) {
	svc, err := crypto.NewService(validKey)
	require.NoError(t, err)

	_, err = svc.Decrypt("not-valid-hex!!!")
	assert.Error(t, err)
}

func TestCrypto_Decrypt_TruncatedCiphertext_ReturnsError(t *testing.T) {
	svc, err := crypto.NewService(validKey)
	require.NoError(t, err)

	_, err = svc.Decrypt("aabb")
	assert.Error(t, err)
}
