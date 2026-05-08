package config

import (
	"fmt"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	App      AppConfig
	Database DatabaseConfig
	JWT      JWTConfig
	Crypto   CryptoConfig
}

type AppConfig struct {
	Env  string
	Port string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	Name     string
	User     string
	Password string
	SSLMode  string
	MaxConns int32
	MinConns int32
}

type JWTConfig struct {
	Secret      string
	ExpiryHours int
}

type CryptoConfig struct {
	EncryptionKey string
}

func (d DatabaseConfig) DSN() string {
	return fmt.Sprintf(
		"host=%s port=%s dbname=%s user=%s password=%s sslmode=%s pool_max_conns=%d pool_min_conns=%d",
		d.Host, d.Port, d.Name, d.User, d.Password, d.SSLMode, d.MaxConns, d.MinConns,
	)
}

func Load() (*Config, error) {
	// Load .env file if it exists (ignored in production)
	_ = godotenv.Load()

	maxConns, _ := strconv.Atoi(getEnv("DB_MAX_CONNS", "25"))
	minConns, _ := strconv.Atoi(getEnv("DB_MIN_CONNS", "5"))
	jwtExpiry, _ := strconv.Atoi(getEnv("JWT_EXPIRY_HOURS", "168"))

	cfg := &Config{
		App: AppConfig{
			Env:  getEnv("APP_ENV", "development"),
			Port: getEnv("APP_PORT", "8080"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			Name:     getEnv("DB_NAME", "rwanda_pay"),
			User:     getEnv("DB_USER", "admin"),
			Password: getEnv("DB_PASSWORD", "admin"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
			MaxConns: int32(maxConns),
			MinConns: int32(minConns),
		},
		JWT: JWTConfig{
			Secret:      mustEnv("JWT_SECRET"),
			ExpiryHours: jwtExpiry,
		},
		Crypto: CryptoConfig{
			EncryptionKey: mustEnv("ENCRYPTION_KEY"),
		},
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %s is not set", key))
	}
	return v
}
