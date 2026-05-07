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

Despite this digital momentum, a critical and embarrassing gap exists in Rwanda's mobile payments ecosystem:

> **Apple Pay and Google Pay — the two dominant global contactless payment platforms — do not operate in Rwanda.**

These services are unavailable because they require:
- Local banking partnerships and card network agreements (Visa/Mastercard Rwanda)
- NFC payment terminal infrastructure certified for the local market
- Regulatory approval and integration with the National Bank of Rwanda
- App Store and Play Store regional payment support

None of these conditions are currently met in Rwanda. As a result, Rwandan smartphone users — even those with the latest iPhones and Android devices — cannot use their phones to tap and pay at merchants.

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

1. **A unified digital wallet** — one app that aggregates multiple bank cards and mobile money accounts into a single RWF balance
2. **NFC-simulated tap-to-pay** — a smartphone-native payment experience with biometric authentication, simulating the Apple Pay / Google Pay UX
3. **Email-based peer-to-peer transfers** — send money to anyone by email address, no account numbers needed
4. **Real-time spending analytics** — category-based charts and monthly breakdowns
5. **A modern, secure interface** — JWT authentication, bcrypt password hashing, Face ID / fingerprint payment authorization

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

The Rwanda Pay system consists of three main layers: the mobile application, the API server, and the database. These communicate over HTTP REST.

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
║  │  │  Demo        │  │  Cards       │  │   Biometric Auth │  │    ║
║  │  └──────────────┘  └──────────────┘  └──────────────────┘  │    ║
║  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │    ║
║  │  │  Send Money  │  │ Transactions │  │   Analytics      │  │    ║
║  │  │  Receive     │  │  History     │  │   Charts         │  │    ║
║  │  │  Top-Up      │  │  Filter      │  │   Categories     │  │    ║
║  │  └──────────────┘  └──────────────┘  └──────────────────┘  │    ║
║  │                                                              │    ║
║  │  State: AuthContext + WalletContext (React Context API)      │    ║
║  │  Storage: expo-secure-store (JWT) + AsyncStorage (prefs)    │    ║
║  └─────────────────────┬───────────────────────────────────────┘    ║
║                        │ HTTP REST / JSON                            ║
║                        ▼                                             ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │                     API SERVER                               │    ║
║  │               (Node.js 24 / Express 5)                       │    ║
║  │                                                              │    ║
║  │  Middleware: CORS → pino-http Logger → express.json          │    ║
║  │                                                              │    ║
║  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │    ║
║  │  │  /auth   │ │ /wallet  │ │  /cards  │ │ /transactions│  │    ║
║  │  │ register │ │ balance  │ │  list    │ │  list        │  │    ║
║  │  │ login    │ │ topup    │ │  add     │ │  analytics   │  │    ║
║  │  │ me       │ │ transfer │ │  delete  │ │              │  │    ║
║  │  │ logout   │ │ pay      │ │  default │ │              │  │    ║
║  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │    ║
║  │                                                              │    ║
║  │  Auth: JWT (jsonwebtoken) + bcryptjs                         │    ║
║  │  Validation: Zod schemas                                     │    ║
║  │  ORM: Drizzle ORM                                            │    ║
║  └─────────────────────┬───────────────────────────────────────┘    ║
║                        │ Drizzle ORM queries                         ║
║                        ▼                                             ║
║  ┌─────────────────────────────────────────────────────────────┐    ║
║  │                      DATABASE                                │    ║
║  │           (SQLite — dev / PostgreSQL — prod)                 │    ║
║  │                                                              │    ║
║  │   users          wallets        cards        transactions    │    ║
║  │   ─────          ───────        ─────        ────────────    │    ║
║  │   id             id             id           id              │    ║
║  │   email          user_id (FK)   user_id (FK) user_id (FK)   │    ║
║  │   password_hash  balance        last4        type            │    ║
║  │   name           created_at     card_type    amount          │    ║
║  │   phone          updated_at     holder_name  description     │    ║
║  │   initials                      card_name    status          │    ║
║  │   created_at                    color        card_id (FK)    │    ║
║  │   updated_at                    is_default   recipient_id    │    ║
║  │                                 created_at   category        │    ║
║  │                                              created_at      │    ║
║  └─────────────────────────────────────────────────────────────┘    ║
╚══════════════════════════════════════════════════════════════════════╝
```

### Data Flow Description

1. **User Action** — User interacts with a screen (e.g. taps "Send Money")
2. **Context Layer** — Screen calls a method on `AuthContext` or `WalletContext`
3. **API Client** — Context calls `lib/api.ts` which builds an HTTP request with the JWT Bearer token
4. **Middleware** — API server receives request, logs it, parses JSON body
5. **Auth Check** — `requireAuth` middleware verifies the JWT signature and expiry
6. **Validation** — Route handler validates input with Zod schema
7. **Business Logic** — Route handler executes the operation (balance check, DB update, etc.)
8. **Database** — Drizzle ORM executes typed SQL queries against SQLite/PostgreSQL
9. **Response** — JSON response flows back to the mobile app
10. **State Update** — Context updates React state, screens re-render automatically

---

## iii. Problem Identification

### Primary Problem Statement

Rwanda's smartphone users cannot use their phones as payment devices. The two global leaders in mobile contactless payments — **Apple Pay** and **Google Pay** — do not operate in Rwanda. This is not a temporary gap; it is a structural absence caused by missing banking infrastructure, NFC terminal certification, and regulatory frameworks.

The consequence is that millions of Rwandans carry smartphones capable of NFC payments but are forced to use cash, physical cards, or slow USSD-based mobile money systems for every transaction.

### Problem Analysis

**Problem 1: No Tap-to-Pay**
- Apple Pay requires Apple's partnership with local card networks. Rwanda's banks are not enrolled.
- Google Pay requires Google's payment infrastructure agreements. Rwanda is not supported.
- Result: Rwandan users cannot tap their phone at any merchant terminal.

**Problem 2: Fragmented Mobile Money**
- MTN MoMo serves ~8 million users but requires dialing `*182#` and navigating 5+ USSD menu levels for a simple transfer.
- Airtel Money requires `*185#` with similar friction.
- There is no single app that shows all balances and allows transfers across providers.

