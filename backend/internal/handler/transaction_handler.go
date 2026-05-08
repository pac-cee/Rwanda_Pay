package handler

import (
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/response"
)

type MerchantHandler struct {
	repo interface {
		List(ctx interface{}, limit, offset int) (interface{}, error)
		GetByID(ctx interface{}, id string) (interface{}, error)
		Search(ctx interface{}, query string, limit int) (interface{}, error)
	}
}

type TransactionHandler struct {
	svc *service.TransactionService
}

func NewTransactionHandler(svc *service.TransactionService) *TransactionHandler {
	return &TransactionHandler{svc: svc}
}

func (h *TransactionHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))
	txType := c.Query("type", "")

	result, err := h.svc.List(c.Context(), service.ListTransactionsInput{
		UserID: userID,
		Limit:  limit,
		Offset: offset,
		Type:   txType,
	})
	if err != nil {
		return response.InternalError(c)
	}

	return response.OKWithMeta(c, result.Transactions, response.Meta{
		Total:  result.Total,
		Limit:  limit,
		Offset: offset,
	})
}

func (h *TransactionHandler) Analytics(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	days, _ := strconv.Atoi(c.Query("period", "30"))

	analytics, err := h.svc.GetAnalytics(c.Context(), userID, days)
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"total_in":    analytics.TotalIn,
		"total_out":   analytics.TotalOut,
		"by_category": analytics.ByCategory,
		"monthly":     analytics.Monthly,
		"days":        days,
	})
}
