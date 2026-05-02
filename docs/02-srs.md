# Rwanda Pay — Software Requirements Specification (SRS)

## 1. Introduction

### 1.1 Purpose
This SRS defines the complete software requirements for Rwanda Pay — a fintech mobile application and REST API backend. It is intended for developers, testers, and stakeholders involved in building and maintaining the system.

### 1.2 Scope
Rwanda Pay consists of:
- A React Native / Expo mobile application (iOS + Android)
- A Node.js / Express 5 REST API server
- A PostgreSQL database managed via Drizzle ORM
- Shared TypeScript libraries (db schema, Zod validators, API client)

### 1.3 Definitions

| Term | Definition |
|---|---|
| RWF | Rwandan Franc — the only supported currency |
| JWT | JSON Web Token used for stateless authentication |
| NFC | Near Field Communication — simulated tap-to-pay flow |
| Wallet | A single RWF balance account per user |
| Card | A linked payment card (Visa / Mastercard / Amex / MoMo) |
| Transaction | Any financial event: topup, send, receive, payment |

---

## 2. Overall Description

### 2.1 Product Perspective
Rwanda Pay is a standalone mobile fintech app. It communicates exclusively with its own backend API over HTTPS. No third-party payment gateway is integrated in v1.0.

### 2.2 Product Functions (Summary)

| Module | Key Functions |
|---|---|
| Auth | Register, Login, Demo login, Profile update, Logout |
| Wallet | View balance, Top up, Transfer, NFC Pay |
| Cards | List, Add, Delete, Set default |
| Transactions | List (paginated + filtered), Analytics |
| Settings | Hide balance, Face ID toggle, Notifications toggle, Sign out |

### 2.3 User Classes

| Class | Description |
|---|---|
| Guest | Unauthenticated — can only access auth screens |
| Authenticated User | Full access to wallet, cards, transactions, analytics, settings |
| Demo User | Auto-created account with seeded data for exploration |

### 2.4 Operating Environment
- Mobile: iOS 14+ / Android 10+ via Expo Go or standalone build
- Backend: Node.js 24, Express 5, PostgreSQL 15+
- Hosting: Replit (dev), any Node.js-compatible cloud (prod)

---

## 3. System Features

### 3.1 User Registration

**Description:** A new user creates an account.

**Inputs:** email, password, name, phone (optional)

**Processing:**
1. Validate input with Zod `registerSchema`
2. Check email uniqueness in `users` table
3. Hash password with bcrypt (rounds=10)
4. Insert user record, generate initials from name
5. Create wallet with 50,000 RWF balance
6. Insert 3 seed cards (Bank of Kigali, MTN MoMo, I&M Bank)
7. Insert 5 seed transactions
8. Sign and return JWT + user + wallet balance

**Output:** `{ user, wallet: { balance }, token }`

**Error Cases:**
- 400 — invalid input
- 409 — email already registered
- 500 — server error

---

### 3.2 User Login

**Inputs:** email, password

**Processing:**
1. Validate with Zod `loginSchema`
2. Fetch user by email
3. Compare password with bcrypt
4. Fetch wallet balance
5. Sign and return JWT

**Output:** `{ user, wallet: { balance }, token }`

**Error Cases:**
- 400 — invalid input
- 401 — invalid credentials
- 500 — server error

---

### 3.3 Wallet Top-Up

**Inputs:** cardId (UUID), amount (integer, 500–5,000,000)

**Processing:**
1. Validate card belongs to authenticated user
2. Add amount to wallet balance
3. Create `topup` transaction record

**Output:** `{ transaction, balance }`

---

### 3.4 Wallet Transfer

**Inputs:** recipientEmail, amount (integer, min 100), description

**Processing:**
1. Reject self-transfer
2. Check sender balance ≥ amount
3. Lookup recipient by email
4. Deduct from sender wallet
5. Credit recipient wallet (create if missing)
6. Create `send` transaction for sender
7. Create `receive` transaction for recipient

**Output:** `{ transaction, balance }`

---

### 3.5 NFC Tap-to-Pay

**Inputs:** amount, description, category

**Processing:**
1. Check wallet balance ≥ amount
2. Deduct from wallet
3. Create `payment` transaction

