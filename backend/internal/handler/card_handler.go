package handler

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/response"
)

type CardHandler struct {
	svc *service.CardService
}

func NewCardHandler(svc *service.CardService) *CardHandler {
	return &CardHandler{svc: svc}
}

// List godoc
// @Summary      List user cards
// @Tags         cards
// @Security     BearerAuth
// @Success      200  {object}  response.envelope
// @Router       /api/v1/cards [get]
func (h *CardHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	cards, err := h.svc.ListCards(c.Context(), userID)
	if err != nil {
		return response.InternalError(c)
	}
	return response.OK(c, fiber.Map{"cards": cards})
}

// Add godoc
// @Summary      Add a new card
// @Tags         cards
// @Security     BearerAuth
// @Param        body  body  object  true  "Card details"
// @Success      201  {object}  response.envelope
// @Router       /api/v1/cards [post]
func (h *CardHandler) Add(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	var req struct {
		CardNumber string `json:"card_number"`
		ExpiryDate string `json:"expiry_date"`
		CVV        string `json:"cvv"`
		HolderName string `json:"holder_name"`
		Network    string `json:"network"`
		Label      string `json:"label"`
		Color      string `json:"color"`
		Balance    int64  `json:"balance"` // initial card balance
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}

	digits := onlyDigits(req.CardNumber)
	if len(digits) != 16 {
		return response.BadRequest(c, "card number must be exactly 16 digits")
	}
	if len(req.ExpiryDate) != 5 {
		return response.BadRequest(c, "expiry date must be MM/YY format (e.g. 12/27)")
	}
	cvvDigits := onlyDigits(req.CVV)
	if len(cvvDigits) < 3 || len(cvvDigits) > 4 {
		return response.BadRequest(c, "CVV must be 3 or 4 digits")
	}
	if req.HolderName == "" {
		return response.BadRequest(c, "holder_name is required")
	}
	if req.Balance < 0 {
		return response.BadRequest(c, "balance cannot be negative")
	}

	network := domain.CardNetwork(req.Network)
	if network == "" {
		network = domain.CardNetworkVisa
	}
	if network != domain.CardNetworkVisa && network != domain.CardNetworkMastercard && network != domain.CardNetworkAmex {
		return response.BadRequest(c, "network must be visa, mastercard, or amex")
	}

	color := req.Color
	if color == "" {
		defaults := map[domain.CardNetwork]string{
			domain.CardNetworkVisa:       "#1B5E20",
			domain.CardNetworkMastercard: "#E65100",
			domain.CardNetworkAmex:       "#0D47A1",
		}
		color = defaults[network]
	}

	card, err := h.svc.AddCard(c.Context(), service.AddCardInput{
		UserID:     userID,
		CardNumber: digits,
		ExpiryDate: req.ExpiryDate,
		CVV:        cvvDigits,
		HolderName: req.HolderName,
		Network:    network,
		Label:      req.Label,
		Color:      color,
		Balance:    req.Balance,
	})
	if errors.Is(err, domain.ErrInvalidInput) {
		return response.BadRequest(c, err.Error())
	}
	if err != nil {
		return response.InternalError(c)
	}

	return response.Created(c, fiber.Map{"card": card})
}

// AddBalance godoc
// @Summary      Add balance to a card
// @Tags         cards
// @Security     BearerAuth
// @Param        id    path  string  true  "Card ID"
// @Param        body  body  object  true  "Amount to add"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/cards/{id}/balance [put]
func (h *CardHandler) AddBalance(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	cardID := c.Params("id")

	var req struct {
		Amount int64 `json:"amount"`
	}
	if err := c.BodyParser(&req); err != nil {
		return response.BadRequest(c, "invalid request body")
	}
	if req.Amount <= 0 {
		return response.BadRequest(c, "amount must be greater than 0")
	}

	card, err := h.svc.AddCardBalance(c.Context(), cardID, userID, req.Amount)
	if errors.Is(err, domain.ErrCardNotFound) {
		return response.NotFound(c, "card not found")
	}
	if errors.Is(err, domain.ErrCardExpired) {
		return response.BadRequest(c, "card is not active")
	}
	if errors.Is(err, domain.ErrInvalidInput) {
		return response.BadRequest(c, err.Error())
	}
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"card": card})
}

// Delete godoc
// @Summary      Delete a card
// @Tags         cards
// @Security     BearerAuth
// @Param        id  path  string  true  "Card ID"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/cards/{id} [delete]
func (h *CardHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	cardID := c.Params("id")

	if err := h.svc.DeleteCard(c.Context(), cardID, userID); err != nil {
		if errors.Is(err, domain.ErrCardNotFound) {
			return response.NotFound(c, "card not found")
		}
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"success": true})
}

// SetDefault godoc
// @Summary      Set a card as default
// @Tags         cards
// @Security     BearerAuth
// @Param        id  path  string  true  "Card ID"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/cards/{id}/default [put]
func (h *CardHandler) SetDefault(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	cardID := c.Params("id")

	card, err := h.svc.SetDefault(c.Context(), cardID, userID)
	if errors.Is(err, domain.ErrCardNotFound) {
		return response.NotFound(c, "card not found")
	}
	if err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"card": card})
}

func onlyDigits(s string) string {
	result := ""
	for _, r := range s {
		if r >= '0' && r <= '9' {
			result += string(r)
		}
	}
	return result
}