**Problem 3: No Peer-to-Peer Transfer by Identity**
- Sending money requires knowing the recipient's phone number or bank account number.
- There is no system that allows sending money by email address or username.
- This creates friction for everyday transfers (splitting bills, paying friends, etc.)

**Problem 4: No Spending Visibility**
- Mobile money users receive SMS confirmations but have no spending dashboard.
- There is no way to see "how much did I spend on food this month?" without manually reviewing SMS history.
- This prevents personal financial management.

**Problem 5: Security Vulnerabilities**
- Physical card payments expose the full card number to merchants.
- USSD sessions can be intercepted.
- There is no biometric authentication layer on any current Rwandan payment method.

### Proposed Solution: Rwanda Pay

Rwanda Pay addresses all five problems:

| Problem | Rwanda Pay Solution |
|---|---|
| No tap-to-pay | NFC-simulated payment with biometric auth — same UX as Apple Pay |
| Fragmented mobile money | Unified wallet aggregating Bank of Kigali, MTN MoMo, I&M Bank |
| No P2P by identity | Email-based transfers — send to any registered user by email |
| No spending visibility | Real-time analytics with category breakdown and monthly charts |
| Security vulnerabilities | JWT auth + bcrypt + Face ID/fingerprint for every payment |

---

## iv. Object-Oriented System Analysis and Design

### System Actors

| Actor | Description |
|---|---|
| Guest User | Unauthenticated user — can register, login, or try demo |
| Authenticated User | Logged-in user with full access to all features |
| Demo User | Special auto-created account for exploration without signup |
| API Server | Backend system processing all requests |
| Database | Persistent storage for all user data |
| Biometric Device | iOS Face ID or Android fingerprint sensor |

### Functional Requirements