**Mobile Flow:**
1. User taps "Start Scanning" → 2.5s simulated scan
2. Terminal detected → user taps "Authenticate & Pay"
3. Biometric prompt (Face ID / fingerprint via expo-local-authentication)
4. On success → API call → success animation + haptics
5. On failure → error state, reset after 2.5s

---

### 3.6 Transaction Analytics

**Inputs:** period (days, default 30)

**Processing:**
1. Fetch all transactions for user within period
2. Compute `totalIn` (topup + receive), `totalOut` (send + payment)
3. Build `byCategory` map (outgoing only)
4. Build `monthly` array with in/out per month

**Output:** `{ byCategory, monthly, totalIn, totalOut, days }`

---

## 4. External Interface Requirements

### 4.1 API Interface

Base URL: `/api`

All protected endpoints require: `Authorization: Bearer <jwt>`

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/register` | — | Register new user |
| POST | `/auth/login` | — | Login |
| GET | `/auth/me` | ✓ | Get current user + balance |
| PUT | `/auth/profile` | ✓ | Update name/phone |
| POST | `/auth/logout` | ✓ | Logout |
| GET | `/wallet` | ✓ | Get wallet balance |
| POST | `/wallet/topup` | ✓ | Top up from card |
| POST | `/wallet/transfer` | ✓ | Send to another user |
| POST | `/wallet/pay` | ✓ | NFC payment |
| GET | `/cards` | ✓ | List cards |
| POST | `/cards` | ✓ | Add card |
| DELETE | `/cards/:id` | ✓ | Delete card |
| PUT | `/cards/:id/default` | ✓ | Set default card |
| GET | `/transactions` | ✓ | List transactions |
| GET | `/transactions/analytics` | ✓ | Spending analytics |
| GET | `/healthz` | — | Health check |

### 4.2 Mobile Storage Interface

| Key | Storage | Content |
|---|---|---|
| JWT token | expo-secure-store | Bearer token string |
| `@rp_selected_card` | AsyncStorage | Selected card ID |
| `@rp_hide_balance` | AsyncStorage | Boolean |
| `@rp_profile` | AsyncStorage | Profile JSON |
| `@rp_notifications` | AsyncStorage | Notification count |

---

## 5. Database Schema

### users
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, default random |
| email | TEXT | NOT NULL, UNIQUE |
| password_hash | TEXT | NOT NULL |
| name | TEXT | NOT NULL |
| phone | TEXT | nullable |
| initials | TEXT | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### wallets
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, UNIQUE, CASCADE |
| balance | INTEGER | NOT NULL, default 0 |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### cards
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, CASCADE |
| last4 | TEXT | NOT NULL |
| card_type | TEXT | NOT NULL, default 'visa' |
| holder_name | TEXT | NOT NULL |
| card_name | TEXT | NOT NULL |
| color | TEXT | NOT NULL |
| is_default | BOOLEAN | NOT NULL, default false |
| created_at | TIMESTAMP | NOT NULL |

### transactions
| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK |
| user_id | UUID | FK → users.id, CASCADE |
| type | TEXT | NOT NULL (topup/send/receive/payment) |
| amount | INTEGER | NOT NULL |
| description | TEXT | NOT NULL |
| status | TEXT | NOT NULL, default 'success' |
| card_id | UUID | FK → cards.id, SET NULL |
| recipient_id | UUID | FK → users.id, SET NULL |
| recipient_name | TEXT | nullable |
| category | TEXT | NOT NULL, default 'other' |
| created_at | TIMESTAMP | NOT NULL |

---

## 6. Validation Rules

| Field | Rule |
|---|---|
| email | Valid email format |
| password | Minimum 6 characters |
| name | Minimum 1 character |
| topup amount | Integer, 500–5,000,000 |
| transfer amount | Integer, minimum 100 |
| card last4 | Exactly 4 characters |
| card type | One of: visa, mastercard, amex |
| category | One of: food, transport, shopping, entertainment, health, other |

---

## 7. Error Handling

| HTTP Status | Meaning |
|---|---|
| 400 | Invalid input / validation failure |
| 401 | Missing or invalid JWT |
| 404 | Resource not found |
| 409 | Conflict (e.g. duplicate email) |
| 500 | Internal server error |

All errors return: `{ error: string, details?: object }`
