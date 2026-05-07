# Phase 3 — Docker & Version Control

---

## Part A: Dockerizing Rwanda Pay

### 1. What is Docker?

Docker is a platform for packaging applications and all their dependencies into a **container** — a lightweight, isolated, portable unit that runs consistently on any machine regardless of the host operating system or environment.

Without Docker, running Rwanda Pay on a new machine requires:
- Installing Node.js 24 exactly
- Installing pnpm
- Setting environment variables
- Configuring the database
- Running multiple commands in the right order

With Docker, it becomes: `docker-compose up`

### 2. Dockerization Process

The process of Dockerizing Rwanda Pay involves:

**Step 1 — Write a Dockerfile for the API server**
Define the base image (Node.js 24), copy source files, install dependencies, build the TypeScript, and specify the startup command.

**Step 2 — Write a Dockerfile for the database**
Use the official PostgreSQL image with initialization scripts to create the schema on first run.

**Step 3 — Write docker-compose.yml**
Define all services (api, db), their relationships, environment variables, ports, and volumes.

**Step 4 — Configure environment variables**
Move all hardcoded values (`SESSION_SECRET`, `DATABASE_URL`, `PORT`) to a `.env` file read by Docker Compose.

**Step 5 — Test the containerized application**
Run `docker-compose up --build` and verify all services start and communicate correctly.

---

### 3. API Server Dockerfile

```dockerfile
# artifacts/api-server/Dockerfile

# Stage 1: Build
FROM node:24-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace config
COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./
COPY tsconfig.base.json ./
COPY tsconfig.json ./

# Copy shared libraries
COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod

# Copy api-server source
COPY artifacts/api-server ./artifacts/api-server

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Build the api-server
RUN pnpm --filter @workspace/api-server run build

# Stage 2: Production image
FROM node:24-alpine AS production

WORKDIR /app

RUN npm install -g pnpm

COPY pnpm-workspace.yaml ./
COPY pnpm-lock.yaml ./
COPY package.json ./

COPY lib/db ./lib/db
COPY lib/api-zod ./lib/api-zod
COPY artifacts/api-server/package.json ./artifacts/api-server/package.json

# Install production dependencies only
RUN pnpm install --frozen-lockfile --prod

# Copy built output from builder stage
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist

WORKDIR /app/artifacts/api-server

EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
```

---

### 4. docker-compose.yml

```yaml
version: "3.9"

services:
  db:
    image: postgres:15-alpine
    container_name: rwanda_pay_db
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-rwandapay}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-rwandapay_secret}
      POSTGRES_DB: ${POSTGRES_DB:-rwandapay}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-rwandapay}"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build:
      context: .
      dockerfile: artifacts/api-server/Dockerfile
    container_name: rwanda_pay_api
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: production
      PORT: 8080
      DATABASE_URL: postgresql://${POSTGRES_USER:-rwandapay}:${POSTGRES_PASSWORD:-rwandapay_secret}@db:5432/${POSTGRES_DB:-rwandapay}
      SESSION_SECRET: ${SESSION_SECRET:-change_this_in_production}
    ports:
      - "8080:8080"

volumes:
  postgres_data:
```

---

### 5. Environment Variables (.env)

Create a `.env` file at the project root (never commit this to Git):

```env
# Database
POSTGRES_USER=rwandapay
POSTGRES_PASSWORD=your_secure_password_here
POSTGRES_DB=rwandapay

# API Server
SESSION_SECRET=your_jwt_secret_here_min_32_chars
PORT=8080

# Mobile App (set before building Expo)
EXPO_PUBLIC_DOMAIN=your_server_ip_or_domain:8080
```

---

### 6. Running with Docker

```bash
# Build and start all services
docker-compose up --build

# Run in background
docker-compose up --build -d

# Push database schema (first time only)
docker-compose exec api sh -c "cd /app && pnpm --filter @workspace/db run push"

# View logs
docker-compose logs -f api
docker-compose logs -f db

# Stop all services
docker-compose down

# Stop and remove volumes (wipes database)
docker-compose down -v
```

---

### 7. Verifying the Deployment

```bash
# Health check
curl http://localhost:8080/api/healthz
# Expected: { "status": "ok" }

# Register a user
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@rwandapay.com","password":"test1234","name":"Test User"}'
# Expected: 201 { user, wallet, token }
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
.pnpm-store/

# Build outputs
dist/
build/
*.mjs.map

# Environment variables (NEVER commit these)
.env
.env.local
.env.production

# Database files
*.db
*.db-wal
*.db-shm

# Expo
.expo/
*.jks
*.p8
*.p12
*.key
*.mobileprovision

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
```

### 4. Branching Strategy

```
main          ← stable, production-ready code
  └── dev     ← integration branch
        ├── feature/auth        ← authentication module
        ├── feature/wallet      ← wallet operations
        ├── feature/cards       ← card management
        ├── feature/analytics   ← analytics module
        └── fix/splash-screen   ← bug fixes
```

### 5. Commit History (Key Milestones)

```bash
git log --oneline
```

Example commit messages following conventional commits standard:

```
feat: add NFC tap-to-pay simulation with biometric auth
feat: implement wallet transfer with dual transaction records
feat: add spending analytics endpoint with category breakdown
feat: migrate database from PostgreSQL to SQLite for local dev
fix: resolve EXPO_ROUTER_APP_ROOT bundling error in monorepo
fix: correct TOKEN_KEY to remove invalid @ character for SecureStore
chore: add better-sqlite3 to api-server dependencies
docs: add complete Phase 1-4 academic documentation
```

### 6. Key Git Commands Used

```bash
# Stage all changes
git add .

# Commit with message
git commit -m "feat: add wallet top-up endpoint"

# Push to remote
git push origin main

# Create and switch to feature branch
git checkout -b feature/analytics

# Merge feature branch back to dev
git checkout dev
git merge feature/analytics

# View diff of uncommitted changes
git diff

# Revert last commit (keep changes)
git reset --soft HEAD~1
```

### 7. Remote Repository

The project is hosted on GitHub for backup, collaboration, and submission:

```bash
# Add remote origin
git remote add origin https://github.com/username/rwanda-pay.git

# Push with tracking
git push -u origin main
```
