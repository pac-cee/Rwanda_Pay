package service

import (
	"context"
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
	walletRepo       repository.WalletTxRepository
	cardRepo         repository.CardRepository
	userRepo         repository.UserRepository
	merchantRepo     repository.MerchantRepository
	userMerchantRepo repository.UserMerchantRepository
	txRepo           repository.TransactionRepository
}

func NewWalletService(
	walletRepo repository.WalletTxRepository,
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

// Topup transfers money FROM a card's balance INTO the user's wallet atomically.
// Uses TopupTx which wraps the card debit + wallet credit in a single DB transaction
// with row-level locks — no race conditions possible.
func (s *WalletService) Topup(ctx context.Context, in TopupInput) (*WalletResult, error) {
	if in.Amount < 500 {
		return nil, fmt.Errorf("%w: minimum top-up is 500 RWF", domain.ErrInvalidInput)
	}
	if in.Amount > 5_000_000 {
		return nil, fmt.Errorf("%w: maximum top-up is 5,000,000 RWF", domain.ErrInvalidInput)
	}

	// Verify card belongs to user (ownership check before locking)
	card, err := s.cardRepo.GetByIDAndUserID(ctx, in.CardID, in.UserID)
	if err != nil {
		return nil, err
	}

	// Get wallet ID for the user
	wallet, err := s.walletRepo.GetByUserID(ctx, in.UserID)
	if err != nil {
		return nil, err
	}

	// Atomic: debit card + credit wallet in one DB transaction with row-level locks
	newWalletBalance, _, err := s.walletRepo.TopupTx(ctx, wallet.ID, card.ID, in.Amount)
	if err != nil {
		return nil, err
	}

	// Record transaction (outside the balance lock — idempotent insert)
	balanceBefore := wallet.Balance
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
		BalanceBefore: &balanceBefore,
		BalanceAfter:  &newWalletBalance,
	}
	if err := s.txRepo.Create(ctx, tx); err != nil {
		return nil, fmt.Errorf("record topup transaction: %w", err)
	}

	return &WalletResult{Transaction: tx, Balance: newWalletBalance}, nil
}

// Transfer sends money from one user's wallet to another atomically.
// Uses TransferTx which locks both wallets in UUID-ascending order to prevent deadlocks.
func (s *WalletService) Transfer(ctx context.Context, in TransferInput) (*WalletResult, error) {
	if strings.EqualFold(in.SenderEmail, in.RecipientEmail) {
		return nil, domain.ErrSelfTransfer
	}
	if in.Amount < 100 {
		return nil, fmt.Errorf("%w: minimum transfer is 100 RWF", domain.ErrInvalidInput)
	}

	// Look up recipient
	recipient, err := s.userRepo.GetByEmail(ctx, strings.ToLower(in.RecipientEmail))
	if err != nil {
		return nil, domain.ErrRecipientNotFound
	}

	// Get both wallet IDs
	senderWallet, err := s.walletRepo.GetByUserID(ctx, in.SenderID)
	if err != nil {
		return nil, fmt.Errorf("get sender wallet: %w", err)
	}
	recipientWallet, err := s.walletRepo.GetByUserID(ctx, recipient.ID)
	if err != nil {
		return nil, fmt.Errorf("get recipient wallet: %w", err)
	}

	senderBalanceBefore := senderWallet.Balance

	// Atomic: debit sender + credit recipient in one DB transaction with deadlock-safe locking
	newSenderBalance, _, err := s.walletRepo.TransferTx(ctx, senderWallet.ID, recipientWallet.ID, in.Amount)
	if err != nil {
		return nil, err
	}

	// Record sender transaction
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
		BalanceBefore: &senderBalanceBefore,
		BalanceAfter:  &newSenderBalance,
	}
	if err := s.txRepo.Create(ctx, senderTx); err != nil {
		return nil, fmt.Errorf("record send transaction: %w", err)
	}

	// Record recipient transaction
	recipientBalanceBefore := recipientWallet.Balance
	newRecipientBalance := recipientBalanceBefore + in.Amount
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
		BalanceBefore: &recipientBalanceBefore,
		BalanceAfter:  &newRecipientBalance,
	}
	if err := s.txRepo.Create(ctx, recipientTx); err != nil {
		return nil, fmt.Errorf("record receive transaction: %w", err)
	}

	return &WalletResult{Transaction: senderTx, Balance: newSenderBalance}, nil
}

// Pay deducts from the user's wallet balance atomically.
// Payments always come from the wallet, never directly from a card.
func (s *WalletService) Pay(ctx context.Context, in PayInput) (*WalletResult, error) {
	if in.Amount < 1 {
		return nil, fmt.Errorf("%w: amount must be greater than 0", domain.ErrInvalidInput)
	}

	wallet, err := s.walletRepo.GetByUserID(ctx, in.UserID)
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}

	balanceBefore := wallet.Balance

	// Atomic: debit wallet in one DB transaction with row-level lock
	newBalance, err := s.walletRepo.PayTx(ctx, wallet.ID, in.Amount)
	if err != nil {
		return nil, err
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
		BalanceBefore: &balanceBefore,
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
		return nil, fmt.Errorf("record payment transaction: %w", err)
	}

	return &WalletResult{Transaction: tx, Balance: newBalance}, nil
}
