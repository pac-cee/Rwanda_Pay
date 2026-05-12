# Rwanda Pay 🇷🇼

> **A digital wallet and tap-to-pay solution built for Rwanda** — solving the gap left by Apple Pay and Google Pay not operating in the Rwandan market.

---

## 📁 Project Structure

```
Rwanda-Pay/
├── backend/              # Go REST API server
│   ├── cmd/             # Application entry points
│   ├── internal/        # Private application code
│   ├── pkg/             # Public libraries
│   ├── tests/           # Go tests
│   └── Dockerfile       # Backend container
│
├── frontend/            # React Native mobile app (Expo)
│   ├── app/            # Expo Router screens
│   ├── components/     # Reusable UI components
│   ├── context/        # React Context (state management)
│   ├── hooks/          # Custom React hooks
│   ├── lib/            # API client
│   └── package.json    # Frontend dependencies
│
├── database/           # Database initialization scripts
│   └── init.sql       # PostgreSQL schema
│
├── docs/              # Complete project documentation
│   ├── 01-requirements.md
│   ├── 02-srs.md
│   ├── 03-uml-diagrams.md
│   ├── 04-system-design.md
│   ├── 05-prototype-patterns.md
│   ├── 06-docker.md
│   └── 07-testing.md
│
└── docker-compose.yml  # Docker orchestration
```

---

## 🚀 Quick Start

### Prerequisites

- **Docker & Docker Compose** (for backend)
- **Node.js 24+** and **pnpm** (for frontend)
- **Go 1.21+** (for backend development)
- **Xcode** (for iOS) or **Android Studio** (for Android)

### 1. Start Backend with Docker

```bash
# Start PostgreSQL + Go API
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f backend
```

The API will be available at `http://localhost:8080`

### 2. Run Mobile App

```bash
# Navigate to frontend
cd frontend

# Install dependencies
pnpm install

# Start Expo dev server
pnpm run dev

# Press 'i' for iOS Simulator
# Press 'a' for Android Emulator
# Scan QR code with Expo Go app
```

---

## 🔧 Development

### Backend (Go)

```bash
cd backend

# Install dependencies
go mod download

# Run locally (without Docker)
go run cmd/server/main.go

# Run tests
go test ./...

# Build
go build -o bin/server cmd/server/main.go
```

### Frontend (React Native)

```bash
cd frontend

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Clear cache
pnpm run dev --clear
```

---

## 🧪 Testing

### Backend Tests

```bash
cd backend
go test ./tests/... -v
```

### API Health Check

```bash
curl http://localhost:8080/api/healthz
```

### Create Test User

```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@rwandapay.com",
    "password": "test1234",
    "name": "Test User"
  }'
```

---

## 📱 Mobile App Configuration

Update `frontend/.env` with your backend URL:

```env
# For iOS Simulator / Android Emulator
EXPO_PUBLIC_DOMAIN=localhost:8080

# For physical device (use your machine's IP)
EXPO_PUBLIC_DOMAIN=192.168.x.x:8080
```

To find your IP:
```bash
# macOS/Linux
ipconfig getifaddr en0

# Windows
ipconfig | findstr IPv4
```

---

## 🐳 Docker Commands

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild and start
docker-compose up --build -d

# View logs
docker-compose logs -f backend
docker-compose logs -f db

# Execute commands in containers
docker-compose exec backend sh
docker-compose exec db psql -U rwandapay -d rwandapay
```

---

## 📚 Documentation

| Document | Description |
|---|---|
| [Requirements & Analysis](./docs/01-requirements.md) | Problem statement, functional requirements |
| [Software Requirements Specification](./docs/02-srs.md) | Complete SRS document |
| [UML Diagrams](./docs/03-uml-diagrams.md) | Use case, class, sequence diagrams |
| [System Design](./docs/04-system-design.md) | Architecture, data flow, ERD |
| [Design Patterns](./docs/05-prototype-patterns.md) | Patterns used, coding standards |
| [Docker & VCS](./docs/06-docker.md) | Dockerization, Git workflow |
| [Testing](./docs/07-testing.md) | Test plan and results |

---

## 🏗️ Tech Stack

### Backend
- **Language:** Go 1.21+
- **Framework:** Gin / Chi
- **Database:** PostgreSQL 15
- **ORM:** GORM / sqlx
- **Auth:** JWT + bcrypt
- **Containerization:** Docker

### Frontend
- **Framework:** React Native (Expo 54)
- **Navigation:** Expo Router v6
- **State:** React Context API
- **Animations:** React Native Reanimated 4
- **Biometrics:** expo-local-authentication
- **Language:** TypeScript 5.9

### Database
- **Production:** PostgreSQL 15
- **Schema:** SQL migrations
- **Backup:** Docker volumes

---

## 🌟 Features

| Feature | Description |
|---|---|
| 💳 Digital Wallet | Hold RWF balance, top up from linked cards |
| 📱 Tap-to-Pay | NFC-simulated payment with biometric auth |
| 💸 Send Money | Transfer RWF to any registered user by email |
| 📥 Receive Money | Generate receive request, view incoming transfers |
| 🎴 Card Management | Link Visa, Mastercard, Amex, MTN MoMo cards |
| 📊 Transaction History | Full history with date grouping and filtering |
| 📈 Spending Analytics | Weekly/monthly charts, category breakdown |
| 🔒 Security | JWT auth, bcrypt passwords, biometric gate |

---

## 🔐 Security

- **Password Hashing:** bcrypt with cost factor 10
- **JWT Tokens:** Signed with secret, 7-day expiry
- **Biometric Auth:** Face ID / Fingerprint for payments
- **Input Validation:** All inputs validated and sanitized
- **HTTPS Only:** TLS 1.3 in production

---

## 📝 API Endpoints

Base URL: `http://localhost:8080/api`

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user (protected)

### Wallet
- `GET /wallet` - Get balance (protected)
- `POST /wallet/topup` - Top up wallet (protected)
- `POST /wallet/transfer` - Send money (protected)
- `POST /wallet/pay` - NFC payment (protected)

### Cards
- `GET /cards` - List cards (protected)
- `POST /cards` - Add card (protected)
- `DELETE /cards/:id` - Delete card (protected)

### Transactions
- `GET /transactions` - List transactions (protected)
- `GET /transactions/analytics` - Spending analytics (protected)

---

## 🎓 Academic Information

- **Course:** Best Programming Practices and Design Patterns
- **Course Code:** SENG 8240
- **Instructor:** RUTARINDWA JEAN PIERRE
- **Institution:** Faculty of Information Technology — Software Engineering
- **Student:** Pacifique
- **Academic Year:** 2025/2026

---

## 📄 License

Academic Project - All Rights Reserved

---

## 🤝 Contributing

This is an academic project. For questions or issues, please contact the project maintainer.

---

**Built with ❤️ in Rwanda**
