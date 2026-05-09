# Phase 3 — Docker & Version Control

---

## Part A: Dockerizing Rwanda Pay

### 1. What is Docker?

Docker is a platform for packaging applications and all their dependencies into a **container** — a lightweight, isolated, portable unit that runs consistently on any machine regardless of the host operating system or environment.

Without Docker, running Rwanda Pay on a new machine requires:
- Installing Go 1.22 exactly
- Installing PostgreSQL 16
- Setting environment variables
- Running the database schema manually
- Running multiple commands in the right order

With Docker, it becomes: `docker-compose up --build`

### 2. Dockerization Process

**Step 1 — Write a Dockerfile for the API server**
Use a multi-stage build: first stage compiles the Go binary, second stage creates a minimal Alpine image with just the binary. This keeps the production image small (~15MB vs ~1GB for a full Go image).

**Step 2 — Write docker-compose.yml**
Define all services (api, db), their relationships, environment variables, ports, volumes, and health checks.

**Step 3 — Configure environment variables**
Move all hardcoded values (`JWT_SECRET`, `ENCRYPTION_KEY`, database credentials) to a `.env` file read by Docker Compose.

**Step 4 — Mount the database init script**
The `database/init.sql` file is mounted into the PostgreSQL container's `docker-entrypoint-initdb.d/` directory. PostgreSQL automatically runs it on first start, creating all tables, indexes, triggers, and seed merchants.

**Step 5 — Test the containerized application**
Run `docker-compose up --build` and verify all services start and communicate correctly.

---

### 3. API Server Dockerfile

```dockerfile
# backend/Dockerfile

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

# Build the binary — CGO disabled for static binary
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
```

**Why multi-stage?**
- Stage 1 (builder) has the full Go toolchain (~800MB)
- Stage 2 (production) has only the compiled binary + Alpine (~15MB)
- The final image is 50x smaller, faster to pull, and has a smaller attack surface

---

### 4. docker-compose.yml

```yaml
version: "3.9"

services:

  # PostgreSQL Database
  db:
    image: postgres:16-alpine
    container_name: rwanda_pay_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-rwandapay}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-rwandapay_secret}
      POSTGRES_DB: ${POSTGRES_DB:-rwanda_pay}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      # Auto-run init.sql on first start
      - ./database/init.sql:/docker-entrypoint-initdb.d/01-init.sql:ro
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-rwandapay}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Go/Fiber API Server
  api:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rwanda_pay_api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy  # wait for DB to be ready
    environment:
      APP_ENV: production
      APP_PORT: 8080
      DB_HOST: db          # Docker service name, not localhost
      DB_PORT: 5432
      DB_NAME: ${POSTGRES_DB:-rwanda_pay}
      DB_USER: ${POSTGRES_USER:-rwandapay}
      DB_PASSWORD: ${POSTGRES_PASSWORD:-rwandapay_secret}
      DB_SSLMODE: disable
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    ports:
      - "8080:8080"

volumes:
  postgres_data:
    driver: local
```

---

### 5. Environment Variables (.env)

Create a `.env` file at the project root (never commit this to Git):

```env
# Database
POSTGRES_USER=rwandapay
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=rwanda_pay

# API Server
JWT_SECRET=your_jwt_secret_here_min_32_chars
ENCRYPTION_KEY=6368616e676520746869732070617373776f726420746f206120736563726574

# Mobile App (set to your machine's IP when testing on physical device)
EXPO_PUBLIC_DOMAIN=192.168.1.10:8080
```

---

### 6. Running with Docker

```bash
# Build and start all services (first time)
docker-compose up --build

# Run in background
docker-compose up --build -d

# View API logs
docker-compose logs -f api

# View database logs
docker-compose logs -f db

# Stop all services
docker-compose down

# Stop and remove volumes (wipes database — fresh start)
docker-compose down -v

# Rebuild only the API (after code changes)
docker-compose up --build api
```

---

### 7. Verifying the Deployment

```bash
# Health check
curl http://localhost:8080/healthz
# Expected: { "status": "ok", "service": "rwanda-pay-api" }

# Register a user
curl -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@rwandapay.com","password":"test1234","name":"Test User"}'
# Expected: 201 { "data": { "user": {...}, "wallet": {"balance": 0}, "token": "..." } }

# Login
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@rwandapay.com","password":"test1234"}'
# Expected: 200 { "data": { "user": {...}, "wallet": {...}, "token": "..." } }
```

---

## Part B: Version Control with Git

### 1. What is a Version Control System?

A Version Control System (VCS) tracks every change made to source code over time. It allows:
- Multiple developers to collaborate without overwriting each other's work
- Reverting to any previous state of the codebase
- Branching to develop features in isolation
- A complete audit trail of who changed what and when

Rwanda Pay uses **Git** — the most widely used distributed VCS.

### 2. Git Setup

```bash
# Initialize repository (already done)
git init

# Configure identity
git config --global user.name "Pacifique"
git config --global user.email "your.email@example.com"

# Check status
git status

# View commit history
git log --oneline --graph
```

### 3. .gitignore Configuration

The `.gitignore` file ensures sensitive and generated files are never committed:

```gitignore
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
*.exe

# Environment variables (NEVER commit these)
.env
.env.local
.env.production

# Go test cache
*.test
*.out

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Expo
.expo/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
```

### 4. Branching Strategy

```
main          ← stable, production-ready code
  └── dev     ← integration branch
        ├── feature/auth              ← authentication module
        ├── feature/wallet-atomic     ← atomic wallet transactions
        ├── feature/card-encryption   ← AES-256-GCM card encryption
        ├── feature/analytics         ← analytics module
        └── fix/api-path-prefix       ← bug fixes
```

### 5. Key Git Commands Used

```bash
# Stage all changes
git add .

# Commit with message (conventional commits format)
git commit -m "feat: add atomic wallet transactions with SELECT FOR UPDATE"

# Push to remote
git push origin main

# Create and switch to feature branch
git checkout -b feature/wallet-atomic

# Merge feature branch back to dev
git checkout dev
git merge feature/wallet-atomic

# View diff of uncommitted changes
git diff

# View commit history
git log --oneline --graph --all
```

### 6. Commit History (Key Milestones)

```
feat: add atomic wallet transactions with SELECT FOR UPDATE row-level locking
feat: add AES-256-GCM encryption for card numbers and CVV
feat: add transaction ledger endpoint for contact-to-contact history
feat: add comprehensive unit tests — 62 tests all passing
feat: add Docker multi-stage build and docker-compose setup
fix: correct API base URL from /api/ to /api/v1/ in mobile client
fix: add WalletTxRepository interface for testable atomic operations
docs: update all documentation to reflect Go/Fiber backend
chore: add .env.example with all required environment variables
```

### 7. Remote Repository

The project is hosted on GitHub for backup, collaboration, and submission:

```bash
# Add remote origin
git remote add origin https://github.com/username/rwanda-pay.git

# Push with tracking
git push -u origin main
```
