# Phase 1 — Case Study, System Analysis & Requirements

**Course:** Best Programming Practices and Design Patterns
**Institution:** Faculty of Information Technology — Software Engineering
**Student:** Pacifique
**Instructor:** RUTARINDWA JEAN PIERRE

---

## i. General Description and Analysis of the Case Study

### Topic
**Rwanda Pay** — A Digital Wallet and Tap-to-Pay Mobile Payment Application for Rwanda

### Background

Rwanda is one of Africa's fastest-growing digital economies. The government's Vision 2050 and the National Bank of Rwanda (BNR) have both set ambitious targets for a cashless economy, with mobile money penetration exceeding 40% of the adult population. As of 2024, Rwanda has over 10 million active mobile subscribers, and smartphone adoption is accelerating rapidly among urban and semi-urban populations.

Despite this digital momentum, a critical gap exists in Rwanda's mobile payments ecosystem:

> **Apple Pay and Google Pay — the two dominant global contactless payment platforms — do not operate in Rwanda.**

These services are unavailable because they require local banking partnerships, NFC terminal infrastructure certified for the local market, regulatory approval from the National Bank of Rwanda, and App Store/Play Store regional payment support. None of these conditions are currently met in Rwanda.

### The Current Reality for Rwandan Consumers

| Payment Method | How It Works | Problems |
|---|---|---|
| Cash | Physical notes and coins | Insecure, inconvenient, no digital record |
| Physical card swipe | Insert/swipe Visa or Mastercard at POS | Requires merchant POS hardware, exposes card details |
| MTN MoMo | Dial `*182#`, navigate USSD menus | Slow, error-prone, 1990s interface on modern phones |
| Airtel Money | Dial `*185#`, navigate USSD menus | Same problems as MTN MoMo |
| Bank transfer | Log into banking app, enter account numbers | High friction, requires knowing account details |

None of these methods provide the seamless, tap-and-go experience that consumers in the US, UK, Europe, and parts of Asia take for granted.

### The Opportunity

Rwanda Pay is a software solution designed to fill this gap. It provides:

1. **A unified digital wallet** — one app that aggregates multiple bank cards into a single RWF balance
2. **NFC-simulated tap-to-pay** — a smartphone-native payment experience with biometric authentication
3. **Email-based peer-to-peer transfers** — send money to anyone by email address
4. **Real-time spending analytics** — category-based charts and monthly breakdowns
5. **A modern, secure interface** — JWT authentication, bcrypt password hashing, AES-256-GCM card encryption

### Stakeholders

| Stakeholder | Role | Interest |
|---|---|---|
| Rwandan smartphone users | Primary end users | Fast, secure, convenient payments |
| Merchants | Payment recipients | Faster checkout, reduced cash handling |
| Banks (Bank of Kigali, I&M Bank) | Card providers | Digital channel for card usage |
| MTN Rwanda / Airtel Rwanda | Mobile money providers | Integration with digital wallet |
| National Bank of Rwanda (BNR) | Regulator | Financial inclusion, cashless economy |
| Developer (Pacifique) | System builder | Academic project, real-world solution |

---

## ii. Functional Diagram — Internal Working of the System

