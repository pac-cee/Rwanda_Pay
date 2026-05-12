package handler

import (
	"log"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/response"
)

type NotificationHandler struct {
	svc *service.NotificationService
}

func NewNotificationHandler(svc *service.NotificationService) *NotificationHandler {
	return &NotificationHandler{svc: svc}
}

// List godoc
// @Summary      List user notifications
// @Tags         notifications
// @Security     BearerAuth
// @Param        limit   query  int  false  "Max records (default 20)"
// @Param        offset  query  int  false  "Pagination offset"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/notifications [get]
func (h *NotificationHandler) List(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	limit, _ := strconv.Atoi(c.Query("limit", "20"))
	offset, _ := strconv.Atoi(c.Query("offset", "0"))

	notifs, total, err := h.svc.List(c.Context(), userID, limit, offset)
	if err != nil {
		log.Printf("[ERROR] List notifications: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{
		"notifications": notifs,
		"total":         total,
		"limit":         limit,
		"offset":        offset,
	})
}

// GetUnreadCount godoc
// @Summary      Get unread notification count
// @Tags         notifications
// @Security     BearerAuth
// @Success      200  {object}  response.envelope
// @Router       /api/v1/notifications/unread-count [get]
func (h *NotificationHandler) GetUnreadCount(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	count, err := h.svc.GetUnreadCount(c.Context(), userID)
	if err != nil {
		log.Printf("[ERROR] GetUnreadCount: %v", err)
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"count": count})
}

// MarkAsRead godoc
// @Summary      Mark notification as read
// @Tags         notifications
// @Security     BearerAuth
// @Param        id  path  string  true  "Notification ID"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/notifications/{id}/read [put]
func (h *NotificationHandler) MarkAsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	notifID := c.Params("id")

	if err := h.svc.MarkAsRead(c.Context(), notifID, userID); err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"success": true})
}

// MarkAllAsRead godoc
// @Summary      Mark all notifications as read
// @Tags         notifications
// @Security     BearerAuth
// @Success      200  {object}  response.envelope
// @Router       /api/v1/notifications/read-all [put]
func (h *NotificationHandler) MarkAllAsRead(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)

	if err := h.svc.MarkAllAsRead(c.Context(), userID); err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"success": true})
}

// Delete godoc
// @Summary      Delete notification
// @Tags         notifications
// @Security     BearerAuth
// @Param        id  path  string  true  "Notification ID"
// @Success      200  {object}  response.envelope
// @Router       /api/v1/notifications/{id} [delete]
func (h *NotificationHandler) Delete(c *fiber.Ctx) error {
	userID := c.Locals("userID").(string)
	notifID := c.Params("id")

	if err := h.svc.Delete(c.Context(), notifID, userID); err != nil {
		return response.InternalError(c)
	}

	return response.OK(c, fiber.Map{"success": true})
}
