package domain

import (
	"errors"
	"time"
)

// ─── Enums ───────────────────────────────────────────────────────────────────

type CardNetwork string

const (
	CardNetworkVisa       CardNetwork = "visa"
	CardNetworkMastercard CardNetwork = "mastercard"
	CardNetworkAmex       CardNetwork = "amex"
)

type CardStatus string

const (
	CardStatusActive    CardStatus = "active"
	CardStatusFrozen    CardStatus = "frozen"
	CardStatusExpired   CardStatus = "expired"
	CardStatusCancelled CardStatus = "cancelled"
)

type TransactionType string

const (
	TxTypeTopup      TransactionType = "topup"
	TxTypePayment    TransactionType = "payment"
	TxTypeSend       TransactionType = "send"
	TxTypeReceive    TransactionType = "receive"
	TxTypeRefund     TransactionType = "refund"
	TxTypeWithdrawal TransactionType = "withdrawal"
)

type TransactionStatus string

const (
	TxStatusPending  TransactionStatus = "pending"
	TxStatusSuccess  TransactionStatus = "success"
	TxStatusFailed   TransactionStatus = "failed"
	TxStatusReversed TransactionStatus = "reversed"
)

type TransactionCategory string

const (
	TxCategoryFood          TransactionCategory = "food"
	TxCategoryTransport     TransactionCategory = "transport"
	TxCategoryShopping      TransactionCategory = "shopping"
	TxCategoryEntertainment TransactionCategory = "entertainment"
	TxCategoryHealth        TransactionCategory = "health"
	TxCategoryUtilities     TransactionCategory = "utilities"
	TxCategoryEducation     TransactionCategory = "education"
	TxCategoryOther         TransactionCategory = "other"
)

type MerchantCategory string

const (
	MerchantCategoryFoodBeverage MerchantCategory = "food_beverage"
	MerchantCategoryRetail       MerchantCategory = "retail"
	MerchantCategoryTransport    MerchantCategory = "transport"
	MerchantCategoryHealth       MerchantCategory = "health"
	MerchantCategoryEntertainment MerchantCategory = "entertainment"
	MerchantCategoryEducation    MerchantCategory = "education"
	MerchantCategoryUtilities    MerchantCategory = "utilities"
	MerchantCategoryServices     MerchantCategory = "services"
	MerchantCategoryOther        MerchantCategory = "other"
)

// ─── Entities ────────────────────────────────────────────────────────────────

type User struct {
	ID           string    `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"` // never serialized
	Name         string    `json:"name"`
	Phone        *string   `json:"phone"`
	Initials     string    `json:"initials"`
	IsVerified   bool      `json:"is_verified"`
	IsActive     bool      `json:"is_active"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type Wallet struct {
	ID        string    `json:"id"`
	UserID    string    `json:"user_id"`
	Balance   int64     `json:"balance"` // in RWF, integer only
	Currency  string    `json:"currency"`
	IsFrozen  bool      `json:"is_frozen"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type Card struct {
	ID         string      `json:"id"`
	UserID     string      `json:"user_id"`
	Last4      string      `json:"last4"`
	ExpiryDate string      `json:"expiry_date"`
	HolderName string      `json:"holder_name"`
	Network    CardNetwork `json:"network"`
	Label      string      `json:"label"`
	Color      string      `json:"color"`
	Balance    int64       `json:"balance"` // card's own balance in RWF
	IsDefault  bool        `json:"is_default"`
	Status     CardStatus  `json:"status"`
	CreatedAt  time.Time   `json:"created_at"`
	// Sensitive — AES-256 encrypted, never in JSON responses
	CardNumber string `json:"-"`
	CVV        string `json:"-"`
}

type Merchant struct {
	ID           string           `json:"id"`
	Name         string           `json:"name"`
	Email        *string          `json:"email"`
	Phone        *string          `json:"phone"`
	Category     MerchantCategory `json:"category"`
	Description  *string          `json:"description"`
	Address      *string          `json:"address"`
	City         *string          `json:"city"`
	LogoURL      *string          `json:"logo_url"`
	Website      *string          `json:"website"`
	MerchantCode *string          `json:"merchant_code"`
	IsVerified   bool             `json:"is_verified"`
	CreatedAt    time.Time        `json:"created_at"`
	UpdatedAt    time.Time        `json:"updated_at"`
}

type UserMerchant struct {
	ID           string    `json:"id"`
	UserID       string    `json:"user_id"`
	MerchantID   string    `json:"merchant_id"`
	IsFavourite  bool      `json:"is_favourite"`
	TotalSpent   int64     `json:"total_spent"`
	VisitCount   int       `json:"visit_count"`
	LastVisitedAt *time.Time `json:"last_visited_at"`
	CreatedAt    time.Time `json:"created_at"`
	// Joined
	Merchant *Merchant `json:"merchant,omitempty"`
}

type Transaction struct {
	ID            string              `json:"id"`
	UserID        string              `json:"user_id"`
	Type          TransactionType     `json:"type"`
	Status        TransactionStatus   `json:"status"`
	Amount        int64               `json:"amount"`
	Fee           int64               `json:"fee"`
	Description   string              `json:"description"`
	Category      TransactionCategory `json:"category"`
	Reference     *string             `json:"reference"`
	CardID        *string             `json:"card_id"`
	MerchantID    *string             `json:"merchant_id"`
	RecipientID   *string             `json:"recipient_id"`
	RecipientName *string             `json:"recipient_name"`
	BalanceBefore *int64              `json:"balance_before"`
	BalanceAfter  *int64              `json:"balance_after"`
	IsNFC         bool                `json:"is_nfc"`
	CreatedAt     time.Time           `json:"created_at"`
	// Joined
	Merchant *Merchant `json:"merchant,omitempty"`
}

// ─── Domain Errors ────────────────────────────────────────────────────────────

var (
	ErrNotFound              = errors.New("not found")
	ErrUnauthorized          = errors.New("unauthorized")
	ErrForbidden             = errors.New("forbidden")
	ErrConflict              = errors.New("already exists")
	ErrInsufficientFunds     = errors.New("insufficient funds")
	ErrInsufficientCardFunds = errors.New("insufficient card balance")
	ErrWalletFrozen          = errors.New("wallet is frozen")
	ErrCardNotFound          = errors.New("card not found")
	ErrCardFrozen            = errors.New("card is frozen")
	ErrCardExpired           = errors.New("card is expired or inactive")
	ErrSelfTransfer          = errors.New("cannot transfer to yourself")
	ErrInvalidCredentials    = errors.New("invalid email or password")
	ErrInvalidInput          = errors.New("invalid input")
	ErrRecipientNotFound     = errors.New("recipient not found")
)
