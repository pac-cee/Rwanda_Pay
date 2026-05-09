package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

// WalletTxRepository extends WalletRepository with atomic transaction methods.
type WalletTxRepository interface {
	WalletRepository
	// TransferTx atomically debits sender and credits recipient within one DB transaction.
	// Wallets are locked in UUID-ascending order to prevent deadlocks.
	TransferTx(ctx context.Context, senderWalletID, recipientWalletID string, amount int64) (senderBalance, recipientBalance int64, err error)
	// TopupTx atomically debits the card balance and credits the wallet within one DB transaction.
	TopupTx(ctx context.Context, walletID, cardID string, amount int64) (newWalletBalance, newCardBalance int64, err error)
	// PayTx atomically debits the wallet within one DB transaction.
	PayTx(ctx context.Context, walletID string, amount int64) (newBalance int64, err error)
}

type walletRepo struct {
	db *pgxpool.Pool
}

func NewWalletRepository(db *pgxpool.Pool) WalletTxRepository {
	return &walletRepo{db: db}
}

func (r *walletRepo) Create(ctx context.Context, w *domain.Wallet) error {
	query := `
		INSERT INTO wallets (id, user_id, balance, currency)
		VALUES ($1, $2, $3, $4)
		RETURNING created_at, updated_at`

	err := r.db.QueryRow(ctx, query, w.ID, w.UserID, w.Balance, w.Currency).
		Scan(&w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return fmt.Errorf("create wallet: %w", err)
	}
	return nil
}

func (r *walletRepo) GetByUserID(ctx context.Context, userID string) (*domain.Wallet, error) {
	query := `
		SELECT id, user_id, balance, currency, is_frozen, created_at, updated_at
		FROM wallets WHERE user_id = $1`

	w := &domain.Wallet{}
	err := r.db.QueryRow(ctx, query, userID).Scan(
		&w.ID, &w.UserID, &w.Balance, &w.Currency,
		&w.IsFrozen, &w.CreatedAt, &w.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get wallet: %w", err)
	}
	return w, nil
}

func (r *walletRepo) UpdateBalance(ctx context.Context, walletID string, newBalance int64) error {
	query := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	_, err := r.db.Exec(ctx, query, newBalance, walletID)
	if err != nil {
		return fmt.Errorf("update wallet balance: %w", err)
	}
	return nil
}

