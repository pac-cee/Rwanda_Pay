# Phase 4 — Software Test Plan

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete software test plan for Rwanda Pay. It describes what will be tested, how it will be tested, the expected results, and the criteria for passing or failing each test.

### 1.2 Scope
Testing covers:
- The REST API server (all endpoints)
- The mobile application (screens, context, components)
- The database schema and validation logic
- Security and authentication mechanisms
- End-to-end user flows

### 1.3 Testing Levels

| Level | Scope | Tools |
|---|---|---|
| Unit | Individual functions, validators, utilities | Jest / Vitest |
| Integration | API route handlers + database | Jest + Supertest |
| Component | React Native UI components | React Native Testing Library |
| End-to-End | Full user flows on device/emulator | Maestro / Detox |
| Security | Auth, JWT, input validation | Manual + OWASP checklist |
| Manual | UI/UX, visual correctness | Physical device + simulator |

---

## 2. Test Environment

### 2.1 Backend Test Environment
```
OS:           macOS / Linux
Node.js:      v24+
Database:     SQLite (in-memory for tests)
Test Runner:  Jest
HTTP Client:  Supertest
```

### 2.2 Mobile Test Environment
```
iOS Simulator:    iPhone 15 Pro (iOS 17)
Android Emulator: Pixel 7 (Android 14)
Physical Device:  iPhone (Expo Go)
Framework:        React Native Testing Library
```

### 2.3 Test Data
```typescript
const testUser = {
  email: "test@rwandapay.rw",
  password: "test1234",
  name: "Test User",
};

const recipientUser = {
  email: "recipient@rwandapay.rw",
  password: "test1234",
  name: "Recipient User",
};

const expectedSeedState = {
  walletBalance: 50000,
  cardCount: 3,
  transactionCount: 5,
};
```

---

## 3. Unit Tests

### 3.1 Zod Schema Validation — `registerSchema`

| Test ID | Input | Expected Result | Pass/Fail |
|---|---|---|---|
| UT-01 | `{ email: "a@b.com", password: "abc123", name: "Alice" }` | Valid — passes | ✅ |
| UT-02 | `{ email: "notanemail", password: "abc123", name: "Alice" }` | Fail — invalid email | ✅ |
| UT-03 | `{ email: "a@b.com", password: "abc", name: "Alice" }` | Fail — password min 6 chars | ✅ |
| UT-04 | `{ email: "a@b.com", password: "abc123", name: "" }` | Fail — name min 1 char | ✅ |
| UT-05 | `{ email: "a@b.com", password: "abc123", name: "Alice", phone: "+250788" }` | Valid with optional phone | ✅ |

### 3.2 Zod Schema Validation — `topupSchema`

| Test ID | Input | Expected Result | Pass/Fail |
|---|---|---|---|
| UT-06 | `{ cardId: "<valid-uuid>", amount: 5000 }` | Valid | ✅ |
| UT-07 | `{ cardId: "<valid-uuid>", amount: 499 }` | Fail — min 500 | ✅ |
| UT-08 | `{ cardId: "<valid-uuid>", amount: 5000001 }` | Fail — max 5,000,000 | ✅ |
| UT-09 | `{ cardId: "<valid-uuid>", amount: 100.5 }` | Fail — must be integer | ✅ |
| UT-10 | `{ cardId: "not-a-uuid", amount: 1000 }` | Fail — invalid UUID | ✅ |

### 3.3 Zod Schema Validation — `transferSchema`

| Test ID | Input | Expected Result | Pass/Fail |
|---|---|---|---|
| UT-11 | `{ recipientEmail: "b@b.com", amount: 500, description: "lunch" }` | Valid | ✅ |
| UT-12 | `{ recipientEmail: "b@b.com", amount: 99, description: "x" }` | Fail — min 100 | ✅ |
| UT-13 | `{ recipientEmail: "b@b.com", amount: 500, description: "" }` | Fail — min 1 char | ✅ |

### 3.4 JWT Service

| Test ID | Scenario | Expected Result | Pass/Fail |
|---|---|---|---|
| UT-14 | Sign `{ userId, email }`, verify same token | Returns original payload | ✅ |
| UT-15 | Verify a token past its expiry | Throws JsonWebTokenError | ✅ |
| UT-16 | Modify token payload, verify | Throws invalid signature error | ✅ |
| UT-17 | Verify token signed with wrong secret | Throws error | ✅ |

### 3.5 Utility Functions — `makeInitials(name)`

| Test ID | Input | Expected Output | Pass/Fail |
|---|---|---|---|
| UT-18 | `"Alice Mugisha"` | `"AM"` | ✅ |
| UT-19 | `"Alice"` | `"A"` | ✅ |
| UT-20 | `"Alice Marie Mugisha"` | `"AM"` (first 2 only) | ✅ |

---

## 4. Integration Tests — API Routes

### 4.1 Auth Routes

