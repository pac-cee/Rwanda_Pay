package middleware

import (
	"context"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
	"github.com/rwandapay/backend/internal/domain"
	"github.com/rwandapay/backend/internal/repository"
)

func ActivityLogger(logRepo repository.ActivityLogRepository) fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()

		// Process request
		err := c.Next()

		// Calculate duration
		duration := time.Since(start).Milliseconds()

		// Get user ID from context if authenticated
		var userID *string
		if uid := c.Locals("userID"); uid != nil {
			if uidStr, ok := uid.(string); ok {
				userID = &uidStr
			}
		}

		// Create activity log
		log := &domain.ActivityLog{
			ID:         uuid.New().String(),
			UserID:     userID,
			Action:     c.Method() + " " + c.Path(),
			IPAddress:  c.IP(),
			UserAgent:  c.Get("User-Agent"),
			DurationMs: int(duration),
			StatusCode: c.Response().StatusCode(),
			CreatedAt:  time.Now(),
		}

		// Log asynchronously with a background context
		go func() {
			ctx := context.Background()
			_ = logRepo.Create(ctx, log)
		}()

		return err
	}
}