```
╔══════════════════════════════════════════════════════════════════════╗
║                        RWANDA PAY SYSTEM                            ║
╠══════════════════════════════════════════════════════════════════════╣
║                                                                      ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │                    MOBILE APPLICATION                        │    ║
║  │                  (Expo / React Native)                       │    ║
║  │                                                              │    ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │    ║
║  │  │  Auth Screen │  │  Home Screen │  │   Pay Screen     │  │    ║
║  │  │  Login/Reg   │  │  Balance +   │  │   NFC Simulate   │  │    ║
║  │  └──────────────┘  │  Cards       │  │   Biometric Auth │  │    ║
║  │  ┌──────────────┐  └──────────────┘  └──────────────────┘  │    ║
║  │  │  Send Money  │  ┌──────────────┐  ┌──────────────────┐  │    ║
║  │  │  Top-Up      │  │ Transactions │  │   Analytics      │  │    ║
║  │  │  Receive     │  │  History     │  │   Charts         │  │    ║
║  │  └──────────────┘  └──────────────┘  └──────────────────┘  │    ║
║  │                                                              │    ║
║  │  State: AuthContext + WalletContext (React Context API)      │    ║
║  │  Storage: expo-secure-store (JWT) + AsyncStorage (prefs)    │    ║
║  └─────────────────────┬───────────────────────────────────────┘    ║
║                        │ HTTP REST / JSON                            ║
║                        ▼                                             ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │                     API SERVER                               │    ║
║  │               (Go 1.22 / Fiber v2)                           │    ║
║  │                                                              │    ║
║  │  Middleware: Recover → Logger → CORS → Auth (JWT)            │    ║
║  │                                                              │    ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │    ║
║  │  │  /auth   │ │ /wallet  │ │  /cards  │ │ /transactions│  │    ║
║  │  │ register │ │ balance  │ │  list    │ │  list        │  │    ║
║  │  │ login    │ │ topup    │ │  add     │ │  analytics   │  │    ║
║  │  │ me       │ │ transfer │ │  delete  │ │  ledger      │  │    ║
║  │  │ logout   │ │ pay      │ │  default │ │              │  │    ║
║  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │    ║
║  │                                                              │    ║
║  │  Auth: JWT (golang-jwt/jwt/v5) + bcrypt                      │    ║
║  │  Encryption: AES-256-GCM (card numbers + CVV)                │    ║
║  │  Architecture: Handler → Service → Repository (Clean Arch)  │    ║
║  └─────────────────────┬───────────────────────────────────────┘    ║
║                        │ pgx/v5 (pgxpool)                            ║
║                        ▼                                             ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │                      DATABASE                                │    ║
║  │                   (PostgreSQL 16)                            │    ║
║  │                                                              │    ║
║  │   users          wallets        cards        transactions    │    ║
║  │   ─────          ───────        ─────        ────────────    │    ║
║  │   id (UUID)      id (UUID)      id (UUID)    id (UUID)       │    ║
║  │   email          user_id (FK)   user_id (FK) user_id (FK)   │    ║
║  │   password_hash  balance        card_number* type            │    ║
║  │   name           currency       cvv*         amount (BIGINT) │    ║
║  │   phone          is_frozen      last4        description     │    ║
║  │   initials       created_at     expiry_date  status          │    ║
║  │   created_at     updated_at     holder_name  card_id (FK)    │    ║
║  │   updated_at                    network      recipient_id    │    ║
║  │                                 balance      balance_before  │    ║
║  │                                 is_default   balance_after   │    ║
║  │                                 status       created_at      │    ║
║  │                                              (* = encrypted) │    ║
║  │   merchants      user_merchants                              │    ║
║  │   ─────────      ─────────────                              │    ║
║  │   id (UUID)      user_id (FK)                               │    ║
║  │   name           merchant_id (FK)                           │    ║
║  │   category       total_spent                                │    ║
║  │   merchant_code  visit_count                                │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Data Flow Description

1. **User Action** — User interacts with a screen (e.g. taps "Send Money")
2. **Context Layer** — Screen calls a method on `AuthContext` or `WalletContext`
3. **API Client** — Context calls `lib/api.ts` which builds an HTTP request with the JWT Bearer token
4. **Middleware** — API server receives request, logs it, parses JSON body
5. **Auth Check** — `middleware.Auth` verifies the JWT signature and expiry, attaches `userID` to context
6. **Handler** — Parses and validates the request body
7. **Service** — Executes business logic (balance checks, validation rules)
8. **Repository** — Executes typed SQL queries via pgx/v5 against PostgreSQL
9. **Atomic Transaction** — For money operations, uses `BEGIN/SELECT FOR UPDATE/COMMIT` to prevent race conditions
10. **Response** — JSON response flows back to the mobile app
11. **State Update** — Context updates React state, screens re-render automatically

---

## iii. Problem Identification

### Primary Problem Statement

Rwanda's smartphone users cannot use their phones as payment devices. The two global leaders in mobile contactless payments — **Apple Pay** and **Google Pay** — do not operate in Rwanda. This is a structural absence caused by missing banking infrastructure, NFC terminal certification, and regulatory frameworks.

### Problem Analysis

**Problem 1: No Tap-to-Pay**
- Apple Pay requires Apple's partnership with local card networks. Rwanda's banks are not enrolled.
- Google Pay requires Google's payment infrastructure agreements. Rwanda is not supported.
- Result: Rwandan users cannot tap their phone at any merchant terminal.

**Problem 2: Fragmented Mobile Money**
- MTN MoMo serves ~8 million users but requires dialing `*182#` and navigating 5+ USSD menu levels.
- Airtel Money requires `*185#` with similar friction.
- There is no single app that shows all balances and allows transfers across providers.

**Problem 3: No Peer-to-Peer Transfer by Identity**
- Sending money requires knowing the recipient's phone number or bank account number.
- There is no system that allows sending money by email address or username.

**Problem 4: No Spending Visibility**
- Mobile money users receive SMS confirmations but have no spending dashboard.
- There is no way to see "how much did I spend on food this month?" without manually reviewing SMS history.

**Problem 5: Security Vulnerabilities**
- Physical card payments expose the full card number to merchants.
- USSD sessions can be intercepted.
- There is no biometric authentication layer on any current Rwandan payment method.

### Proposed Solution: Rwanda Pay

| Problem | Rwanda Pay Solution |
|---|---|
| No tap-to-pay | NFC-simulated payment with biometric auth — same UX as Apple Pay |
| Fragmented mobile money | Unified wallet with card management |
| No P2P by identity | Email-based transfers — send to any registered user by email |
| No spending visibility | Real-time analytics with category breakdown and monthly charts |
| Security vulnerabilities | JWT auth + bcrypt + AES-256-GCM + biometric for every payment |

