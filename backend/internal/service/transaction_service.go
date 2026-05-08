package service

import (
	"context"

	"github.com/rwandapay/backend/internal/repository"
)

type TransactionService struct {
	txRepo repository.TransactionRepository
}

func NewTransactionService(txRepo repository.TransactionRepository) *TransactionService {
	return &TransactionService{txRepo: txRepo}
}

type ListTransactionsInput struct {
	UserID string
	Limit  int
	Offset int
	Type   string
}

type ListTransactionsResult struct {
	Transactions interface{}
	Total        int
}

func (s *TransactionService) List(ctx context.Context, in ListTransactionsInput) (*ListTransactionsResult, error) {
	if in.Limit <= 0 || in.Limit > 100 {
		in.Limit = 20
	}

	txs, err := s.txRepo.ListByUserID(ctx, in.UserID, in.Limit, in.Offset, in.Type)
	if err != nil {
		return nil, err
	}

	total, err := s.txRepo.CountByUserID(ctx, in.UserID, in.Type)
	if err != nil {
		return nil, err
	}

	return &ListTransactionsResult{Transactions: txs, Total: total}, nil
}

func (s *TransactionService) GetAnalytics(ctx context.Context, userID string, days int) (*repository.Analytics, error) {
	if days <= 0 || days > 365 {
		days = 30
	}
	return s.txRepo.GetAnalytics(ctx, userID, days)
}
