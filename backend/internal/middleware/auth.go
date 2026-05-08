package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/pkg/jwt"
	"github.com/rwandapay/backend/pkg/response"
)

func Auth(jwtSvc *jwt.Service) fiber.Handler {
	return func(c *fiber.Ctx) error {
		auth := c.Get("Authorization")
		if !strings.HasPrefix(auth, "Bearer ") {
			return response.Unauthorized(c)
		}

		token := strings.TrimPrefix(auth, "Bearer ")
		claims, err := jwtSvc.Verify(token)
		if err != nil {
			return response.Unauthorized(c)
		}

		c.Locals("userID", claims.UserID)
		c.Locals("email", claims.Email)
		return c.Next()
	}
}
