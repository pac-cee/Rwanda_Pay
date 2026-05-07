# Phase 1 — Software Requirements Specification (SRS)

**Document Version:** 1.0
**Project:** Rwanda Pay — Digital Wallet & Tap-to-Pay Mobile Application
**Author:** Pacifique
**Course:** Best Programming Practices and Design Patterns
**Institution:** Faculty of Information Technology — Software Engineering

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for Rwanda Pay. It serves as the authoritative reference for development, testing, and evaluation of the system. It is intended for developers, testers, academic reviewers, and any future contributors to the project.

### 1.2 Scope

Rwanda Pay is a full-stack mobile fintech application consisting of:

- **Mobile Application** — A React Native / Expo app for iOS and Android that provides a digital wallet, NFC-simulated tap-to-pay, peer-to-peer transfers, card management, transaction history, and spending analytics
- **REST API Server** — A Node.js / Express 5 backend that handles all business logic, authentication, and database operations
- **Database** — SQLite (development) / PostgreSQL (production) managed via Drizzle ORM
- **Shared Libraries** — pnpm workspace packages for database schema, Zod validators, and generated API types

The system does not integrate with real NFC hardware, real payment gateways, or real banking APIs in v1.0. All financial operations are simulated within the Rwanda Pay ecosystem.

### 1.3 Definitions and Abbreviations

| Term | Definition |
|---|---|
| RWF | Rwandan Franc — the only supported currency in Rwanda Pay |
| JWT | JSON Web Token — a signed, stateless authentication token |
| NFC | Near Field Communication — the technology behind tap-to-pay; simulated in this app |
| Wallet | A single RWF balance account associated with one user |
| Card | A linked payment card (Visa, Mastercard, Amex, or MTN MoMo) |
| Transaction | Any financial event: top-up, send, receive, or payment |
| Seed Data | Pre-populated data created automatically on user registration |
| ORM | Object-Relational Mapper — Drizzle ORM abstracts SQL queries |
| Zod | A TypeScript-first schema validation library |
| pnpm | A fast, disk-efficient Node.js package manager |
| Expo | A framework and platform for universal React Native applications |
| bcrypt | A password hashing algorithm with configurable cost factor |

### 1.4 References

