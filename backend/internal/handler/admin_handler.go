package handler

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/repository"
	"github.com/rwandapay/backend/pkg/response"
)

type AdminHandler struct {
	userRepo     repository.UserRepository
	txRepo       repository.TransactionRepository
	merchantRepo repository.MerchantRepository
	logRepo      repository.ActivityLogRepository
}

func NewAdminHandler(
	userRepo repository.UserRepository,
	txRepo repository.TransactionRepository,
	merchantRepo repository.MerchantRepository,
	logRepo repository.ActivityLogRepository,
) *AdminHandler {
	return &AdminHandler{
		userRepo:     userRepo,
		txRepo:       txRepo,
		merchantRepo: merchantRepo,
		logRepo:      logRepo,
	}
}

// GetStats returns system statistics
func (h *AdminHandler) GetStats(c *fiber.Ctx) error {
	ctx := c.Context()

	// Get total users
	totalUsers, err := h.userRepo.Count(ctx)
	if err != nil {
		log.Printf("[ERROR] Count users: %v", err)
		return response.InternalError(c)
	}

	// Get total transactions
	totalTx, err := h.txRepo.Count(ctx)
	if err != nil {
		log.Printf("[ERROR] Count transactions: %v", err)
		return response.InternalError(c)
	}

	// Get total volume
	totalVolume, err := h.txRepo.GetTotalVolume(ctx)
	if err != nil {
		log.Printf("[ERROR] Get total volume: %v", err)
		return response.InternalError(c)
	}

	// Get active users today
	activeToday, err := h.userRepo.CountActiveToday(ctx)
	if err != nil {
		log.Printf("[ERROR] Count active users: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"total_users":        totalUsers,
		"total_transactions": totalTx,
		"total_volume":       totalVolume,
		"active_users_today": activeToday,
	})
}

// ListUsers returns all users with pagination
func (h *AdminHandler) ListUsers(c *fiber.Ctx) error {
	ctx := c.Context()
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	users, total, err := h.userRepo.ListAll(ctx, limit, offset)
	if err != nil {
		log.Printf("[ERROR] List users: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"users":  users,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}

// GetUser returns a specific user by ID
func (h *AdminHandler) GetUser(c *fiber.Ctx) error {
	ctx := c.Context()
	userID := c.Params("id")

	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		return response.NotFound(c, "User not found")
	}

	return response.OK(c, fiber.Map{"user": user})
}

// DeleteUser soft deletes a user
func (h *AdminHandler) DeleteUser(c *fiber.Ctx) error {
	ctx := c.Context()
	userID := c.Params("id")

	if err := h.userRepo.Delete(ctx, userID); err != nil {
		log.Printf("[ERROR] Delete user: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"message": "User deleted"})
}

// UpdateUser updates user details
func (h *AdminHandler) UpdateUser(c *fiber.Ctx) error {
	ctx := c.Context()
	userID := c.Params("id")

	var req struct {
		Name  string `json:"name"`
		Phone string `json:"phone"`
	}

	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request")
	}

	user, err := h.userRepo.GetByID(ctx, userID)
	if err != nil {
		return response.NotFound(c, "User not found")
	}

	user.Name = req.Name
	if req.Phone != "" {
		user.Phone = &req.Phone
	}

	if err := h.userRepo.Update(ctx, user); err != nil {
		log.Printf("[ERROR] Update user: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"user": user})
}

// ListTransactions returns all transactions
func (h *AdminHandler) ListTransactions(c *fiber.Ctx) error {
	ctx := c.Context()
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	txs, total, err := h.txRepo.ListAll(ctx, limit, offset)
	if err != nil {
		log.Printf("[ERROR] List transactions: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"transactions": txs,
		"total":        total,
		"limit":        limit,
		"offset":       offset,
	})
}

// ListMerchants returns all merchants
func (h *AdminHandler) ListMerchants(c *fiber.Ctx) error {
	ctx := c.Context()

	merchants, err := h.merchantRepo.ListAll(ctx)
	if err != nil {
		log.Printf("[ERROR] List merchants: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"merchants": merchants})
}

// CreateMerchant creates a new merchant
func (h *AdminHandler) CreateMerchant(c *fiber.Ctx) error {
	ctx := c.Context()

	var req struct {
		Name        string `json:"name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Category    string `json:"category"`
		Description string `json:"description"`
		Address     string `json:"address"`
		City        string `json:"city"`
	}

	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request body")
	}

	if req.Name == "" {
		return response.BadRequest(c, "Merchant name is required")
	}

	merchant, err := h.merchantRepo.Create(ctx, req.Name, req.Email, req.Phone, req.Category, req.Description, req.Address, req.City)
	if err != nil {
		log.Printf("[ERROR] Create merchant: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"merchant": merchant})
}

// UpdateMerchant updates merchant details
func (h *AdminHandler) UpdateMerchant(c *fiber.Ctx) error {
	ctx := c.Context()
	merchantID := c.Params("id")

	var req struct {
		Name        string `json:"name"`
		Email       string `json:"email"`
		Phone       string `json:"phone"`
		Description string `json:"description"`
	}

	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "Invalid request")
	}

	if err := h.merchantRepo.Update(ctx, merchantID, req.Name, req.Email, req.Phone, req.Description); err != nil {
		log.Printf("[ERROR] Update merchant: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"message": "Merchant updated"})
}

// DeleteMerchant soft deletes a merchant
func (h *AdminHandler) DeleteMerchant(c *fiber.Ctx) error {
	ctx := c.Context()
	merchantID := c.Params("id")

	if err := h.merchantRepo.Delete(ctx, merchantID); err != nil {
		log.Printf("[ERROR] Delete merchant: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"message": "Merchant deleted"})
}

// GetLogs returns activity logs
func (h *AdminHandler) GetLogs(c *fiber.Ctx) error {
	ctx := c.Context()
	limit, _ := strconv.Atoi(c.Query("limit", "50"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	logs, total, err := h.logRepo.List(ctx, limit, offset)
	if err != nil {
		log.Printf("[ERROR] List logs: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"logs":   logs,
		"total":  total,
		"limit":  limit,
		"offset": offset,
	})
}
