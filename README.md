# Rwanda Pay 🇷🇼

> **A digital wallet and tap-to-pay solution built for Rwanda** — solving the gap left by Apple Pay and Google Pay not operating in the Rwandan market.

---

## The Problem

In Rwanda, contactless payment services like **Apple Pay** and **Google Pay** are not available. Rwandans rely on cash, manual mobile money transfers (MTN MoMo, Airtel Money), or physical card swipes — all of which are slow, require network USSD menus, or depend on merchant POS hardware.

There is no unified, smartphone-native wallet that lets a Rwandan user:
- Hold a digital balance in RWF
- Link multiple bank cards and mobile money accounts
- Tap to pay at a merchant instantly
- Send money to another person by email in seconds
- Track spending with analytics

**Rwanda Pay** is that solution.

---

## What It Does

| Feature | Description |
|---|---|
| Digital Wallet | Hold RWF balance, top up from linked cards |
| Tap-to-Pay | NFC-simulated payment with biometric (Face ID / fingerprint) auth |
| Send Money | Transfer RWF to any registered user by email |
| Receive Money | Generate receive request, view incoming transfers |
| Card Management | Link Visa, Mastercard, Amex, MTN MoMo cards |
| Transaction History | Full history with date grouping and type filtering |
| Spending Analytics | Weekly/monthly charts, category breakdown |
| Demo Account | One-tap demo with seeded data — no signup needed |
| Security | JWT auth, bcrypt passwords, biometric payment gate |

---

## Tech Stack

### Mobile App (`artifacts/rwanda-pay`)
| Layer | Technology |
|---|---|
| Framework | Expo 54 + React Native 0.81 |
| Navigation | Expo Router v6 (file-based) |
| State | React Context (AuthContext, WalletContext) |
| Data Fetching | TanStack React Query |
| Animations | React Native Reanimated 4 |
| Token Storage | expo-secure-store |
| Local Persistence | AsyncStorage |
| Biometrics | expo-local-authentication |
| UI | Custom components, Inter font, React Native SVG |
| Language | TypeScript 5.9 |

### Backend (`artifacts/api-server`)
| Layer | Technology |
|---|---|
| Runtime | Node.js 24 |
| Framework | Express 5 |
| Database | SQLite via better-sqlite3 (dev) / PostgreSQL (prod) |
| ORM | Drizzle ORM |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Validation | Zod |
| Logging | Pino + pino-http |
| Build | esbuild (ESM bundle) |
| Language | TypeScript 5.9 |

### Monorepo
| Tool | Purpose |
|---|---|
| pnpm workspaces | Package management |
| `@workspace/db` | Shared Drizzle schema + Zod validators |
| `@workspace/api-zod` | Generated Zod types from OpenAPI spec |
| `@workspace/api-client-react` | Generated React Query hooks |

---

## Project Structure

```
Rwanda-Pay/
├── artifacts/
│   ├── rwanda-pay/          # Expo mobile app
│   │   ├── app/             # Expo Router screens
│   │   │   ├── (tabs)/      # Bottom tab screens
│   │   │   ├── auth.tsx     # Login / Register
│   │   │   ├── topup.tsx    # Top-up modal
│   │   │   ├── send.tsx     # Send money modal
│   │   │   └── receive.tsx  # Receive modal
│   │   ├── components/      # Reusable UI components
│   │   ├── context/         # AuthContext, WalletContext
│   │   ├── hooks/           # useColors, custom hooks
│   │   └── lib/             # api.ts (HTTP client)
│   └── api-server/          # Express REST API
│       └── src/
│           ├── routes/      # auth, wallet, cards, transactions
│           ├── middlewares/  # requireAuth
│           └── lib/         # jwt, logger
├── lib/
│   ├── db/                  # Drizzle schema (users, wallets, cards, transactions)
│   ├── api-spec/            # OpenAPI YAML
│   ├── api-zod/             # Generated Zod types
│   └── api-client-react/    # Generated React Query hooks
├── docs/                    # Full project documentation
└── docker-compose.yml       # Docker setup
```

