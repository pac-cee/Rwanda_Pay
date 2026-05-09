package unit

import (
	"context"
	"testing"

	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/crypto"
	"github.com/rwandapay/backend/tests/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/require"
)

func newCardService(cardRepo *mocks.MockCardRepository) *service.CardService {
	// 32-byte hex key for AES-256
	cryptoSvc, _ := crypto.NewService("6368616e676520746869732070617373776f726420746f206120736563726574")
	return service.NewCardService(cardRepo, cryptoSvc)
}

// ─── AddCard ──────────────────────────────────────────────────────────────────

func TestCardService_AddCard_Success_FirstCardIsDefault(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	cardRepo.On("CountByUserID", context.Background(), "user-1").Return(0, nil)
	cardRepo.On("Create", context.Background(), mock.MatchedBy(func(c *domain.Card) bool {
		return c.UserID == "user-1" && c.Last4 == "4242" && c.IsDefault == true
	})).Return(nil)

	card, err := svc.AddCard(context.Background(), service.AddCardInput{
		UserID:     "user-1",
		CardNumber: "4111111111114242",
		ExpiryDate: "12/27",
		CVV:        "123",
		HolderName: "Alice Mugisha",
		Network:    domain.CardNetworkVisa,
		Label:      "Bank of Kigali",
		Color:      "#1B5E20",
		Balance:    100000,
	})

	require.NoError(t, err)
	assert.Equal(t, "4242", card.Last4)
	assert.True(t, card.IsDefault) // first card is always default
	assert.Equal(t, domain.CardStatusActive, card.Status)
	// Sensitive fields must not be the raw values
	assert.NotEqual(t, "4111111111114242", card.CardNumber)
	assert.NotEqual(t, "123", card.CVV)

	cardRepo.AssertExpectations(t)
}

func TestCardService_AddCard_SecondCardIsNotDefault(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	cardRepo.On("CountByUserID", context.Background(), "user-1").Return(1, nil)
	cardRepo.On("Create", context.Background(), mock.MatchedBy(func(c *domain.Card) bool {
		return c.IsDefault == false
	})).Return(nil)

	card, err := svc.AddCard(context.Background(), service.AddCardInput{
		UserID:     "user-1",
		CardNumber: "5500005555555559",
		ExpiryDate: "06/28",
		CVV:        "456",
		HolderName: "Alice Mugisha",
		Network:    domain.CardNetworkMastercard,
		Balance:    50000,
	})

	require.NoError(t, err)
	assert.False(t, card.IsDefault)
}

