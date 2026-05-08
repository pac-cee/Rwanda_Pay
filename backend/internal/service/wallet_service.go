package service

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
)

type TopupInput struct {
	UserID string
	CardID string
	Amount int64
}

type TransferInput struct {
	SenderID       string
	SenderEmail    string
	RecipientEmail string
	Amount         int64
	Description    string
}

type PayInput struct {
	UserID       string
	Amount       int64
	Description  string
	Category     domain.TransactionCategory
	MerchantCode *string
	IsNFC        bool
}

type WalletResult struct {
	Transaction *domain.Transaction
	Balance     int64
}

type WalletService struct {
	walletRepo       repository.WalletRepository
	cardRepo         repository.CardRepository
	userRepo         repository.UserRepository
	merchantRepo     repository.MerchantRepository
	userMerchantRepo repository.UserMerchantRepository
	txRepo           repository.TransactionRepository
}

func NewWalletService(
	walletRepo repository.WalletRepository,
	cardRepo repository.CardRepository,
	userRepo repository.UserRepository,
	merchantRepo repository.MerchantRepository,
	userMerchantRepo repository.UserMerchantRepository,
	txRepo repository.TransactionRepository,
) *WalletService {
	return &WalletService{
		walletRepo:       walletRepo,
		cardRepo:         cardRepo,
		userRepo:         userRepo,
		merchantRepo:     merchantRepo,
		userMerchantRepo: userMerchantRepo,
		txRepo:           txRepo,
	}
}

func (s *WalletService) GetBalance(ctx context.Context, userID string) (*domain.Wallet, error) {
	wallet, err := s.walletRepo.GetByUserID(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("get balance: %w", err)
	}
	return wallet, nil
}

// Topup transfers money FROM a card's balance INTO the user's wallet.
// The card must belong to the user, be active, and have sufficient balance.
func (s *WalletService) Topup(ctx context.Context, in TopupInput) (*WalletResult, error) {
	if in.Amount < 500 {
		return nil, fmt.Errorf("%w: minimum top-up is 500 RWF", domain.ErrInvalidInput)
	}
	if in.Amount > 5_000_000 {
		return nil, fmt.Errorf("%w: maximum top-up is 5,000,000 RWF", domain.ErrInvalidInput)
	}

	// Verify card belongs to user and is active
	card, err := s.cardRepo.GetByIDAndUserID(ctx, in.CardID, in.UserID)
	if err != nil {
		return nil, err
	}
	if card.Status == domain.CardStatusFrozen {
		return nil, domain.ErrCardFrozen
	}
	if card.Status != domain.CardStatusActive {
		return nil, domain.ErrCardExpired
	}

	// Check card has enough balance
	if card.Balance < in.Amount {
		return nil, fmt.Errorf("%w: card has %d RWF, need %d RWF",
			domain.ErrInsufficientCardFunds, card.Balance, in.Amount)
	}

	// Get wallet and check it's not frozen
	wallet, err := s.walletRepo.GetByUserID(ctx, in.UserID)
	if err != nil {
		return nil, err
	}
	if wallet.IsFrozen {
		return nil, domain.ErrWalletFrozen
	}

	// Deduct from card
	newCardBalance := card.Balance - in.Amount
	if err := s.cardRepo.UpdateBalance(ctx, card.ID, newCardBalance); err != nil {
		return nil, fmt.Errorf("deduct from card: %w", err)
	}

	// Credit wallet
	newWalletBalance := wallet.Balance + in.Amount
	if err := s.walletRepo.UpdateBalance(ctx, wallet.ID, newWalletBalance); err != nil {
		// Attempt rollback
		_ = s.cardRepo.UpdateBalance(ctx, card.ID, card.Balance)
		return nil, fmt.Errorf("credit wallet: %w", err)
	}

	// Record transaction
	tx := &domain.Transaction{
		ID:            uuid.NewString(),
		UserID:        in.UserID,
		Type:          domain.TxTypeTopup,
		Status:        domain.TxStatusSuccess,
		Amount:        in.Amount,
		Fee:           0,
		Description:   fmt.Sprintf("Top up from %s ••••%s", card.Label, card.Last4),
		Category:      domain.TxCategoryOther,
		CardID:        &card.ID,
		BalanceBefore: &wallet.Balance,
		BalanceAfter:  &newWalletBalance,
	}
	if err := s.txRepo.Create(ctx, tx); err != nil {
		return nil, fmt.Errorf("record topup transaction: %w", err)
	}

	return &WalletResult{Transaction: tx, Balance: newWalletBalance}, nil
}

