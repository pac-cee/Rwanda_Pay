package service

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
	"github.com/rwandapay/backend/pkg/crypto"
)

type AddCardInput struct {
	UserID     string
	CardNumber string // raw 16 digits
	ExpiryDate string // MM/YY
	CVV        string // 3-4 digits
	HolderName string
	Network    domain.CardNetwork
	Label      string
	Color      string
	Balance    int64 // initial card balance in RWF
}

type CardService struct {
	cardRepo repository.CardRepository
	crypto   *crypto.Service
}

func NewCardService(cardRepo repository.CardRepository, cryptoSvc *crypto.Service) *CardService {
	return &CardService{cardRepo: cardRepo, crypto: cryptoSvc}
}

func (s *CardService) AddCard(ctx context.Context, in AddCardInput) (*domain.Card, error) {
	if len(in.CardNumber) != 16 {
		return nil, fmt.Errorf("%w: card number must be 16 digits", domain.ErrInvalidInput)
	}
	if len(in.ExpiryDate) != 5 {
		return nil, fmt.Errorf("%w: expiry date must be MM/YY", domain.ErrInvalidInput)
	}
	if len(in.CVV) < 3 || len(in.CVV) > 4 {
		return nil, fmt.Errorf("%w: CVV must be 3 or 4 digits", domain.ErrInvalidInput)
	}
	if in.HolderName == "" {
		return nil, fmt.Errorf("%w: holder name is required", domain.ErrInvalidInput)
	}
	if in.Balance < 0 {
		return nil, fmt.Errorf("%w: balance cannot be negative", domain.ErrInvalidInput)
	}

	// Encrypt sensitive fields
	encNumber, err := s.crypto.Encrypt(in.CardNumber)
	if err != nil {
		return nil, fmt.Errorf("encrypt card number: %w", err)
	}
	encCVV, err := s.crypto.Encrypt(in.CVV)
	if err != nil {
		return nil, fmt.Errorf("encrypt cvv: %w", err)
	}

	count, err := s.cardRepo.CountByUserID(ctx, in.UserID)
	if err != nil {
		return nil, fmt.Errorf("count cards: %w", err)
	}

	label := in.Label
	if label == "" {
		label = fmt.Sprintf("My %s Card", string(in.Network[0]-32)+string(in.Network[1:]))
	}

	card := &domain.Card{
		ID:         uuid.NewString(),
		UserID:     in.UserID,
		CardNumber: encNumber,
		CVV:        encCVV,
		Last4:      in.CardNumber[12:], // last 4 digits
		ExpiryDate: in.ExpiryDate,
		HolderName: in.HolderName,
		Network:    in.Network,
		Label:      label,
		Color:      in.Color,
		Balance:    in.Balance,
		IsDefault:  count == 0,
		Status:     domain.CardStatusActive,
	}

	if err := s.cardRepo.Create(ctx, card); err != nil {
		return nil, fmt.Errorf("create card: %w", err)
	}
	return card, nil
}

func (s *CardService) ListCards(ctx context.Context, userID string) ([]*domain.Card, error) {
	cards, err := s.cardRepo.ListByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("list cards: %w", err)
	}
	if cards == nil {
		return []*domain.Card{}, nil
	}
	return cards, nil
}

// AddCardBalance adds funds to a card's balance (simulates loading money onto the card).
func (s *CardService) AddCardBalance(ctx context.Context, cardID, userID string, amount int64) (*domain.Card, error) {
	if amount <= 0 {
		return nil, fmt.Errorf("%w: amount must be greater than 0", domain.ErrInvalidInput)
	}
	if amount > 10_000_000 {
		return nil, fmt.Errorf("%w: maximum card load is 10,000,000 RWF", domain.ErrInvalidInput)
	}

	card, err := s.cardRepo.GetByIDAndUserID(ctx, cardID, userID)
	if err != nil {
		return nil, err
	}
	if card.Status != domain.CardStatusActive {
		return nil, domain.ErrCardExpired
	}

	newBalance := card.Balance + amount
	if err := s.cardRepo.UpdateBalance(ctx, cardID, newBalance); err != nil {
		return nil, fmt.Errorf("update card balance: %w", err)
	}

	card.Balance = newBalance
	return card, nil
}

func (s *CardService) DeleteCard(ctx context.Context, cardID, userID string) error {
	card, err := s.cardRepo.GetByIDAndUserID(ctx, cardID, userID)
	if err != nil {
		return err
	}

	if err := s.cardRepo.Delete(ctx, cardID, userID); err != nil {
		return fmt.Errorf("delete card: %w", err)
	}

	// If deleted card was default, promote the oldest remaining card
	if card.IsDefault {
		cards, err := s.cardRepo.ListByUserID(ctx, userID)
		if err == nil && len(cards) > 0 {
			_ = s.cardRepo.SetDefault(ctx, cards[0].ID)
		}
	}
	return nil
}

func (s *CardService) SetDefault(ctx context.Context, cardID, userID string) (*domain.Card, error) {
	card, err := s.cardRepo.GetByIDAndUserID(ctx, cardID, userID)
	if err != nil {
		return nil, err
	}

	if err := s.cardRepo.UnsetAllDefaults(ctx, userID); err != nil {
		return nil, fmt.Errorf("unset defaults: %w", err)
	}
	if err := s.cardRepo.SetDefault(ctx, cardID); err != nil {
		return nil, fmt.Errorf("set default: %w", err)
	}

	card.IsDefault = true
	return card, nil
}
