package router

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/gofiber/swagger"
	"github.com/rwandapay/backend/internal/handler"
	"github.com/rwandapay/backend/internal/middleware"
	"github.com/rwandapay/backend/pkg/jwt"
)

type Handlers struct {
	Auth        *handler.AuthHandler
	Wallet      *handler.WalletHandler
	Card        *handler.CardHandler
	Transaction *handler.TransactionHandler
}

func Setup(app *fiber.App, h Handlers, jwtSvc *jwt.Service) {
	// Global middleware
	app.Use(recover.New())
	app.Use(logger.New(logger.Config{
		Format: "[${time}] ${status} ${method} ${path} ${latency}\n",
	}))
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// Health check (no auth)
	app.Get("/healthz", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok", "service": "rwanda-pay-api"})
	})

	// Swagger UI — http://localhost:8080/docs
	app.Get("/docs/*", swagger.New(swagger.Config{
		URL: "/docs/swagger.json",
	}))
	app.Static("/docs/swagger.json", "./docs/swagger.json")

	// API v1
	v1 := app.Group("/api/v1")

	// Public routes
	auth := v1.Group("/auth")
	auth.Post("/register", h.Auth.Register)
	auth.Post("/login", h.Auth.Login)

	// Protected routes
	protected := v1.Group("", middleware.Auth(jwtSvc))

	// Auth
	protected.Get("/auth/me", h.Auth.Me)
	protected.Put("/auth/profile", h.Auth.UpdateProfile)
	protected.Post("/auth/logout", h.Auth.Logout)

	// Wallet
	wallet := protected.Group("/wallet")
	wallet.Get("/", h.Wallet.GetBalance)
	wallet.Post("/topup", h.Wallet.Topup)
	wallet.Post("/transfer", h.Wallet.Transfer)
	wallet.Post("/pay", h.Wallet.Pay)

	// Cards
	cards := protected.Group("/cards")
	cards.Get("/", h.Card.List)
	cards.Post("/", h.Card.Add)
	cards.Delete("/:id", h.Card.Delete)
	cards.Put("/:id/default", h.Card.SetDefault)
	cards.Put("/:id/balance", h.Card.AddBalance) // add funds to card

	// Transactions
	transactions := protected.Group("/transactions")
	transactions.Get("/", h.Transaction.List)
	transactions.Get("/analytics", h.Transaction.Analytics)
}