| ID | Module | Requirement |
|---|---|---|
| FR-01 | Auth | Users shall register with email, password (min 6 chars), full name, and optional phone number |
| FR-02 | Auth | Users shall log in with email and password |
| FR-03 | Auth | System shall issue a signed JWT token on successful login or registration |
| FR-04 | Auth | JWT shall be stored securely using expo-secure-store (encrypted on-device) |
| FR-05 | Auth | On app launch, system shall restore session from stored token via GET /auth/me |
| FR-06 | Auth | Users shall log out, clearing the stored token and resetting app state |
| FR-07 | Auth | A demo account shall be auto-created on first tap of the Demo button |
| FR-08 | Auth | Users shall update their name and phone number via profile settings |
| FR-09 | Wallet | Each user shall have exactly one wallet denominated in RWF |
| FR-10 | Wallet | New users shall receive a 50,000 RWF welcome balance on registration |
| FR-11 | Wallet | Users shall top up their wallet from a linked card (min 500 RWF, max 5,000,000 RWF) |
| FR-12 | Wallet | Users shall transfer money to another registered user by email (min 100 RWF) |
| FR-13 | Wallet | System shall prevent self-transfers |
| FR-14 | Wallet | System shall reject transfers when sender has insufficient balance |
| FR-15 | Wallet | Wallet balance shall be displayed on the home screen with a hide/show toggle |
| FR-16 | Cards | Users shall have 3 seed cards created automatically on registration |
| FR-17 | Cards | Users shall add new cards with last 4 digits, card type, holder name, card name, and color |
| FR-18 | Cards | Users shall delete any of their linked cards |
| FR-19 | Cards | Users shall set any card as the default payment card |
| FR-20 | Cards | Cards shall be displayed in a horizontal swipeable carousel on the home screen |
| FR-21 | Pay | Users shall initiate an NFC payment simulation from the Pay tab |
| FR-22 | Pay | System shall simulate terminal scanning with a 2.5-second delay |
| FR-23 | Pay | Users shall authenticate via Face ID or fingerprint before payment is processed |
| FR-24 | Pay | Payment shall deduct the specified amount from the wallet balance |
| FR-25 | Pay | Haptic feedback shall be provided at each stage of the payment flow |
| FR-26 | Transactions | All wallet operations shall create a transaction record with type, amount, description, status, category |
| FR-27 | Transactions | Transaction list shall support pagination (limit/offset) and type filtering |
| FR-28 | Transactions | Transactions shall be grouped by date (Today, Yesterday, full date) |
| FR-29 | Transactions | Transaction categories: food, transport, shopping, entertainment, health, other |
| FR-30 | Analytics | Users shall view spending analytics for the past 7 or 30 days |
| FR-31 | Analytics | Analytics shall show total spent, category breakdown with progress bars, and monthly chart |
| FR-32 | Settings | Users shall toggle balance visibility (persisted across app restarts) |
| FR-33 | Settings | Users shall toggle Face ID requirement for payments |
| FR-34 | Settings | Users shall view and edit their profile name inline |

### Non-Functional Requirements

| ID | Category | Requirement |
|---|---|---|
| NFR-01 | Performance | API responses shall complete within 500ms under normal load |
| NFR-02 | Performance | Mobile app shall render the home screen within 2 seconds of auth check completion |
| NFR-03 | Security | Passwords shall be hashed using bcrypt with cost factor 10 |
| NFR-04 | Security | JWT tokens shall be signed with a secret key and expire after 7 days |
| NFR-05 | Security | All protected routes shall require a valid Authorization: Bearer token header |
| NFR-06 | Security | Biometric authentication shall be required for every NFC payment |
| NFR-07 | Security | Password hashes shall never be returned in any API response |
| NFR-08 | Security | All monetary values shall be stored as integers in RWF (no floating point) |
| NFR-09 | Usability | App shall support both iOS (14+) and Android (10+) via Expo |
| NFR-10 | Usability | App shall use the Inter font family for consistent, professional typography |
| NFR-11 | Usability | App shall support dark and light color themes |
| NFR-12 | Reliability | Database cascades shall clean up wallets, cards, and transactions when a user is deleted |
| NFR-13 | Reliability | Wallet context shall fall back to cached data if the API is temporarily unavailable |
| NFR-14 | Reliability | User preferences (hide balance, selected card) shall persist across app restarts via AsyncStorage |
| NFR-15 | Scalability | Transaction list endpoint shall cap at 100 records per request |
| NFR-16 | Maintainability | Monorepo structure shall allow independent deployment of API and mobile app |
| NFR-17 | Maintainability | All API inputs shall be validated with Zod schemas before any database access |

### Constraints

| Constraint | Detail |
|---|---|
| Currency | RWF only, stored as integers (no decimal support) |
| Package manager | pnpm only — npm and yarn are rejected at install time |
| Node.js version | Version 24+ required |
| Mobile runtime | Expo SDK — bare React Native not supported |
| NFC | Simulated only — real NFC hardware integration is out of scope for v1.0 |
| OAuth | Google and Apple sign-in are stubbed — require OAuth credentials for activation |

### Assumptions

- Users have a smartphone with internet connectivity
- Biometric hardware (Face ID or fingerprint sensor) is available on the device
- The API server and mobile app are on the same network during development
- Real NFC hardware and merchant POS integration are not required for the prototype