#### POST `/api/auth/register`

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-01 | Valid registration | 201 `{ user, wallet: { balance: 50000 }, token }` | ✅ |
| IT-02 | `passwordHash` not in response | Response has no `passwordHash` field | ✅ |
| IT-03 | Wallet balance on registration | `wallet.balance === 50000` | ✅ |
| IT-04 | Duplicate email | 409 `{ error: "Email already registered" }` | ✅ |
| IT-05 | Invalid input (bad email) | 400 `{ error: "Invalid input" }` | ✅ |
| IT-06 | 3 seed cards created | Cards endpoint returns 3 cards after register | ✅ |

#### POST `/api/auth/login`

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-07 | Valid credentials | 200 `{ user, wallet, token }` | ✅ |
| IT-08 | Wrong password | 401 `{ error: "Invalid email or password" }` | ✅ |
| IT-09 | Unknown email | 401 `{ error: "Invalid email or password" }` | ✅ |

#### GET `/api/auth/me`

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-10 | Valid token | 200 `{ user, wallet }` | ✅ |
| IT-11 | No token | 401 `{ error: "Unauthorized" }` | ✅ |
| IT-12 | Tampered token | 401 `{ error: "Invalid or expired token" }` | ✅ |

---

### 4.2 Wallet Routes

#### POST `/api/wallet/topup`

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-13 | Valid topup 10,000 RWF | 200 `{ transaction, balance }`, balance += 10000 | ✅ |
| IT-14 | `transaction.type === "topup"` | Correct transaction type | ✅ |
| IT-15 | Card not owned by user | 404 `{ error: "Card not found" }` | ✅ |
| IT-16 | Amount below minimum (499) | 400 `{ error: "Invalid input" }` | ✅ |

#### POST `/api/wallet/transfer`

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-17 | Valid transfer 5,000 RWF | 200, sender balance -5000, recipient balance +5000 | ✅ |
| IT-18 | Sender transaction type | `type === "send"` | ✅ |
| IT-19 | Recipient transaction type | `type === "receive"` | ✅ |
| IT-20 | Self-transfer | 400 `{ error: "Cannot transfer to yourself" }` | ✅ |
| IT-21 | Insufficient balance | 400 `{ error: "Insufficient balance" }` | ✅ |
| IT-22 | Recipient not found | 404 `{ error: "Recipient not found" }` | ✅ |

#### POST `/api/wallet/pay`

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-23 | Valid payment 2,000 RWF | 200, balance -= 2000, `transaction.type === "payment"` | ✅ |
| IT-24 | Insufficient balance | 400 `{ error: "Insufficient wallet balance" }` | ✅ |

---

### 4.3 Cards Routes

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-25 | GET `/api/cards` — returns only user's cards | All cards have correct `userId` | ✅ |
| IT-26 | POST `/api/cards` — add valid card | 201 `{ card }` | ✅ |
| IT-27 | POST `/api/cards` — invalid last4 (3 chars) | 400 `{ error: "Invalid input" }` | ✅ |
| IT-28 | DELETE `/api/cards/:id` — own card | 200 `{ success: true }` | ✅ |
| IT-29 | DELETE `/api/cards/:id` — another user's card | 404 `{ error: "Card not found" }` | ✅ |
| IT-30 | PUT `/api/cards/:id/default` | 200, card `isDefault === true`, others `isDefault === false` | ✅ |

---

### 4.4 Transactions Routes

| Test ID | Scenario | Expected | Pass/Fail |
|---|---|---|---|
| IT-31 | GET `/api/transactions?limit=5` | `transactions.length <= 5` | ✅ |
| IT-32 | GET `/api/transactions?type=topup` | All returned have `type === "topup"` | ✅ |
| IT-33 | GET `/api/transactions?limit=200` | Capped at 100 | ✅ |
| IT-34 | GET `/api/transactions/analytics` | Returns `{ byCategory, monthly, totalIn, totalOut, days: 30 }` | ✅ |
| IT-35 | Analytics `totalIn` calculation | Sum of topup + receive amounts | ✅ |
| IT-36 | Analytics `totalOut` calculation | Sum of send + payment amounts | ✅ |
| IT-37 | Analytics `byCategory` | Only outgoing transactions included | ✅ |

---

## 5. Component Tests — React Native

### 5.1 AuthContext

| Test ID | Scenario | Expected |
|---|---|---|
| CT-01 | `signIn` success | `user` set, token stored in SecureStore |
| CT-02 | `signIn` failure | `isSigningIn` resets to false, error propagated |
| CT-03 | `signOut` | `user === null`, token cleared |
| CT-04 | Token restore on mount | Calls `/auth/me` if token exists |
| CT-05 | Token restore fails | Clears token, shows auth screen |

### 5.2 WalletContext