// TransferTx performs an atomic wallet-to-wallet transfer.
// Both wallets are locked with SELECT FOR UPDATE in UUID-ascending order
// to prevent deadlocks when two concurrent transfers happen between the same pair.
func (r *walletRepo) TransferTx(ctx context.Context, senderWalletID, recipientWalletID string, amount int64) (int64, int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("begin transfer tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck — rollback on any non-commit path

	// Lock wallets in consistent UUID-ascending order to prevent deadlocks
	first, second := senderWalletID, recipientWalletID
	if senderWalletID > recipientWalletID {
		first, second = recipientWalletID, senderWalletID
	}

	type walletRow struct {
		id       string
		balance  int64
		isFrozen bool
	}

	lockQuery := `SELECT id, balance, is_frozen FROM wallets WHERE id = $1 FOR UPDATE`

	var w1, w2 walletRow
	if err := tx.QueryRow(ctx, lockQuery, first).Scan(&w1.id, &w1.balance, &w1.isFrozen); err != nil {
		return 0, 0, fmt.Errorf("lock first wallet: %w", err)
	}
	if err := tx.QueryRow(ctx, lockQuery, second).Scan(&w2.id, &w2.balance, &w2.isFrozen); err != nil {
		return 0, 0, fmt.Errorf("lock second wallet: %w", err)
	}

	// Map back to sender/recipient
	var sender, recipient walletRow
	if w1.id == senderWalletID {
		sender, recipient = w1, w2
	} else {
		sender, recipient = w2, w1
	}

	if sender.isFrozen {
		return 0, 0, domain.ErrWalletFrozen
	}
	if sender.balance < amount {
		return 0, 0, fmt.Errorf("%w: wallet has %d RWF, need %d RWF",
			domain.ErrInsufficientFunds, sender.balance, amount)
	}

	newSenderBalance := sender.balance - amount
	newRecipientBalance := recipient.balance + amount

	updateQuery := `UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`
	if _, err := tx.Exec(ctx, updateQuery, newSenderBalance, senderWalletID); err != nil {
		return 0, 0, fmt.Errorf("debit sender: %w", err)
	}
	if _, err := tx.Exec(ctx, updateQuery, newRecipientBalance, recipientWalletID); err != nil {
		return 0, 0, fmt.Errorf("credit recipient: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, fmt.Errorf("commit transfer: %w", err)
	}
	return newSenderBalance, newRecipientBalance, nil
}

// TopupTx atomically debits the card and credits the wallet in one DB transaction.
func (r *walletRepo) TopupTx(ctx context.Context, walletID, cardID string, amount int64) (int64, int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, 0, fmt.Errorf("begin topup tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	// Lock wallet row
	var walletBalance int64
	var isFrozen bool
	if err := tx.QueryRow(ctx,
		`SELECT balance, is_frozen FROM wallets WHERE id = $1 FOR UPDATE`,
		walletID,
	).Scan(&walletBalance, &isFrozen); err != nil {
		return 0, 0, fmt.Errorf("lock wallet: %w", err)
	}
	if isFrozen {
		return 0, 0, domain.ErrWalletFrozen
	}

	// Lock card row
	var cardBalance int64
	var cardStatus string
	if err := tx.QueryRow(ctx,
		`SELECT balance, status FROM cards WHERE id = $1 FOR UPDATE`,
		cardID,
	).Scan(&cardBalance, &cardStatus); err != nil {
		return 0, 0, fmt.Errorf("lock card: %w", err)
	}
	if cardStatus == "frozen" {
		return 0, 0, domain.ErrCardFrozen
	}
	if cardStatus != "active" {
		return 0, 0, domain.ErrCardExpired
	}
	if cardBalance < amount {
		return 0, 0, fmt.Errorf("%w: card has %d RWF, need %d RWF",
			domain.ErrInsufficientCardFunds, cardBalance, amount)
	}

	newCardBalance := cardBalance - amount
	newWalletBalance := walletBalance + amount

	if _, err := tx.Exec(ctx,
		`UPDATE cards SET balance = $1 WHERE id = $2`,
		newCardBalance, cardID,
	); err != nil {
		return 0, 0, fmt.Errorf("debit card: %w", err)
	}
	if _, err := tx.Exec(ctx,
		`UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
		newWalletBalance, walletID,
	); err != nil {
		return 0, 0, fmt.Errorf("credit wallet: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, 0, fmt.Errorf("commit topup: %w", err)
	}
	return newWalletBalance, newCardBalance, nil
}

// PayTx atomically debits the wallet for a payment in one DB transaction.
func (r *walletRepo) PayTx(ctx context.Context, walletID string, amount int64) (int64, error) {
	tx, err := r.db.Begin(ctx)
	if err != nil {
		return 0, fmt.Errorf("begin pay tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var balance int64
	var isFrozen bool
	if err := tx.QueryRow(ctx,
		`SELECT balance, is_frozen FROM wallets WHERE id = $1 FOR UPDATE`,
		walletID,
	).Scan(&balance, &isFrozen); err != nil {
		return 0, fmt.Errorf("lock wallet: %w", err)
	}
	if isFrozen {
		return 0, domain.ErrWalletFrozen
	}
	if balance < amount {
		return 0, fmt.Errorf("%w: wallet has %d RWF, need %d RWF",
			domain.ErrInsufficientFunds, balance, amount)
	}

	newBalance := balance - amount
	if _, err := tx.Exec(ctx,
		`UPDATE wallets SET balance = $1, updated_at = NOW() WHERE id = $2`,
		newBalance, walletID,
	); err != nil {
		return 0, fmt.Errorf("debit wallet: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return 0, fmt.Errorf("commit payment: %w", err)
	}
	return newBalance, nil
}
