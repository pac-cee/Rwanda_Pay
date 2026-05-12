package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rwandapay/backend/internal/domain"
)

type cardRepo struct {
	db *pgxpool.Pool
}

func NewCardRepository(db *pgxpool.Pool) CardRepository {
	return &cardRepo{db: db}
}

const cardSafeCols = `id, user_id, last4, expiry_date, holder_name,
	network, label, color, balance, is_default, status, created_at`

func scanCard(row pgx.Row) (*domain.Card, error) {
	c := &domain.Card{}
	err := row.Scan(
		&c.ID, &c.UserID, &c.Last4, &c.ExpiryDate, &c.HolderName,
		&c.Network, &c.Label, &c.Color, &c.Balance, &c.IsDefault, &c.Status, &c.CreatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, domain.ErrCardNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("scan card: %w", err)
	}
	return c, nil
}

func (r *cardRepo) Create(ctx context.Context, c *domain.Card) error {
	query := `
		INSERT INTO cards (id, user_id, card_number, cvv, last4, expiry_date,
		                   holder_name, network, label, color, balance, is_default, status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
		RETURNING created_at`

	err := r.db.QueryRow(ctx, query,
		c.ID, c.UserID, c.CardNumber, c.CVV, c.Last4, c.ExpiryDate,
		c.HolderName, c.Network, c.Label, c.Color, c.Balance, c.IsDefault, c.Status,
	).Scan(&c.CreatedAt)
	if err != nil {
		return fmt.Errorf("create card: %w", err)
	}
	return nil
}

func (r *cardRepo) ListByUserID(ctx context.Context, userID string) ([]*domain.Card, error) {
	query := fmt.Sprintf(`SELECT %s FROM cards WHERE user_id = $1 ORDER BY created_at ASC`, cardSafeCols)
	rows, err := r.db.Query(ctx, query, userID)
	if err != nil {
		return nil, fmt.Errorf("list cards: %w", err)
	}
	defer rows.Close()

	var cards []*domain.Card
	for rows.Next() {
		c := &domain.Card{}
		if err := rows.Scan(
			&c.ID, &c.UserID, &c.Last4, &c.ExpiryDate, &c.HolderName,
			&c.Network, &c.Label, &c.Color, &c.Balance, &c.IsDefault, &c.Status, &c.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan card row: %w", err)
		}
		cards = append(cards, c)
	}
	return cards, nil
}

func (r *cardRepo) GetByID(ctx context.Context, id string) (*domain.Card, error) {
	query := fmt.Sprintf(`SELECT %s FROM cards WHERE id = $1`, cardSafeCols)
	return scanCard(r.db.QueryRow(ctx, query, id))
}

func (r *cardRepo) GetByIDAndUserID(ctx context.Context, id, userID string) (*domain.Card, error) {
	query := fmt.Sprintf(`SELECT %s FROM cards WHERE id = $1 AND user_id = $2`, cardSafeCols)
	return scanCard(r.db.QueryRow(ctx, query, id, userID))
}

func (r *cardRepo) UpdateBalance(ctx context.Context, cardID string, newBalance int64) error {
	result, err := r.db.Exec(ctx,
		`UPDATE cards SET balance = $1 WHERE id = $2`, newBalance, cardID)
	if err != nil {
		return fmt.Errorf("update card balance: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.ErrCardNotFound
	}
	return nil
}

func (r *cardRepo) Delete(ctx context.Context, id, userID string) error {
	result, err := r.db.Exec(ctx,
		`DELETE FROM cards WHERE id = $1 AND user_id = $2`, id, userID)
	if err != nil {
		return fmt.Errorf("delete card: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.ErrCardNotFound
	}
	return nil
}

func (r *cardRepo) UnsetAllDefaults(ctx context.Context, userID string) error {
	_, err := r.db.Exec(ctx, `UPDATE cards SET is_default = FALSE WHERE user_id = $1`, userID)
	return err
}

func (r *cardRepo) SetDefault(ctx context.Context, id string) error {
	_, err := r.db.Exec(ctx, `UPDATE cards SET is_default = TRUE WHERE id = $1`, id)
	return err
}

func (r *cardRepo) CountByUserID(ctx context.Context, userID string) (int, error) {
	var count int
	err := r.db.QueryRow(ctx, `SELECT COUNT(*) FROM cards WHERE user_id = $1`, userID).Scan(&count)
	return count, err
}
