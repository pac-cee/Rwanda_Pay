package service

import (
	"context"
	"fmt"
	"strings"

	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
)

type TransactionService struct {
	txRepo   repository.TransactionRepository
	userRepo repository.UserRepository
}

func NewTransactionService(txRepo repository.TransactionRepository, userRepo repository.UserRepository) *TransactionService {
	return &TransactionService{txRepo: txRepo, userRepo: userRepo}
}

func (s *TransactionService) List(ctx context.Context, userID string, limit, offset int, txType string) ([]*domain.Transaction, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 100 {
		limit = 100
	}
	if offset < 0 {
		offset = 0
	}

	txs, err := s.txRepo.ListByUserID(ctx, userID, limit, offset, txType)
	if err != nil {
		return nil, 0, fmt.Errorf("list transactions: %w", err)
	}
	if txs == nil {
		txs = []*domain.Transaction{}
	}

	total, err := s.txRepo.CountByUserID(ctx, userID, txType)
	if err != nil {
		return nil, 0, fmt.Errorf("count transactions: %w", err)
	}

	return txs, total, nil
}

func (s *TransactionService) Analytics(ctx context.Context, userID string, days int) (*repository.Analytics, error) {
	if days <= 0 {
		days = 30
	}
	if days > 365 {
		days = 365
	}
	return s.txRepo.GetAnalytics(ctx, userID, days)
}

// GetLedger returns the transaction history between the authenticated user and a contact by email.
func (s *TransactionService) GetLedger(ctx context.Context, userID, contactEmail string) (*repository.Ledger, error) {
	contact, err := s.userRepo.GetByEmail(ctx, strings.ToLower(contactEmail))
	if err != nil {
		return nil, domain.ErrNotFound
	}
	return s.txRepo.GetLedger(ctx, userID, contact.ID)
}
