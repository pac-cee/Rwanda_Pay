# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go module files first for layer caching
COPY go.mod go.sum ./
RUN go mod download

# Copy source code
COPY . .

# Build the binary
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /app/server ./cmd/server

# ── Stage 2: Production image ─────────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# Install CA certificates for HTTPS calls
RUN apk add --no-cache ca-certificates tzdata

# Copy binary from builder
COPY --from=builder /app/server .

# Copy swagger docs
COPY --from=builder /app/docs ./docs

EXPOSE 8080

CMD ["./server"]
