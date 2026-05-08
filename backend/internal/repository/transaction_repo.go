package repository

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type transactionRepo struct {
	db *pgxpool.Pool
}

func NewTransactionRepository(db *pgxpool.Pool) TransactionRepository {
	return &transactionRepo{db: db}
}

func (r *transactionRepo) Create(ctx context.Context, tx *domain.Transaction) error {
	query := `
		INSERT INTO transactions (
			id, user_id, type, status, amount, fee, description, category,
			reference, card_id, merchant_id, recipient_id, recipient_name,
			balance_before, balance_after, is_nfc
		) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
		RETURNING created_at`

	err := r.db.QueryRow(ctx, query,
		tx.ID, tx.UserID, tx.Type, tx.Status, tx.Amount, tx.Fee,
		tx.Description, tx.Category, tx.Reference, tx.CardID,
		tx.MerchantID, tx.RecipientID, tx.RecipientName,
		tx.BalanceBefore, tx.BalanceAfter, tx.IsNFC,
	).Scan(&tx.CreatedAt)
	if err != nil {
		return fmt.Errorf("create transaction: %w", err)
	}
	return nil
}

func (r *transactionRepo) ListByUserID(ctx context.Context, userID string, limit, offset int, txType string) ([]*domain.Transaction, error) {
	query := `
		SELECT t.id, t.user_id, t.type, t.status, t.amount, t.fee,
		       t.description, t.category, t.reference, t.card_id,
		       t.merchant_id, t.recipient_id, t.recipient_name,
		       t.balance_before, t.balance_after, t.is_nfc, t.created_at,
		       m.id, m.name, m.category
		FROM transactions t
		LEFT JOIN merchants m ON t.merchant_id = m.id
		WHERE t.user_id = $1`

	args := []any{userID}
	argIdx := 2

	if txType != "" {
		query += fmt.Sprintf(" AND t.type = $%d", argIdx)
		args = append(args, txType)
		argIdx++
	}

	query += fmt.Sprintf(" ORDER BY t.created_at DESC LIMIT $%d OFFSET $%d", argIdx, argIdx+1)
	args = append(args, limit, offset)

	rows, err := r.db.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list transactions: %w", err)
	}
	defer rows.Close()

	var txs []*domain.Transaction
	for rows.Next() {
		tx := &domain.Transaction{}
		var mID, mName, mCat *string
		if err := rows.Scan(
			&tx.ID, &tx.UserID, &tx.Type, &tx.Status, &tx.Amount, &tx.Fee,
			&tx.Description, &tx.Category, &tx.Reference, &tx.CardID,
			&tx.MerchantID, &tx.RecipientID, &tx.RecipientName,
			&tx.BalanceBefore, &tx.BalanceAfter, &tx.IsNFC, &tx.CreatedAt,
			&mID, &mName, &mCat,
		); err != nil {
			return nil, fmt.Errorf("scan transaction: %w", err)
		}
		if mID != nil {
			tx.Merchant = &domain.Merchant{
				ID:       *mID,
				Name:     *mName,
				Category: domain.MerchantCategory(*mCat),
			}
		}
		txs = append(txs, tx)
	}
	return txs, nil
}

func (r *transactionRepo) CountByUserID(ctx context.Context, userID string, txType string) (int, error) {
	query := `SELECT COUNT(*) FROM transactions WHERE user_id = $1`
	args := []any{userID}
	if txType != "" {
		query += " AND type = $2"
		args = append(args, txType)
	}
	var count int
	err := r.db.QueryRow(ctx, query, args...).Scan(&count)
	return count, err
}

func (r *transactionRepo) GetAnalytics(ctx context.Context, userID string, days int) (*Analytics, error) {
	since := time.Now().AddDate(0, 0, -days)

	rows, err := r.db.Query(ctx, `
		SELECT type, category, amount,
		       TO_CHAR(created_at, 'YYYY-MM') as month
		FROM transactions
		WHERE user_id = $1 AND status = 'success' AND created_at >= $2`,
		userID, since,
	)
	if err != nil {
		return nil, fmt.Errorf("get analytics: %w", err)
	}
	defer rows.Close()

	result := &Analytics{
		ByCategory: make(map[string]int64),
	}
	monthMap := make(map[string]*MonthlyData)

	for rows.Next() {
		var txType, category, month string
		var amount int64
		if err := rows.Scan(&txType, &category, &amount, &month); err != nil {
			return nil, err
		}

		if _, ok := monthMap[month]; !ok {
			monthMap[month] = &MonthlyData{Month: month}
		}

		switch txType {
		case "topup", "receive":
			result.TotalIn += amount
			monthMap[month].In += amount
		default:
			result.TotalOut += amount
			monthMap[month].Out += amount
			result.ByCategory[category] += amount
		}
	}

	for _, m := range monthMap {
		result.Monthly = append(result.Monthly, *m)
	}
	return result, nil
}
