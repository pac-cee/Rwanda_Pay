package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/response"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

type registerRequest struct {
	Email    string  `json:"email" validate:"required,email"`
	Password string  `json:"password" validate:"required,min=6"`
	Name     string  `json:"name" validate:"required,min=1"`
	Phone    *string `json:"phone"`
}

type loginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type updateProfileRequest struct {
	Name  string  `json:"name"`
	Phone *string `json:"phone"`
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if req.Email == "" || len(req.Password) < 6 || req.Name == "" {
		return response.BadRequest(c, "email, password (min 6 chars), and name are required")
	}

	result, err := h.svc.Register(c.Context(), service.RegisterInput{
		Email:    req.Email,
		Password: req.Password,
		Name:     req.Name,
		Phone:    req.Phone,
	})
	if errors.Is(err, domain.ErrConflict) {
		return response.Conflict(c, "email already registered")
	}
	if err != nil {
		return response.InternalError(c)
	}

	return response.Created(c, fiber.Map{
		"user":   sanitizeUser(result.User),
		"wallet": fiber.Map{"balance": result.Wallet.Balance, "currency": result.Wallet.Currency},
		"token":  result.Token,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if req.Email == "" || req.Password == "" {
		return response.BadRequest(c, "email and password are required")
	}

	result, err := h.svc.Login(c.Context(), service.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if errors.Is(err, domain.ErrInvalidCredentials) {
		return response.BadRequest(c, "invalid email or password")
	}
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"user":   sanitizeUser(result.User),
		"wallet": fiber.Map{"balance": result.Wallet.Balance, "currency": result.Wallet.Currency},
		"token":  result.Token,
	})
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	result, err := h.svc.GetMe(c.Context(), userID)
	if errors.Is(err, domain.ErrNotFound) {
		return response.NotFound(c, "user not found")
	}
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"user":   sanitizeUser(result.User),
		"wallet": fiber.Map{"balance": result.Wallet.Balance, "currency": result.Wallet.Currency},
	})
}

func (h *AuthHandler) UpdateProfile(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req updateProfileRequest
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}

	user, err := h.svc.UpdateProfile(c.Context(), userID, req.Name, req.Phone)
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"user": sanitizeUser(user)})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	// JWT is stateless — client discards the token
	return response.OK(c, fiber.Map{"message": "logged out successfully"})
}

// sanitizeUser strips password_hash before sending to client
func sanitizeUser(u *domain.User) fiber.Map {
	return fiber.Map{
		"id":          u.ID,
		"email":       u.Email,
		"name":        u.Name,
		"phone":       u.Phone,
		"initials":    u.Initials,
		"is_verified": u.IsVerified,
		"created_at":  u.CreatedAt,
		"updated_at":  u.UpdatedAt,
	}
}
