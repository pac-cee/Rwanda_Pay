# Rwanda Pay — Testing Strategy & Test Plan

---

## 1. Testing Overview

| Level | Scope | Tools |
|---|---|---|
| Unit | Individual functions, validators, utilities | Jest / Vitest |
| Integration | API route handlers + database | Jest + Supertest + test DB |
| Component | React Native UI components | React Native Testing Library |
| End-to-End | Full user flows on device/emulator | Detox / Maestro |
| Security | Auth, JWT, input validation | Manual + OWASP checklist |

---

## 2. Unit Tests

### 2.1 Zod Schema Validation

#### `registerSchema`

| Test | Input | Expected |
|---|---|---|
| Valid registration | `{ email: "a@b.com", password: "abc123", name: "Alice" }` | Pass |
| Invalid email | `{ email: "notanemail", password: "abc123", name: "Alice" }` | Fail — invalid email |
| Short password | `{ email: "a@b.com", password: "abc", name: "Alice" }` | Fail — min 6 chars |
| Empty name | `{ email: "a@b.com", password: "abc123", name: "" }` | Fail — min 1 char |
| Optional phone | `{ email: "a@b.com", password: "abc123", name: "Alice", phone: "+250788" }` | Pass |

#### `topupSchema`

| Test | Input | Expected |
|---|---|---|
| Valid topup | `{ cardId: "<uuid>", amount: 5000 }` | Pass |
| Amount too low | `{ cardId: "<uuid>", amount: 499 }` | Fail — min 500 |
| Amount too high | `{ cardId: "<uuid>", amount: 5_000_001 }` | Fail — max 5,000,000 |
| Non-integer amount | `{ cardId: "<uuid>", amount: 100.5 }` | Fail — must be integer |
| Invalid UUID | `{ cardId: "not-a-uuid", amount: 1000 }` | Fail — invalid UUID |

#### `transferSchema`

| Test | Input | Expected |
|---|---|---|
| Valid transfer | `{ recipientEmail: "b@b.com", amount: 500, description: "lunch" }` | Pass |
| Amount too low | `{ recipientEmail: "b@b.com", amount: 99, description: "x" }` | Fail — min 100 |
| Empty description | `{ recipientEmail: "b@b.com", amount: 500, description: "" }` | Fail — min 1 char |

#### `addCardSchema`

| Test | Input | Expected |
|---|---|---|
| Valid Visa card | `{ last4: "1234", cardType: "visa", holderName: "Alice" }` | Pass |
| last4 wrong length | `{ last4: "12", cardType: "visa", holderName: "Alice" }` | Fail — must be 4 chars |
| Invalid card type | `{ last4: "1234", cardType: "discover", holderName: "Alice" }` | Fail — invalid enum |

---

### 2.2 JWT Service

| Test | Scenario | Expected |
|---|---|---|
| Sign + verify | Sign `{ userId, email }`, verify same token | Returns original payload |
| Expired token | Verify a token past its expiry | Throws error |
| Tampered token | Modify token payload, verify | Throws error |
| Missing secret | Sign without SESSION_SECRET set | Throws / uses fallback |

---

### 2.3 Utility Functions

#### `makeInitials(name)`

| Input | Expected Output |
|---|---|
| `"Alice Mugisha"` | `"AM"` |
| `"Alice"` | `"A"` |
| `"Alice Marie Mugisha"` | `"AM"` (first 2 only) |
| `""` | `""` |

---

## 3. Integration Tests (API Routes)

### 3.1 Auth Routes

#### POST `/api/auth/register`

```
Test: Successful registration
  POST /api/auth/register { email, password, name }
  → 201 { user, wallet: { balance: 50000 }, token }
  → user.passwordHash not present in response
  → wallet.balance === 50000

Test: Duplicate email
  Register same email twice
  → 409 { error: "Email already registered" }

Test: Invalid input
  POST /api/auth/register { email: "bad" }
  → 400 { error: "Invalid input" }
```

#### POST `/api/auth/login`

```
Test: Valid credentials
  → 200 { user, wallet, token }

Test: Wrong password
  → 401 { error: "Invalid email or password" }

Test: Unknown email
  → 401 { error: "Invalid email or password" }
```

#### GET `/api/auth/me`