func TestCardService_AddCard_InvalidCardNumber_ReturnsError(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	_, err := svc.AddCard(context.Background(), service.AddCardInput{
		UserID:     "user-1",
		CardNumber: "123456789", // only 9 digits
		ExpiryDate: "12/27",
		CVV:        "123",
		HolderName: "Alice",
		Network:    domain.CardNetworkVisa,
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestCardService_AddCard_InvalidExpiryDate_ReturnsError(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	_, err := svc.AddCard(context.Background(), service.AddCardInput{
		UserID:     "user-1",
		CardNumber: "4111111111111111",
		ExpiryDate: "1227", // missing slash
		CVV:        "123",
		HolderName: "Alice",
		Network:    domain.CardNetworkVisa,
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestCardService_AddCard_InvalidCVV_ReturnsError(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	_, err := svc.AddCard(context.Background(), service.AddCardInput{
		UserID:     "user-1",
		CardNumber: "4111111111111111",
		ExpiryDate: "12/27",
		CVV:        "12", // too short
		HolderName: "Alice",
		Network:    domain.CardNetworkVisa,
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestCardService_AddCard_EmptyHolderName_ReturnsError(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	_, err := svc.AddCard(context.Background(), service.AddCardInput{
		UserID:     "user-1",
		CardNumber: "4111111111111111",
		ExpiryDate: "12/27",
		CVV:        "123",
		HolderName: "",
		Network:    domain.CardNetworkVisa,
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

func TestCardService_AddCard_NegativeBalance_ReturnsError(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	_, err := svc.AddCard(context.Background(), service.AddCardInput{
		UserID:     "user-1",
		CardNumber: "4111111111111111",
		ExpiryDate: "12/27",
		CVV:        "123",
		HolderName: "Alice",
		Network:    domain.CardNetworkVisa,
		Balance:    -100,
	})

	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}

// ─── ListCards ────────────────────────────────────────────────────────────────

func TestCardService_ListCards_ReturnsEmptySliceWhenNoCards(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	cardRepo.On("ListByUserID", context.Background(), "user-1").Return(nil, nil)

	cards, err := svc.ListCards(context.Background(), "user-1")

	require.NoError(t, err)
	assert.NotNil(t, cards)
	assert.Len(t, cards, 0)
}

func TestCardService_ListCards_ReturnsCards(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	expected := []*domain.Card{
		{ID: "c1", UserID: "user-1", Last4: "1234"},
		{ID: "c2", UserID: "user-1", Last4: "5678"},
	}
	cardRepo.On("ListByUserID", context.Background(), "user-1").Return(expected, nil)

	cards, err := svc.ListCards(context.Background(), "user-1")

	require.NoError(t, err)
	assert.Len(t, cards, 2)
}

// ─── DeleteCard ───────────────────────────────────────────────────────────────

func TestCardService_DeleteCard_Success(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	card := &domain.Card{ID: "card-1", UserID: "user-1", IsDefault: false}
	cardRepo.On("GetByIDAndUserID", context.Background(), "card-1", "user-1").Return(card, nil)
	cardRepo.On("Delete", context.Background(), "card-1", "user-1").Return(nil)

	err := svc.DeleteCard(context.Background(), "card-1", "user-1")
	require.NoError(t, err)
}

func TestCardService_DeleteCard_DefaultCard_PromotesNext(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	card := &domain.Card{ID: "card-1", UserID: "user-1", IsDefault: true}
	nextCard := &domain.Card{ID: "card-2", UserID: "user-1", IsDefault: false}

	cardRepo.On("GetByIDAndUserID", context.Background(), "card-1", "user-1").Return(card, nil)
	cardRepo.On("Delete", context.Background(), "card-1", "user-1").Return(nil)
	cardRepo.On("ListByUserID", context.Background(), "user-1").Return([]*domain.Card{nextCard}, nil)
	cardRepo.On("SetDefault", context.Background(), "card-2").Return(nil)

	err := svc.DeleteCard(context.Background(), "card-1", "user-1")
	require.NoError(t, err)
	cardRepo.AssertExpectations(t)
}

func TestCardService_DeleteCard_NotFound_ReturnsError(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	cardRepo.On("GetByIDAndUserID", context.Background(), "bad-id", "user-1").
		Return(nil, domain.ErrCardNotFound)

	err := svc.DeleteCard(context.Background(), "bad-id", "user-1")
	assert.ErrorIs(t, err, domain.ErrCardNotFound)
}

// ─── SetDefault ───────────────────────────────────────────────────────────────

func TestCardService_SetDefault_Success(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	card := &domain.Card{ID: "card-2", UserID: "user-1", IsDefault: false}
	cardRepo.On("GetByIDAndUserID", context.Background(), "card-2", "user-1").Return(card, nil)
	cardRepo.On("UnsetAllDefaults", context.Background(), "user-1").Return(nil)
	cardRepo.On("SetDefault", context.Background(), "card-2").Return(nil)

	result, err := svc.SetDefault(context.Background(), "card-2", "user-1")

	require.NoError(t, err)
	assert.True(t, result.IsDefault)
}

// ─── AddCardBalance ───────────────────────────────────────────────────────────

func TestCardService_AddCardBalance_Success(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	card := &domain.Card{ID: "card-1", UserID: "user-1", Balance: 10000, Status: domain.CardStatusActive}
	cardRepo.On("GetByIDAndUserID", context.Background(), "card-1", "user-1").Return(card, nil)
	cardRepo.On("UpdateBalance", context.Background(), "card-1", int64(60000)).Return(nil)

	result, err := svc.AddCardBalance(context.Background(), "card-1", "user-1", 50000)

	require.NoError(t, err)
	assert.Equal(t, int64(60000), result.Balance)
}

func TestCardService_AddCardBalance_ZeroAmount_ReturnsError(t *testing.T) {
	cardRepo := &mocks.MockCardRepository{}
	svc := newCardService(cardRepo)

	_, err := svc.AddCardBalance(context.Background(), "card-1", "user-1", 0)
	assert.ErrorIs(t, err, domain.ErrInvalidInput)
}