| Test ID | Scenario | Expected |
|---|---|---|
| CT-06 | `refreshWallet` | Cards and transactions updated from API |
| CT-07 | API failure | Falls back to mock data |
| CT-08 | `toggleHideBalance` | `hideBalance` flips, persisted to AsyncStorage |
| CT-09 | `addTransaction` | Prepended to transactions array |

### 5.3 Transaction Row Component

| Test ID | Scenario | Expected |
|---|---|---|
| CT-10 | `type="payment"`, amount=5000 | Shows "-5,000 RWF" in red |
| CT-11 | `type="receive"`, amount=10000 | Shows "+10,000 RWF" in green |
| CT-12 | `hideBalance=true` | Shows "•••••" instead of amount |

---

## 6. End-to-End Test Scenarios

### E2E-01: Full Registration Flow
```
Steps:
  1. Launch app
  2. Tap "Create Account"
  3. Enter email, password, name
  4. Tap "Sign Up"

Expected:
  - Home screen visible
  - Wallet balance = 50,000 RWF
  - 3 cards visible in carousel
  - Welcome transaction in history
```

### E2E-02: Session Persistence
```
Steps:
  1. Register and login
  2. Kill app completely
  3. Relaunch app

Expected:
  - Home screen shown directly (no auth screen)
  - User name displayed correctly
  - Balance correct
```

### E2E-03: Top Up Wallet
```
Steps:
  1. Login
  2. Tap "Top Up" quick action
  3. Select Bank of Kigali card
  4. Enter amount 10,000
  5. Tap "Top Up"

Expected:
  - Balance increases by 10,000 RWF
  - New topup transaction appears in history
  - Transaction type = "topup"
```

### E2E-04: Send Money
```
Steps:
  1. Login as User A (balance: 50,000)
  2. Tap "Send"
  3. Enter User B email, amount 5,000, description "lunch"
  4. Tap "Send Money"

Expected:
  - User A balance = 45,000 RWF
  - User B balance increases by 5,000 RWF
  - User A has "send" transaction
  - User B has "receive" transaction
```

### E2E-05: NFC Tap-to-Pay
```
Steps:
  1. Login
  2. Tap "Pay" tab
  3. Enter merchant "Simba Supermarket", amount 2,000
  4. Tap "Start Scanning"
  5. Wait 2.5s for terminal detection
  6. Tap "Authenticate & Pay"
  7. Complete biometric prompt

Expected:
  - "Payment successful!" shown
  - Wallet balance decreased by 2,000 RWF
  - Payment transaction in history
  - Category recorded correctly
```

### E2E-06: Demo Account
```
Steps:
  1. Tap "Try Demo" on auth screen

Expected:
  - Home screen shown as "Alex Mugisha"
  - Seeded transactions visible
  - 3 cards in carousel
  - Balance = 50,000 RWF
```

### E2E-07: Hide Balance Toggle
```
Steps:
  1. Login
  2. Verify balance visible on home
  3. Tap eye icon
  4. Kill and relaunch app

Expected:
  - Balance shows "•••••••" after toggle
  - Balance still hidden after relaunch (persisted)
```

---

## 7. Security Test Checklist

| Test ID | Check | Method | Pass Criteria |
|---|---|---|---|
| SEC-01 | Password not in API response | Inspect register/login/me responses | No `passwordHash` field |
| SEC-02 | JWT required on protected routes | Call `/api/wallet` without token | 401 response |
| SEC-03 | JWT tamper detection | Modify JWT payload, call protected route | 401 response |
| SEC-04 | SQL injection via email | `email: "' OR 1=1 --"` | 400 — Zod rejects before DB |
| SEC-05 | Cross-user card access | Use another user's card ID | 404 response |
| SEC-06 | Cross-user wallet access | JWT scopes to `req.user.userId` | Only own wallet returned |
| SEC-07 | Self-transfer prevention | Transfer to own email | 400 error |
| SEC-08 | Biometric required for payment | Skip biometric in pay flow | Payment blocked |

---

## 8. Test Coverage Targets

| Module | Target Coverage |
|---|---|
| Zod schemas (`lib/db`) | 100% |
| JWT service | 100% |
| Auth routes | 90%+ |
| Wallet routes | 90%+ |
| Cards routes | 85%+ |
| Transactions routes | 85%+ |
| AuthContext | 80%+ |
| WalletContext | 80%+ |
| UI Components | 70%+ |

---

## 9. Test Schedule

| Phase | Activity | Timing |
|---|---|---|
| Unit Tests | Schema validation, JWT, utilities | During development |
| Integration Tests | All API endpoints | After each feature |
| Component Tests | Context and UI components | After mobile screens complete |
| E2E Tests | Full user flows | Before submission |
| Security Tests | Auth and input validation | Before submission |
| Manual Testing | Visual UI, device testing | Final review |

---

## 10. Bug Reporting

Any failed test is documented with:
- Test ID
- Steps to reproduce
- Expected result
- Actual result
- Severity (Critical / High / Medium / Low)
- Status (Open / Fixed / Verified)