- [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
- [Expo Documentation](https://docs.expo.dev)
- [Drizzle ORM Documentation](https://orm.drizzle.team)
- [Express 5 Documentation](https://expressjs.com)
- [National Bank of Rwanda — Digital Finance Policy](https://www.bnr.rw)

---

## 2. Overall Description

### 2.1 Product Perspective

Rwanda Pay is a standalone mobile fintech application. It does not depend on any third-party payment gateway, banking API, or external financial service in v1.0. All operations are self-contained within the Rwanda Pay backend.

The system is designed to be the foundation for a production-ready payment platform. The architecture — monorepo, shared types, REST API, mobile app — mirrors what a real fintech startup would build.

### 2.2 Product Functions Summary

| Module | Core Functions |
|---|---|
| Authentication | Register, Login, Demo login, Session restore, Profile update, Logout |
| Wallet | View balance, Top-up from card, Transfer to user, NFC tap-to-pay |
| Cards | List cards, Add card, Delete card, Set default card |
| Transactions | List with pagination and filtering, Date grouping, Analytics |
| Settings | Hide/show balance, Face ID toggle, Notifications toggle, Sign out |

### 2.3 User Classes and Characteristics

| User Class | Description | Access Level |
|---|---|---|
| Guest | Not authenticated — has just opened the app | Auth screens only |
| Registered User | Has created an account with email and password | Full access to all features |
| Demo User | Uses the auto-created demo account | Full access, pre-seeded data |

### 2.4 Operating Environment

| Component | Environment |
|---|---|
| Mobile App | iOS 14+ and Android 10+ via Expo Go or standalone build |
| API Server | Node.js 24, Express 5, port 8080 |
| Database (dev) | SQLite via better-sqlite3 |
| Database (prod) | PostgreSQL 15+ |
| Package Manager | pnpm 10+ |
| Build Tool | esbuild (ESM bundle for API server) |

### 2.5 Design and Implementation Constraints

- All monetary values must be stored as integers (RWF has no decimal subdivision in practice)
- JWT tokens must be signed with the `SESSION_SECRET` environment variable
- The `DATABASE_URL` environment variable controls which database is used
- pnpm is enforced — the `preinstall` script rejects npm and yarn
- The mobile app communicates with the API exclusively via `EXPO_PUBLIC_DOMAIN`

---

## 3. System Features

### 3.1 User Registration

**Priority:** Critical

**Description:** A new user creates an account. The system creates the user record, wallet, seed cards, and seed transactions atomically.

**Stimulus:** User submits the registration form with email, password, name, and optional phone.

**Response:**
- System validates input with Zod `registerSchema`
- System checks email uniqueness
- System hashes password with bcrypt (rounds=10)
- System inserts user record with generated initials
- System creates wallet with 50,000 RWF welcome balance
- System inserts 3 seed cards: Bank of Kigali (Visa), MTN MoMo (Mastercard), I&M Bank (Mastercard)
- System inserts 5 seed transactions for a realistic initial state
- System signs and returns JWT + user object + wallet balance

**Output:** `{ user: PublicUser, wallet: { balance: 50000 }, token: string }`

**Error Responses:**
| Condition | HTTP Status | Response |
|---|---|---|
| Invalid input | 400 | `{ error: "Invalid input", details: {...} }` |
| Email already registered | 409 | `{ error: "Email already registered" }` |
| Server error | 500 | `{ error: "Registration failed" }` |

---

### 3.2 User Login

**Priority:** Critical

**Stimulus:** User submits login form with email and password.

**Response:**
- Validate with Zod `loginSchema`
- Fetch user by email
- Compare password with bcrypt
- Fetch wallet balance
- Sign and return JWT

**Output:** `{ user: PublicUser, wallet: { balance: number }, token: string }`

**Error Responses:**
| Condition | HTTP Status | Response |
|---|---|---|
| Invalid input | 400 | `{ error: "Invalid input" }` |
| Wrong credentials | 401 | `{ error: "Invalid email or password" }` |
| Server error | 500 | `{ error: "Login failed" }` |

---

### 3.3 Session Restore

**Priority:** Critical

**Description:** On every app launch, the app checks for a stored JWT and restores the session without requiring the user to log in again.

**Flow:**
1. App calls `getToken()` from expo-secure-store
2. If token exists: call `GET /api/auth/me` with Bearer token
3. If `/me` returns 200: set user and balance, navigate to Home
4. If `/me` returns 401: clear token, navigate to Auth screen
5. If no token: navigate to Auth screen directly

---

### 3.4 Wallet Top-Up

**Priority:** High

**Stimulus:** User selects a card and enters an amount on the Top-Up screen.

**Validation:**
- `cardId` must be a valid UUID belonging to the authenticated user
- `amount` must be an integer between 500 and 5,000,000

**Processing:**
1. Verify card belongs to authenticated user
2. Add amount to wallet balance
3. Create `topup` transaction record

**Output:** `{ transaction: Transaction, balance: number }`

---

### 3.5 Wallet Transfer (Send Money)

**Priority:** High

**Stimulus:** User enters recipient email, amount, and description on the Send screen.

**Validation:**
- `recipientEmail` must be a valid email format
- `amount` must be an integer ≥ 100
- `description` must be at least 1 character

**Processing:**
1. Reject if sender email equals recipient email
2. Check sender wallet balance ≥ amount
3. Look up recipient by email — return 404 if not found
4. Deduct amount from sender wallet
5. Credit amount to recipient wallet (create wallet if recipient has none)
6. Create `send` transaction for sender
7. Create `receive` transaction for recipient

**Output:** `{ transaction: Transaction, balance: number }`

**Error Responses:**
| Condition | HTTP Status | Response |
|---|---|---|
| Self-transfer | 400 | `{ error: "Cannot transfer to yourself" }` |
| Insufficient balance | 400 | `{ error: "Insufficient balance" }` |
| Recipient not found | 404 | `{ error: "Recipient not found" }` |

---

### 3.6 NFC Tap-to-Pay

**Priority:** High

**Description:** Simulates the Apple Pay / Google Pay tap-to-pay experience with biometric authentication.

**Mobile Flow:**
1. User enters merchant name, amount, and category (optional)
2. User taps "Start Scanning" — app enters `scanning` state with animation
3. After 2,500ms: app enters `terminal_found` state — haptic feedback
4. User taps "Authenticate & Pay"
5. `expo-local-authentication` triggers Face ID or fingerprint prompt
6. On biometric success: app calls `POST /api/wallet/pay`
7. On API success: app enters `success` state with animation and haptics
8. After 3,000ms: app resets to idle state

**API Processing:**
1. Check wallet balance ≥ amount
2. Deduct amount from wallet
3. Create `payment` transaction with category

**Output:** `{ transaction: Transaction, balance: number }`

---

### 3.7 Card Management

**Priority:** Medium

**Add Card:**
- Input: last4 (exactly 4 chars), cardType (visa/mastercard/amex), holderName, optional cardName and color
- Output: `{ card: Card }`

**Delete Card:**
- Input: card ID in URL path
- Validates card belongs to authenticated user
- Output: `{ success: true }`

**Set Default Card:**
- Input: card ID in URL path
- Sets target card `isDefault = true`, all other user cards `isDefault = false`
- Output: `{ card: Card }`

---

### 3.8 Transaction History

**Priority:** High

**Query Parameters:**
- `limit` — number of records (default 20, max 100)
- `offset` — pagination offset (default 0)
- `type` — filter by type: topup, send, receive, payment

**Output:** `{ transactions: Transaction[], total: number }`

**Mobile Display:**
- Transactions grouped by date: "Today", "Yesterday", or formatted date
- Color-coded amounts: green for incoming (topup, receive), red for outgoing (send, payment)
- Category icons for payment transactions

---

### 3.9 Spending Analytics

**Priority:** Medium

**Query Parameters:**
- `period` — number of days to analyze (default 30)

**Processing:**
1. Fetch all transactions for user within the period
2. Compute `totalIn` = sum of topup + receive amounts
3. Compute `totalOut` = sum of send + payment amounts
4. Build `byCategory` map — outgoing transactions only, grouped by category
5. Build `monthly` array — in/out totals per calendar month

**Output:** `{ byCategory: Record<string, number>, monthly: Array<{month, in, out}>, totalIn: number, totalOut: number, days: number }`

---

## 4. External Interface Requirements

### 4.1 REST API Interface

**Base URL:** `http://localhost:8080/api` (development)

**Authentication:** All protected endpoints require `Authorization: Bearer <jwt>` header

| Method | Path | Auth | Description | Response |
|---|---|---|---|---|
| POST | `/auth/register` | — | Register new user | 201 `{ user, wallet, token }` |
| POST | `/auth/login` | — | Login | 200 `{ user, wallet, token }` |
| GET | `/auth/me` | ✓ | Get current user + balance | 200 `{ user, wallet }` |
| PUT | `/auth/profile` | ✓ | Update name/phone | 200 `{ user }` |
| POST | `/auth/logout` | ✓ | Logout | 200 `{ success: true }` |
| GET | `/wallet` | ✓ | Get wallet balance | 200 `{ balance }` |
| POST | `/wallet/topup` | ✓ | Top up from card | 200 `{ transaction, balance }` |
| POST | `/wallet/transfer` | ✓ | Send to another user | 200 `{ transaction, balance }` |
| POST | `/wallet/pay` | ✓ | NFC payment | 200 `{ transaction, balance }` |
| GET | `/cards` | ✓ | List user's cards | 200 `{ cards }` |
| POST | `/cards` | ✓ | Add new card | 201 `{ card }` |
| DELETE | `/cards/:id` | ✓ | Delete card | 200 `{ success: true }` |
| PUT | `/cards/:id/default` | ✓ | Set default card | 200 `{ card }` |
| GET | `/transactions` | ✓ | List transactions | 200 `{ transactions, total }` |
| GET | `/transactions/analytics` | ✓ | Spending analytics | 200 `{ byCategory, monthly, totalIn, totalOut, days }` |
| GET | `/healthz` | — | Health check | 200 `{ status: "ok" }` |

### 4.2 Mobile Local Storage Interface

| Key | Storage Engine | Data Type | Purpose |
|---|---|---|---|
| `rp_token` | expo-secure-store | String | JWT Bearer token |
| `@rp_selected_card` | AsyncStorage | String (UUID) | Currently selected card ID |
| `@rp_hide_balance` | AsyncStorage | Boolean string | Balance visibility preference |
| `@rp_profile` | AsyncStorage | JSON string | Cached profile data |
| `@rp_notifications` | AsyncStorage | Number string | Notification count |

### 4.3 Request/Response Data Types

**PublicUser** (never includes passwordHash):
```typescript
{
  id: string;
  email: string;
  name: string;
  phone: string | null;
  initials: string;
  createdAt: string;
  updatedAt: string;
}
```

**Transaction:**
```typescript
{
  id: string;
  type: "topup" | "send" | "receive" | "payment";
  amount: number;
  description: string;
  status: "success" | "failed";
  cardId: string | null;
  recipientId: string | null;
  recipientName: string | null;
  category: "food" | "transport" | "shopping" | "entertainment" | "health" | "other";
  createdAt: string;
}
```

**Card:**
```typescript
{
  id: string;
  last4: string;
  cardType: "visa" | "mastercard" | "amex";
  holderName: string;
  cardName: string;
  color: string;
  isDefault: boolean;
  createdAt: string;
}
```

---

## 5. Database Schema

### 5.1 Table: users

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID generated by application |
| email | TEXT | NOT NULL, UNIQUE | User's email address |
| password_hash | TEXT | NOT NULL | bcrypt hash of password |
| name | TEXT | NOT NULL | Full display name |
| phone | TEXT | nullable | Optional phone number |
| initials | TEXT | NOT NULL | 1-2 letter initials from name |
| created_at | INTEGER | NOT NULL | Unix timestamp (ms) |
| updated_at | INTEGER | NOT NULL | Unix timestamp (ms) |

### 5.2 Table: wallets

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID |
| user_id | TEXT | NOT NULL, UNIQUE, FK → users.id CASCADE | One wallet per user |
| balance | INTEGER | NOT NULL, DEFAULT 0 | Balance in RWF (integer) |
| created_at | INTEGER | NOT NULL | Unix timestamp |
| updated_at | INTEGER | NOT NULL | Unix timestamp |

### 5.3 Table: cards

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID |
| user_id | TEXT | NOT NULL, FK → users.id CASCADE | Card owner |
| last4 | TEXT | NOT NULL | Last 4 digits of card number |
| card_type | TEXT | NOT NULL, DEFAULT 'visa' | visa / mastercard / amex |
| holder_name | TEXT | NOT NULL | Name on card |
| card_name | TEXT | NOT NULL, DEFAULT 'My Card' | Display name (e.g. "Bank of Kigali") |
| color | TEXT | NOT NULL, DEFAULT '#1B5E20' | Hex color for card UI |
| is_default | INTEGER | NOT NULL, DEFAULT 0 | Boolean (0/1) — default card |
| created_at | INTEGER | NOT NULL | Unix timestamp |

### 5.4 Table: transactions

| Column | Type | Constraints | Description |
|---|---|---|---|
| id | TEXT | PRIMARY KEY | UUID |
| user_id | TEXT | NOT NULL, FK → users.id CASCADE | Transaction owner |
| type | TEXT | NOT NULL | topup / send / receive / payment |
| amount | INTEGER | NOT NULL | Amount in RWF |
| description | TEXT | NOT NULL | Human-readable description |
| status | TEXT | NOT NULL, DEFAULT 'success' | success / failed |
| card_id | TEXT | FK → cards.id SET NULL | Card used (for topup) |
| recipient_id | TEXT | FK → users.id SET NULL | Recipient user (for send/receive) |
| recipient_name | TEXT | nullable | Recipient display name |
| category | TEXT | NOT NULL, DEFAULT 'other' | food/transport/shopping/entertainment/health/other |
| created_at | INTEGER | NOT NULL | Unix timestamp |

---

## 6. Validation Rules

| Field | Rule | Error |
|---|---|---|
| email | Valid RFC 5322 email format | "Invalid email" |
| password | Minimum 6 characters | "Password too short" |
| name | Minimum 1 character | "Name required" |
| topup amount | Integer, 500 ≤ amount ≤ 5,000,000 | "Amount out of range" |
| transfer amount | Integer, amount ≥ 100 | "Minimum transfer is 100 RWF" |
| card last4 | Exactly 4 characters | "Must be exactly 4 digits" |
| card type | One of: visa, mastercard, amex | "Invalid card type" |
| category | One of: food, transport, shopping, entertainment, health, other | "Invalid category" |

---

## 7. Error Handling

### 7.1 HTTP Status Codes

| Status | Meaning | When Used |
|---|---|---|
| 200 | OK | Successful GET, PUT, POST (non-creation) |
| 201 | Created | Successful resource creation (register, add card) |
| 400 | Bad Request | Invalid input, business rule violation |
| 401 | Unauthorized | Missing, invalid, or expired JWT |
| 404 | Not Found | Resource does not exist or belongs to another user |
| 409 | Conflict | Duplicate resource (email already registered) |
| 500 | Internal Server Error | Unexpected server-side error |

### 7.2 Error Response Format

All errors return a consistent JSON structure:
```json
{
  "error": "Human-readable error message",
  "details": { }
}
```
The `details` field is optional and only present for validation errors (Zod flatten output).

### 7.3 Client-Side Error Handling

- Network errors (no connectivity) are caught and displayed as user-friendly messages
- 401 responses trigger automatic token clearing and redirect to auth screen
- All loading states are tracked with `isSigningIn`, `isLoading` flags in context
- `finally` blocks ensure loading states always reset even on error