---

## iv. Object-Oriented System Analysis and Design

### System Actors

| Actor | Description |
|---|---|
| Guest User | Unauthenticated user — can register or login |
| Authenticated User | Logged-in user with full access to all features |
| API Server | Backend system processing all requests |
| Database | PostgreSQL persistent storage |
| Biometric Device | iOS Face ID or Android fingerprint sensor |

### Functional Requirements

| ID | Module | Requirement |
|---|---|---|
| FR-01 | Auth | Users shall register with email, password (min 6 chars), full name, and optional phone number |
| FR-02 | Auth | Users shall log in with email and password |
| FR-03 | Auth | System shall issue a signed JWT token on successful login or registration |
| FR-04 | Auth | JWT shall be stored securely using expo-secure-store (encrypted on-device) |
| FR-05 | Auth | On app launch, system shall restore session from stored token via GET /api/v1/auth/me |
| FR-06 | Auth | Users shall log out, clearing the stored token and resetting app state |
| FR-07 | Auth | Users shall update their name and phone number via profile settings |
| FR-08 | Wallet | Each user shall have exactly one wallet denominated in RWF |
| FR-09 | Wallet | New users shall receive a wallet with zero balance on registration |
| FR-10 | Wallet | Users shall top up their wallet from a linked card (min 500 RWF, max 5,000,000 RWF) |
| FR-11 | Wallet | Users shall transfer money to another registered user by email (min 100 RWF) |
| FR-12 | Wallet | System shall prevent self-transfers |
| FR-13 | Wallet | System shall reject transfers when sender has insufficient balance |
| FR-14 | Wallet | All wallet balance changes shall be atomic PostgreSQL transactions with row-level locking |
| FR-15 | Cards | Users shall add cards with 16-digit number, expiry date, CVV, holder name, and initial balance |
| FR-16 | Cards | Card numbers and CVV shall be encrypted with AES-256-GCM before storage |
| FR-17 | Cards | Users shall delete any of their linked cards |
| FR-18 | Cards | Users shall set any card as the default payment card |
| FR-19 | Cards | Users shall add balance to a card (simulated card loading) |
| FR-20 | Pay | Users shall initiate an NFC payment simulation from the Pay tab |
| FR-21 | Pay | System shall simulate terminal scanning with a 2.5-second delay |
| FR-22 | Pay | Users shall authenticate via Face ID or fingerprint before payment is processed |
| FR-23 | Pay | Payment shall deduct the specified amount from the wallet balance |
| FR-24 | Transactions | All wallet operations shall create a transaction record with type, amount, description, status, category |
| FR-25 | Transactions | Transaction list shall support pagination (limit/offset) and type filtering |
| FR-26 | Transactions | Transactions shall include balance_before and balance_after for audit trail |
| FR-27 | Transactions | System shall provide spending analytics by category and monthly breakdown |
| FR-28 | Transactions | System shall provide a ledger view of transactions between two specific users |
| FR-29 | Merchants | System shall maintain a list of verified merchants with categories |
| FR-30 | Merchants | Payments to merchants shall be tracked in user_merchants for visit history |

### Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | API responses shall complete within 500ms under normal load |
| NFR-02 | Security | Passwords shall be hashed using bcrypt with default cost factor (10) |
| NFR-03 | Security | JWT tokens shall be signed with HS256 and expire after 168 hours (7 days) |
| NFR-04 | Security | All protected routes shall require a valid Authorization: Bearer token header |
| NFR-05 | Security | Biometric authentication shall be required for every NFC payment |
| NFR-06 | Security | Password hashes shall never be returned in any API response |
| NFR-07 | Security | All monetary values shall be stored as BIGINT in RWF (no floating point) |
| NFR-08 | Security | Card numbers and CVV shall be encrypted with AES-256-GCM before storage |
| NFR-09 | Reliability | Wallet balance changes shall use PostgreSQL transactions with SELECT FOR UPDATE |
| NFR-10 | Reliability | Transfer deadlocks shall be prevented by locking wallets in UUID-ascending order |
| NFR-11 | Usability | App shall support both iOS (14+) and Android (10+) via Expo |
| NFR-12 | Maintainability | Backend shall follow clean architecture: Handler → Service → Repository |
| NFR-13 | Maintainability | All repository dependencies shall be injected via interfaces for testability |
| NFR-14 | Scalability | Transaction list endpoint shall cap at 100 records per request |
| NFR-15 | Portability | Application shall be fully containerized with Docker and docker-compose |

### Constraints

| Constraint | Detail |
|---|---|
| Currency | RWF only, stored as BIGINT (no decimal support) |
| Card storage | Raw card numbers never stored — AES-256-GCM encrypted only |
| NFC | Simulated only — real NFC hardware integration is out of scope for v1.0 |
| Database | PostgreSQL 16 required (uses UUID extension, ENUM types, TIMESTAMPTZ) |
| Go version | Go 1.22+ required |
