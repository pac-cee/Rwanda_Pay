package response

import "github.com/gofiber/fiber/v2"

type envelope struct {
	Success bool   `json:"success"`
	Data    any    `json:"data,omitempty"`
	Error   string `json:"error,omitempty"`
	Meta    *Meta  `json:"meta,omitempty"`
}

type Meta struct {
	Total  int `json:"total"`
	Limit  int `json:"limit"`
	Offset int `json:"offset"`
}

func OK(c *fiber.Ctx, data any) error {
	return c.Status(fiber.StatusOK).JSON(envelope{Success: true, Data: data})
}

func Created(c *fiber.Ctx, data any) error {
	return c.Status(fiber.StatusCreated).JSON(envelope{Success: true, Data: data})
}

func OKWithMeta(c *fiber.Ctx, data any, meta Meta) error {
	return c.Status(fiber.StatusOK).JSON(envelope{Success: true, Data: data, Meta: &meta})
}

func BadRequest(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusBadRequest).JSON(envelope{Error: msg})
}

func Unauthorized(c *fiber.Ctx) error {
	return c.Status(fiber.StatusUnauthorized).JSON(envelope{Error: "unauthorized"})
}

func Forbidden(c *fiber.Ctx) error {
	return c.Status(fiber.StatusForbidden).JSON(envelope{Error: "forbidden"})
}

func NotFound(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusNotFound).JSON(envelope{Error: msg})
}

func Conflict(c *fiber.Ctx, msg string) error {
	return c.Status(fiber.StatusConflict).JSON(envelope{Error: msg})
}

func InternalError(c *fiber.Ctx) error {
	return c.Status(fiber.StatusInternalServerError).JSON(envelope{Error: "internal server error"})
}
