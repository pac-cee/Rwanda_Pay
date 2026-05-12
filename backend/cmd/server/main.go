package main

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/rwandapay/backend/internal/config"
	"github.com/rwandapay/backend/internal/database"
	"github.com/rwandapay/backend/internal/handler"
	"github.com/rwandapay/backend/internal/middleware"
	"github.com/rwandapay/backend/internal/repository"
	"github.com/rwandapay/backend/internal/router"
	"github.com/rwandapay/backend/internal/service"
	"github.com/rwandapay/backend/pkg/crypto"
	"github.com/rwandapay/backend/pkg/jwt"
)

func main() {
	// Load config
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	// Connect to PostgreSQL
	db, err := database.NewPool(cfg.Database)
	if err != nil {
		log.Fatalf("connect to database: %v", err)
	}
	defer db.Close()
	log.Printf("connected to PostgreSQL (env=%s port=%s)", cfg.App.Env, cfg.App.Port)

	// Packages
	jwtSvc := jwt.NewService(cfg.JWT.Secret, cfg.JWT.ExpiryHours)
	cryptoSvc, err := crypto.NewService(cfg.Crypto.EncryptionKey)
	if err != nil {
		log.Fatalf("init crypto: %v", err)
	}

	// Repositories
	userRepo := repository.NewUserRepository(db)
	walletRepo := repository.NewWalletRepository(db) // returns WalletTxRepository
	cardRepo := repository.NewCardRepository(db)
	merchantRepo := repository.NewMerchantRepository(db)
	userMerchantRepo := repository.NewUserMerchantRepository(db)
	txRepo := repository.NewTransactionRepository(db)
	notifRepo := repository.NewNotificationRepository(db)
	logRepo := repository.NewActivityLogRepository(db)

	// Services
	notifSvc := service.NewNotificationService(notifRepo)
	authSvc := service.NewAuthService(userRepo, walletRepo, jwtSvc)
	walletSvc := service.NewWalletService(walletRepo, cardRepo, userRepo, merchantRepo, userMerchantRepo, txRepo, notifSvc)
	cardSvc := service.NewCardService(cardRepo, cryptoSvc)
	txSvc := service.NewTransactionService(txRepo, userRepo)

	// Handlers
	handlers := router.Handlers{
		Auth:         handler.NewAuthHandler(authSvc),
		Wallet:       handler.NewWalletHandler(walletSvc),
		Card:         handler.NewCardHandler(cardSvc),
		Transaction:  handler.NewTransactionHandler(txSvc),
		Notification: handler.NewNotificationHandler(notifSvc),
		Admin:        handler.NewAdminHandler(userRepo, txRepo, merchantRepo, logRepo),
	}

	// Fiber app
	app := fiber.New(fiber.Config{
		AppName:      "Rwanda Pay API v1",
		ErrorHandler: errorHandler,
	})

	// Global activity logging
	app.Use(middleware.ActivityLogger(logRepo))

	router.Setup(app, handlers, jwtSvc)

	log.Printf("Rwanda Pay API starting on :%s", cfg.App.Port)
	if err := app.Listen(":" + cfg.App.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func errorHandler(c *fiber.Ctx, err error) error {
	code := fiber.StatusInternalServerError
	if e, ok := err.(*fiber.Error); ok {
		code = e.Code
	}
	return c.Status(code).JSON(fiber.Map{
		"success": false,
		"error":   err.Error(),
	})
}