---

## API Endpoints

Base URL: `http://localhost:8080/api`

All protected routes require: `Authorization: Bearer <token>`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register, creates wallet + 3 seed cards |
| POST | `/auth/login` | — | Login, returns JWT |
| GET | `/auth/me` | ✓ | Current user + balance |
| PUT | `/auth/profile` | ✓ | Update name/phone |
| POST | `/auth/logout` | ✓ | Logout |
| GET | `/wallet` | ✓ | Get balance |
| POST | `/wallet/topup` | ✓ | Top up from card |
| POST | `/wallet/transfer` | ✓ | Send to another user |
| POST | `/wallet/pay` | ✓ | NFC payment |
| GET | `/cards` | ✓ | List cards |
| POST | `/cards` | ✓ | Add card |
| DELETE | `/cards/:id` | ✓ | Delete card |
| PUT | `/cards/:id/default` | ✓ | Set default card |
| GET | `/transactions` | ✓ | List (paginated + filtered) |
| GET | `/transactions/analytics` | ✓ | Spending analytics |
| GET | `/healthz` | — | Health check |

---

## Running Locally

### Prerequisites
- Node.js 24+
- pnpm (`npm install -g pnpm`)

### 1. Install dependencies
```bash
pnpm install
pnpm approve-builds   # approve better-sqlite3 native build
```

### 2. Push database schema
```bash
pnpm --filter @workspace/db run push
```

### 3. Start the API server (Terminal 1)
```bash
pnpm --filter @workspace/api-server run dev
# Runs on http://localhost:8080
```

### 4. Create a demo account
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"demo@rwandapay.com","password":"demo1234","name":"Demo User"}'
```

### 5. Start the mobile app (Terminal 2)
```bash
pnpm --filter @workspace/rwanda-pay run dev
# Press i for iOS Simulator, a for Android, scan QR for Expo Go
```

---

## Running with Docker

```bash
docker-compose up --build
```

See [docs/06-docker.md](./docs/06-docker.md) for full details.

---

## Documentation

| Document | Description |
|---|---|
| [Phase 1 — Requirements & Analysis](./docs/01-requirements.md) | Problem statement, functional & non-functional requirements |
| [Phase 1 — SRS](./docs/02-srs.md) | Full Software Requirements Specification |
| [Phase 1 — UML Diagrams](./docs/03-uml-diagrams.md) | Use case, class, activity, sequence, component diagrams |
| [Phase 1 — System Design](./docs/04-system-design.md) | Architecture, data flow, ERD, deployment |
| [Phase 2 — Prototype & Design Patterns](./docs/05-prototype-patterns.md) | Design patterns used, coding standards |
| [Phase 3 — Docker & Version Control](./docs/06-docker.md) | Dockerization process, Git VCS setup |
| [Phase 4 — Test Plan](./docs/07-testing.md) | Full software test plan |

---

## Design Patterns Used

| Pattern | Where Applied |
|---|---|
| **Repository Pattern** | `lib/db` — all DB access abstracted behind Drizzle schema |
| **Context / Provider Pattern** | `AuthContext`, `WalletContext` — global state without prop drilling |
| **Middleware Pattern** | `requireAuth` — Express middleware chain for JWT validation |
| **Strategy Pattern** | Payment flow — biometric auth strategy swappable per platform |
| **Observer Pattern** | React Query — components re-render on data change automatically |
| **Factory Pattern** | Seed data creation on registration — factory builds user + wallet + cards + transactions |

---

## Academic Information

- **Course:** Best Programming Practices and Design Patterns
- **Instructor:** RUTARINDWA JEAN PIERRE
- **Institution:** Faculty of Information Technology — Software Engineering
- **Student:** Pacifique (Rwanda Pay)

---

## Version Control

This project uses **Git** for version control.

```bash
git log --oneline   # view commit history
git status          # check current changes
```
