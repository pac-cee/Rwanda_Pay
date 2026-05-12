package handler

import (
	"errors"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/response"
)

type TransactionHandler struct {
	svc *service.TransactionService
}

func NewTransactionHandler(svc *service.TransactionService) *TransactionHandler {
	return &TransactionHandler{svc: svc}
}

// List godoc
// @Summary      List transactions
// @Tags         transactions
// @Security     BearerAuth
// @Param        limit   query  int     false  "Max records (default 20, max 100)"
// @Param        offset  query  int     false  "Pagination offset"
// @Param        type    query  string  false  "Filter by type: topup, send, receive, payment"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/transactions [get]
func (h *TransactionHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	txType := c.Query("type", "")

	txs, total, err := h.svc.List(c.Context(), userID, limit, offset, txType)
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"transactions": txs,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
	})
}

// Analytics godoc
// @Summary      Spending analytics
// @Tags         transactions
// @Security     BearerAuth
// @Param        period  query  int  false  "Days to analyze (default 30)"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/transactions/analytics [get]
func (h *TransactionHandler) Analytics(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	days, _ := strconv.Atoi(c.Query("period", "30"))

	analytics, err := h.svc.Analytics(c.Context(), userID, days)
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"by_category": analytics.ByCategory,
		"monthly":     analytics.Monthly,
		"total_in":    analytics.TotalIn,
		"total_out":   analytics.TotalOut,
		"days":        days,
	})
}

// Ledger godoc
// @Summary      Transaction ledger with a contact
// @Tags         transactions
// @Security     BearerAuth
// @Param        email  path  string  true  "Contact email"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/transactions/ledger/{email} [get]
func (h *TransactionHandler) Ledger(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	contactEmail := c.Params("email")

	if contactEmail == "" {
		return response.BadRequest(c, "contact email is required")
	}

	ledger, err := h.svc.GetLedger(c.Context(), userID, contactEmail)
	if errors.Is(err, domain.ErrNotFound) {
		return response.NotFound(c, "contact not found")
	}
	if err != nil {
		return response.InternalError(c)
	}

	txs := ledger.Transactions
	if txs == nil {
		txs = []*domain.Transaction{}
	}

	return response.OK(c, fiber.Map{
		"contact": fiber.Map{
			"id":       ledger.Contact.ID,
			"name":     ledger.Contact.Name,
			"email":    ledger.Contact.Email,
			"initials": ledger.Contact.Initials,
		},
		"transactions":   txs,
		"total_sent":     ledger.TotalSent,
		"total_received": ledger.TotalReceived,
		"net":            ledger.Net,
	})
}