```
Test: Valid token
  GET /api/auth/me  Authorization: Bearer <valid>
  → 200 { user, wallet }

Test: No token
  → 401 { error: "Unauthorized" }

Test: Expired/invalid token
  → 401 { error: "Invalid or expired token" }
```

---

### 3.2 Wallet Routes

#### POST `/api/wallet/topup`

```
Test: Valid topup
  POST /api/wallet/topup { cardId: <user's card>, amount: 10000 }
  → 200 { transaction, balance }
  → balance === previousBalance + 10000
  → transaction.type === "topup"

Test: Card not owned by user
  POST /api/wallet/topup { cardId: <other user's card>, amount: 1000 }
  → 404 { error: "Card not found" }

Test: Amount below minimum
  → 400 { error: "Invalid input" }
```

#### POST `/api/wallet/transfer`

```
Test: Valid transfer
  → 200 { transaction, balance }
  → sender balance decremented
  → recipient balance incremented
  → sender transaction type === "send"
  → recipient transaction type === "receive"

Test: Self-transfer
  → 400 { error: "Cannot transfer to yourself" }

Test: Insufficient balance
  → 400 { error: "Insufficient balance" }

Test: Recipient not found
  → 404 { error: "Recipient not found" }
```

#### POST `/api/wallet/pay`

```
Test: Valid payment
  → 200 { transaction, balance }
  → balance === previousBalance - amount
  → transaction.type === "payment"

Test: Insufficient balance
  → 400 { error: "Insufficient wallet balance" }
```

---

### 3.3 Cards Routes

#### GET `/api/cards`

```
Test: Returns user's cards only
  → 200 { cards: [...] }
  → All cards have userId === authenticated user
```

#### POST `/api/cards`

```
Test: Add valid card
  → 201 { card }
  → First card added is isDefault = true

Test: Invalid last4 (not 4 chars)
  → 400 { error: "Invalid input" }
```

#### DELETE `/api/cards/:id`

```
Test: Delete own card
  → 200 { success: true }

Test: Delete another user's card
  → 404 { error: "Card not found" }
```

#### PUT `/api/cards/:id/default`

```
Test: Set default card
  → 200 { card: { isDefault: true } }
  → All other user cards have isDefault = false
```

---

### 3.4 Transactions Routes

#### GET `/api/transactions`

```
Test: Returns paginated transactions
  GET /api/transactions?limit=5&offset=0
  → 200 { transactions: [...], total: N }
  → transactions.length <= 5

Test: Filter by type
  GET /api/transactions?type=topup
  → All returned transactions have type === "topup"

Test: Limit cap
  GET /api/transactions?limit=200
  → transactions.length <= 100
```

#### GET `/api/transactions/analytics`

```
Test: Default 30-day period
  → 200 { byCategory, monthly, totalIn, totalOut, days: 30 }

Test: Custom period
  GET /api/transactions/analytics?period=7
  → days === 7
  → Only transactions within last 7 days included

Test: totalIn = sum of topup + receive amounts
Test: totalOut = sum of send + payment amounts
Test: byCategory only includes outgoing transactions
```

---

## 4. Component Tests (React Native)

### 4.1 CardView Component