// Transfer sends money from one user's wallet to another user's wallet.
func (s *WalletService) Transfer(ctx context.Context, in TransferInput) (*WalletResult, error) {
	if strings.EqualFold(in.SenderEmail, in.RecipientEmail) {
		return nil, domain.ErrSelfTransfer
	}
	if in.Amount < 100 {
		return nil, fmt.Errorf("%w: minimum transfer is 100 RWF", domain.ErrInvalidInput)
	}

	senderWallet, err := s.walletRepo.GetByUserID(ctx, in.SenderID)
	if err != nil {
		return nil, fmt.Errorf("get sender wallet: %w", err)
	}
	if senderWallet.IsFrozen {
		return nil, domain.ErrWalletFrozen
	}
	if senderWallet.Balance < in.Amount {
		return nil, fmt.Errorf("%w: wallet has %d RWF, need %d RWF",
			domain.ErrInsufficientFunds, senderWallet.Balance, in.Amount)
	}

	recipient, err := s.userRepo.GetByEmail(ctx, strings.ToLower(in.RecipientEmail))
	if errors.Is(err, domain.ErrNotFound) {
		return nil, domain.ErrRecipientNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get recipient: %w", err)
	}

	recipientWallet, err := s.walletRepo.GetByUserID(ctx, recipient.ID)
	if err != nil {
		return nil, fmt.Errorf("get recipient wallet: %w", err)
	}

	// Deduct from sender
	newSenderBalance := senderWallet.Balance - in.Amount
	if err := s.walletRepo.UpdateBalance(ctx, senderWallet.ID, newSenderBalance); err != nil {
		return nil, fmt.Errorf("deduct from sender: %w", err)
	}

	// Credit recipient
	newRecipientBalance := recipientWallet.Balance + in.Amount
	if err := s.walletRepo.UpdateBalance(ctx, recipientWallet.ID, newRecipientBalance); err != nil {
		_ = s.walletRepo.UpdateBalance(ctx, senderWallet.ID, senderWallet.Balance) // rollback
		return nil, fmt.Errorf("credit recipient: %w", err)
	}

	// Sender transaction
	senderTx := &domain.Transaction{
		ID:            uuid.NewString(),
		UserID:        in.SenderID,
		Type:          domain.TxTypeSend,
		Status:        domain.TxStatusSuccess,
		Amount:        in.Amount,
		Description:   in.Description,
		Category:      domain.TxCategoryOther,
		RecipientID:   &recipient.ID,
		RecipientName: &recipient.Name,
		BalanceBefore: &senderWallet.Balance,
		BalanceAfter:  &newSenderBalance,
	}
	if err := s.txRepo.Create(ctx, senderTx); err != nil {
		return nil, fmt.Errorf("record send transaction: %w", err)
	}

	// Recipient transaction
	senderName := in.SenderEmail
	recipientTx := &domain.Transaction{
		ID:            uuid.NewString(),
		UserID:        recipient.ID,
		Type:          domain.TxTypeReceive,
		Status:        domain.TxStatusSuccess,
		Amount:        in.Amount,
		Description:   fmt.Sprintf("Received from %s", senderName),
		Category:      domain.TxCategoryOther,
		RecipientName: &senderName,
		BalanceBefore: &recipientWallet.Balance,
		BalanceAfter:  &newRecipientBalance,
	}
	if err := s.txRepo.Create(ctx, recipientTx); err != nil {
		return nil, fmt.Errorf("record receive transaction: %w", err)
	}

	return &WalletResult{Transaction: senderTx, Balance: newSenderBalance}, nil
}

// Pay deducts from the user's wallet balance (not from a card).
// Payments always come from the wallet.
func (s *WalletService) Pay(ctx context.Context, in PayInput) (*WalletResult, error) {
	if in.Amount < 1 {
		return nil, fmt.Errorf("%w: amount must be greater than 0", domain.ErrInvalidInput)
	}

	wallet, err := s.walletRepo.GetByUserID(ctx, in.UserID)
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}
	if wallet.IsFrozen {
		return nil, domain.ErrWalletFrozen
	}
	if wallet.Balance < in.Amount {
		return nil, fmt.Errorf("%w: wallet has %d RWF, need %d RWF",
			domain.ErrInsufficientFunds, wallet.Balance, in.Amount)
	}

	newBalance := wallet.Balance - in.Amount
	if err := s.walletRepo.UpdateBalance(ctx, wallet.ID, newBalance); err != nil {
		return nil, fmt.Errorf("deduct from wallet: %w", err)
	}

	tx := &domain.Transaction{
		ID:            uuid.NewString(),
		UserID:        in.UserID,
		Type:          domain.TxTypePayment,
		Status:        domain.TxStatusSuccess,
		Amount:        in.Amount,
		Description:   in.Description,
		Category:      in.Category,
		IsNFC:         in.IsNFC,
		BalanceBefore: &wallet.Balance,
		BalanceAfter:  &newBalance,
	}

	// Link merchant if code provided
	if in.MerchantCode != nil && *in.MerchantCode != "" {
		merchant, err := s.merchantRepo.GetByCode(ctx, *in.MerchantCode)
		if err == nil {
			tx.MerchantID = &merchant.ID
			tx.Description = fmt.Sprintf("Payment to %s", merchant.Name)
			_ = s.userMerchantRepo.IncrementVisit(ctx, in.UserID, merchant.ID, in.Amount)
		}
	}

	if err := s.txRepo.Create(ctx, tx); err != nil {
		_ = s.walletRepo.UpdateBalance(ctx, wallet.ID, wallet.Balance) // rollback
		return nil, fmt.Errorf("record payment transaction: %w", err)
	}

	return &WalletResult{Transaction: tx, Balance: newBalance}, nil
}
