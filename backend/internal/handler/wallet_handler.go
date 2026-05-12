package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/response"
)

type WalletHandler struct {
	svc *service.WalletService
}

func NewWalletHandler(svc *service.WalletService) *WalletHandler {
	return &WalletHandler{svc: svc}
}

func (h *WalletHandler) GetBalance(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	wallet, err := h.svc.GetBalance(c.Context(), userID)
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, fiber.Map{
		"balance":  wallet.Balance,
		"currency": wallet.Currency,
		"frozen":   wallet.IsFrozen,
	})
}

func (h *WalletHandler) Topup(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		CardID string `json:"card_id"`
		Amount int64  `json:"amount"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if req.CardID == "" {
		return response.BadRequest(c, "card_id is required")
	}
	if req.Amount <= 0 {
		return response.BadRequest(c, "amount must be greater than 0")
	}

	result, err := h.svc.Topup(c.Context(), service.TopupInput{
		UserID: userID,
		CardID: req.CardID,
		Amount: req.Amount,
	})

	switch {
	case errors.Is(err, domain.ErrCardNotFound):
		return response.NotFound(c, "card not found")
	case errors.Is(err, domain.ErrCardFrozen):
		return response.BadRequest(c, "card is frozen")
	case errors.Is(err, domain.ErrCardExpired):
		return response.BadRequest(c, "card is expired or inactive")
	case errors.Is(err, domain.ErrInsufficientCardFunds):
		return response.BadRequest(c, err.Error())
	case errors.Is(err, domain.ErrWalletFrozen):
		return response.BadRequest(c, "wallet is frozen")
	case errors.Is(err, domain.ErrInvalidInput):
		return response.BadRequest(c, err.Error())
	case err != nil:
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"transaction": result.Transaction,
		"balance":     result.Balance,
	})
}

func (h *WalletHandler) Transfer(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	userEmail := c.Locals("email").(string)

	var req struct {
		RecipientEmail string `json:"recipient_email"`
		Amount         int64  `json:"amount"`
		Description    string `json:"description"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if req.RecipientEmail == "" {
		return response.BadRequest(c, "recipient_email is required")
	}
	if req.Amount <= 0 {
		return response.BadRequest(c, "amount must be greater than 0")
	}
	if req.Description == "" {
		return response.BadRequest(c, "description is required")
	}

	result, err := h.svc.Transfer(c.Context(), service.TransferInput{
		SenderID:       userID,
		SenderEmail:    userEmail,
		RecipientEmail: req.RecipientEmail,
		Amount:         req.Amount,
		Description:    req.Description,
	})

	switch {
	case errors.Is(err, domain.ErrSelfTransfer):
		return response.BadRequest(c, "cannot transfer to yourself")
	case errors.Is(err, domain.ErrInsufficientFunds):
		return response.BadRequest(c, err.Error())
	case errors.Is(err, domain.ErrWalletFrozen):
		return response.BadRequest(c, "wallet is frozen")
	case errors.Is(err, domain.ErrRecipientNotFound):
		return response.NotFound(c, "recipient not found")
	case errors.Is(err, domain.ErrInvalidInput):
		return response.BadRequest(c, err.Error())
	case err != nil:
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"transaction": result.Transaction,
		"balance":     result.Balance,
	})
}

func (h *WalletHandler) Pay(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		Amount       int64  `json:"amount"`
		Description  string `json:"description"`
		Category     string `json:"category"`
		MerchantCode string `json:"merchant_code"`
		IsNFC        bool   `json:"is_nfc"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if req.Amount <= 0 {
		return response.BadRequest(c, "amount must be greater than 0")
	}
	if req.Description == "" {
		return response.BadRequest(c, "description is required")
	}

	category := domain.TransactionCategory(req.Category)
	if category == "" {
		category = domain.TxCategoryOther
	}

	var merchantCode *string
	if req.MerchantCode != "" {
		merchantCode = &req.MerchantCode
	}

	result, err := h.svc.Pay(c.Context(), service.PayInput{
		UserID:       userID,
		Amount:       req.Amount,
		Description:  req.Description,
		Category:     category,
		MerchantCode: merchantCode,
		IsNFC:        req.IsNFC,
	})

	switch {
	case errors.Is(err, domain.ErrInsufficientFunds):
		return response.BadRequest(c, err.Error())
	case errors.Is(err, domain.ErrWalletFrozen):
		return response.BadRequest(c, "wallet is frozen")
	case errors.Is(err, domain.ErrInvalidInput):
		return response.BadRequest(c, err.Error())
	case err != nil:
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"transaction": result.Transaction,
		"balance":     result.Balance,
	})
}
