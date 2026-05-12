package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/pkg/response"
)

func AdminAuth() fiber.Handler {
	return func(c *fiber.Ctx) error {
		email := c.Locals("email")
		if email == nil {
			return response.Unauthorized(c)
		}

		// Simple admin check - only admin@rwandapay.com
		if email.(string) != "admin@rwandapay.com" {
			return response.Forbidden(c, "Admin access required")
		}

		return c.Next()
	}
}