| Test | Scenario | Expected |
|---|---|---|
| Renders card details | Pass card with last4="1234" | Displays "•••• 1234" |
| Hide balance mode | `hideBalance=true` | Shows "•••••" instead of balance |
| Selected state | `isSelected=true` | Elevated shadow / scale applied |
| Card type colors | Visa card | Green (#1B5E20) background |

### 4.2 TransactionRow Component

| Test | Scenario | Expected |
|---|---|---|
| Payment transaction | type="payment", amount=5000 | Shows "-5,000 RWF" in red |
| Receive transaction | type="receive", amount=10000 | Shows "+10,000 RWF" in green |
| Topup transaction | type="topup" | Shows topup icon |
| Hide amount | `hideAmount=true` | Shows "•••••" |

### 4.3 AnalyticsChart Component

| Test | Scenario | Expected |
|---|---|---|
| Renders bars | Pass 7 data points | 7 bars rendered |
| Empty data | All values = 0 | Bars render at 0 height |
| Max bar | Highest value bar | Full height (maxHeight) |

### 4.4 AuthContext

| Test | Scenario | Expected |
|---|---|---|
| signIn success | Mock API returns user+token | user set, token stored |
| signIn failure | Mock API throws | isSigningIn resets to false |
| signOut | Call signOut() | user=null, token cleared |
| Token restore | Token in secure store | Calls /auth/me on mount |

### 4.5 WalletContext

| Test | Scenario | Expected |
|---|---|---|
| refreshWallet | API returns cards+txs | State updated with API data |
| API failure | API throws | Falls back to mock data |
| toggleHideBalance | Call toggle | hideBalance flips, persisted to AsyncStorage |
| addTransaction | Add new tx | Prepended to transactions array |

---

## 5. End-to-End Test Scenarios

### E2E-01: Full Registration Flow
```
1. Launch app
2. Tap "Create Account"
3. Enter email, password, name
4. Tap "Sign Up"
5. Assert: Home screen visible
6. Assert: Wallet balance = 50,000 RWF
7. Assert: 3 cards visible in carousel
```

### E2E-02: Login & Persist Session
```
1. Register user
2. Kill app
3. Relaunch app
4. Assert: Home screen shown (no auth screen)
5. Assert: User name displayed correctly
```

### E2E-03: Top Up Wallet
```
1. Login
2. Tap "Top Up" quick action
3. Select first card
4. Enter amount 10,000
5. Tap "Top Up"
6. Assert: Balance increased by 10,000
7. Assert: New topup transaction in list
```

### E2E-04: Send Money
```
1. Login as User A
2. Login as User B (separate session)
3. As User A: Tap "Send", enter User B email, amount 5,000
4. Tap "Send Money"
5. Assert: User A balance decreased by 5,000
6. Assert: User B balance increased by 5,000
7. Assert: User A has "send" transaction
8. Assert: User B has "receive" transaction
```

### E2E-05: NFC Payment Flow
```
1. Login
2. Tap "Pay" tab
3. Enter merchant "Test Shop", amount 2,000
4. Tap "Start Scanning"
5. Wait 2.5s for terminal detection
6. Tap "Authenticate & Pay"
7. Complete biometric prompt
8. Assert: "Payment successful!" shown
9. Assert: Wallet balance decreased by 2,000
10. Assert: Payment transaction in history
```

### E2E-06: Demo Account
```
1. Tap "Try Demo"
2. Assert: Home screen shown as "Alex Mugisha"
3. Assert: Seeded transactions visible
4. Assert: 3 cards in carousel
```

### E2E-07: Hide Balance Toggle
```
1. Login
2. Assert: Balance visible on home
3. Tap eye icon
4. Assert: Balance shows "•••••••"
5. Kill and relaunch app
6. Assert: Balance still hidden (persisted)
```

---

## 6. Security Test Checklist

| Check | Method | Pass Criteria |
|---|---|---|
| Password not returned in API | Inspect register/login/me responses | No `passwordHash` field present |
| JWT required on protected routes | Call `/api/wallet` without token | 401 response |
| JWT tamper detection | Modify JWT payload, call protected route | 401 response |
| SQL injection via email field | `email: "' OR 1=1 --"` | 400 validation error (Zod rejects) |
| Cross-user card access | Use card ID from another user | 404 response |
| Cross-user wallet access | JWT always scopes to `req.user.userId` | Only own wallet returned |
| Balance overflow | Topup to max integer | Handled gracefully |
| Self-transfer | Transfer to own email | 400 error |

---

## 7. Test Data Setup

```typescript
// Seed test user
const testUser = {
  email: "test@rwandapay.rw",
  password: "test1234",
  name: "Test User",
};

// Seed second user for transfer tests
const recipientUser = {
  email: "recipient@rwandapay.rw",
  password: "test1234",
  name: "Recipient User",
};

// Expected seed state after registration
const expectedSeedState = {
  walletBalance: 50000,
  cardCount: 3,
  transactionCount: 5,
  cards: [
    { cardName: "Bank of Kigali", cardType: "visa", isDefault: true },
    { cardName: "MTN MoMo", cardType: "mastercard", isDefault: false },
    { cardName: "I&M Bank", cardType: "mastercard", isDefault: false },
  ],
};
```

---

## 8. Test Coverage Targets

| Module | Target Coverage |
|---|---|
| Zod schemas (lib/db) | 100% |
| JWT service | 100% |
| Auth routes | 90%+ |
| Wallet routes | 90%+ |
| Cards routes | 85%+ |
| Transactions routes | 85%+ |
| AuthContext | 80%+ |
| WalletContext | 80%+ |
| UI Components | 70%+ |
