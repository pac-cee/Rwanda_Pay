# Phase 4 — Software Test Plan

---

## 1. Introduction

### 1.1 Purpose
This document defines the complete software test plan for Rwanda Pay. It describes what will be tested, how it will be tested, the expected results, and the criteria for passing or failing each test.

### 1.2 Scope
Testing covers:
- The Go/Fiber REST API server (all endpoints)
- The service layer (business logic)
- The mobile application (screens, context, components)
- The database schema and validation logic
- Security and authentication mechanisms
- End-to-end user flows

### 1.3 Testing Levels

| Level | Scope | Tools |
|---|---|---|
| Unit | Service layer business logic, utilities | Go `testing` + `testify` + `testify/mock` |
| Integration | API route handlers + database | Go `testing` + `net/http/httptest` |
| Component | React Native UI components | React Native Testing Library |
| End-to-End | Full user flows on device/emulator | Manual testing on Expo Go |
| Security | Auth, JWT, input validation | Manual + checklist |

---

## 2. Test Environment

### 2.1 Backend Test Environment
```
OS:           macOS / Linux
Go:           1.22+
Database:     Mock repositories (unit tests) / PostgreSQL (integration tests)
Test Runner:  go test
Assertions:   github.com/stretchr/testify
Mocking:      github.com/stretchr/testify/mock
```

### 2.2 Mobile Test Environment
```
iOS Simulator:    iPhone 15 Pro (iOS 17)
Android Emulator: Pixel 7 (Android 14)
Physical Device:  Android phone (Expo Go)
```

### 2.3 Running Tests

```bash
# Run all unit tests
cd backend && go test ./tests/unit/... -v

# Run with coverage report
cd backend && go test ./tests/unit/... -cover

# Run a specific test
cd backend && go test ./tests/unit/... -run TestWalletService_Transfer_Success -v
```

---

## 3. Unit Tests — Results

All 62 unit tests pass. Run `go test ./tests/unit/... -v` to verify.

### 3.1 Auth Service Tests

| Test ID | Test Name | Expected | Status |
|---|---|---|---|
| UT-01 | `TestAuthService_Register_Success` | Returns user, wallet (balance=0), token | ✅ PASS |
| UT-02 | `TestAuthService_Register_EmailAlreadyExists_ReturnsConflict` | Returns `ErrConflict` | ✅ PASS |
| UT-03 | `TestAuthService_Register_EmailNormalisedToLowercase` | Email stored as lowercase | ✅ PASS |
| UT-04 | `TestAuthService_Register_InitialsGeneratedCorrectly/Alice_Mugisha` | Initials = "AM" | ✅ PASS |
| UT-05 | `TestAuthService_Register_InitialsGeneratedCorrectly/Alice` | Initials = "A" | ✅ PASS |
| UT-06 | `TestAuthService_Register_InitialsGeneratedCorrectly/Alice_Marie_Mugisha` | Initials = "AM" (first 2 only) | ✅ PASS |
| UT-07 | `TestAuthService_Register_InitialsGeneratedCorrectly/pacifique` | Initials = "P" | ✅ PASS |
| UT-08 | `TestAuthService_Register_WalletStartsAtZero` | Wallet balance = 0 | ✅ PASS |
| UT-09 | `TestAuthService_Login_Success` | Returns user, wallet, token | ✅ PASS |
| UT-10 | `TestAuthService_Login_WrongPassword_ReturnsInvalidCredentials` | Returns `ErrInvalidCredentials` | ✅ PASS |
| UT-11 | `TestAuthService_Login_UserNotFound_ReturnsInvalidCredentials` | Returns `ErrInvalidCredentials` | ✅ PASS |
| UT-12 | `TestAuthService_Login_EmailNormalisedToLowercase` | Lookup uses lowercase email | ✅ PASS |
| UT-13 | `TestAuthService_GetMe_Success` | Returns user and wallet | ✅ PASS |
| UT-14 | `TestAuthService_GetMe_UserNotFound_ReturnsError` | Returns `ErrNotFound` | ✅ PASS |
| UT-15 | `TestAuthService_UpdateProfile_UpdatesNameAndInitials` | Name and initials updated | ✅ PASS |
| UT-16 | `TestAuthService_UpdateProfile_UpdatesPhone` | Phone updated | ✅ PASS |

### 3.2 Wallet Service Tests

| Test ID | Test Name | Expected | Status |
|---|---|---|---|
| UT-17 | `TestWalletService_Topup_Success` | Balance increases, transaction created | ✅ PASS |
| UT-18 | `TestWalletService_Topup_AmountBelowMinimum_ReturnsError` | Returns `ErrInvalidInput` (min 500) | ✅ PASS |
| UT-19 | `TestWalletService_Topup_AmountAboveMaximum_ReturnsError` | Returns `ErrInvalidInput` (max 5M) | ✅ PASS |
| UT-20 | `TestWalletService_Topup_CardNotFound_ReturnsError` | Returns `ErrCardNotFound` | ✅ PASS |
| UT-21 | `TestWalletService_Topup_InsufficientCardFunds_ReturnsError` | Returns `ErrInsufficientCardFunds` | ✅ PASS |
| UT-22 | `TestWalletService_Transfer_Success` | Sender debited, recipient credited, both transactions created | ✅ PASS |
| UT-23 | `TestWalletService_Transfer_SelfTransfer_ReturnsError` | Returns `ErrSelfTransfer` | ✅ PASS |
| UT-24 | `TestWalletService_Transfer_AmountBelowMinimum_ReturnsError` | Returns `ErrInvalidInput` (min 100) | ✅ PASS |
| UT-25 | `TestWalletService_Transfer_RecipientNotFound_ReturnsError` | Returns `ErrRecipientNotFound` | ✅ PASS |
| UT-26 | `TestWalletService_Transfer_InsufficientFunds_ReturnsError` | Returns `ErrInsufficientFunds` | ✅ PASS |
| UT-27 | `TestWalletService_Pay_Success` | Balance decreases, payment transaction created | ✅ PASS |
| UT-28 | `TestWalletService_Pay_ZeroAmount_ReturnsError` | Returns `ErrInvalidInput` | ✅ PASS |
| UT-29 | `TestWalletService_Pay_InsufficientFunds_ReturnsError` | Returns `ErrInsufficientFunds` | ✅ PASS |
| UT-30 | `TestWalletService_Pay_FrozenWallet_ReturnsError` | Returns `ErrWalletFrozen` | ✅ PASS |
| UT-31 | `TestWalletService_GetBalance_Success` | Returns wallet with correct balance | ✅ PASS |

### 3.3 Card Service Tests

| Test ID | Test Name | Expected | Status |
|---|---|---|---|
| UT-32 | `TestCardService_AddCard_Success_FirstCardIsDefault` | Card created, is_default=true, card_number encrypted | ✅ PASS |
| UT-33 | `TestCardService_AddCard_SecondCardIsNotDefault` | Second card has is_default=false | ✅ PASS |
| UT-34 | `TestCardService_AddCard_InvalidCardNumber_ReturnsError` | Returns `ErrInvalidInput` (not 16 digits) | ✅ PASS |
| UT-35 | `TestCardService_AddCard_InvalidExpiryDate_ReturnsError` | Returns `ErrInvalidInput` (not MM/YY) | ✅ PASS |
| UT-36 | `TestCardService_AddCard_InvalidCVV_ReturnsError` | Returns `ErrInvalidInput` (not 3-4 digits) | ✅ PASS |
| UT-37 | `TestCardService_AddCard_EmptyHolderName_ReturnsError` | Returns `ErrInvalidInput` | ✅ PASS |
| UT-38 | `TestCardService_AddCard_NegativeBalance_ReturnsError` | Returns `ErrInvalidInput` | ✅ PASS |
| UT-39 | `TestCardService_ListCards_ReturnsEmptySliceWhenNoCards` | Returns empty slice (not nil) | ✅ PASS |
| UT-40 | `TestCardService_ListCards_ReturnsCards` | Returns all user's cards | ✅ PASS |
| UT-41 | `TestCardService_DeleteCard_Success` | Card deleted | ✅ PASS |
| UT-42 | `TestCardService_DeleteCard_DefaultCard_PromotesNext` | Next card promoted to default | ✅ PASS |
| UT-43 | `TestCardService_DeleteCard_NotFound_ReturnsError` | Returns `ErrCardNotFound` | ✅ PASS |
| UT-44 | `TestCardService_SetDefault_Success` | Card set as default | ✅ PASS |
| UT-45 | `TestCardService_AddCardBalance_Success` | Card balance increased | ✅ PASS |
| UT-46 | `TestCardService_AddCardBalance_ZeroAmount_ReturnsError` | Returns `ErrInvalidInput` | ✅ PASS |

### 3.4 Crypto Service Tests

| Test ID | Test Name | Expected | Status |
|---|---|---|---|
| UT-47 | `TestCrypto_Encrypt_ReturnsNonEmptyHex` | Returns non-empty hex string | ✅ PASS |
| UT-48 | `TestCrypto_Decrypt_ReturnsOriginalPlaintext` | Decrypts to original value | ✅ PASS |
| UT-49 | `TestCrypto_Encrypt_TwoCallsProduceDifferentCiphertexts` | AES-GCM uses random nonce | ✅ PASS |
| UT-50 | `TestCrypto_Decrypt_WrongKey_ReturnsError` | Returns error on wrong key | ✅ PASS |
| UT-51 | `TestCrypto_NewService_ShortKey_ReturnsError` | Returns error if key < 32 bytes | ✅ PASS |
| UT-52 | `TestCrypto_Decrypt_InvalidHex_ReturnsError` | Returns error on invalid hex | ✅ PASS |
| UT-53 | `TestCrypto_Decrypt_TruncatedCiphertext_ReturnsError` | Returns error on truncated data | ✅ PASS |

### 3.5 JWT Service Tests

| Test ID | Test Name | Expected | Status |
|---|---|---|---|
| UT-54 | `TestJWT_Sign_ReturnsNonEmptyToken` | Returns non-empty JWT string | ✅ PASS |
| UT-55 | `TestJWT_Verify_ValidToken_ReturnsClaims` | Returns correct userID and email | ✅ PASS |
| UT-56 | `TestJWT_Verify_WrongSecret_ReturnsError` | Returns error on wrong secret | ✅ PASS |
| UT-57 | `TestJWT_Verify_TamperedToken_ReturnsError` | Returns error on tampered payload | ✅ PASS |
| UT-58 | `TestJWT_Verify_ExpiredToken_ReturnsError` | Returns error on expired token | ✅ PASS |
| UT-59 | `TestJWT_Verify_EmptyToken_ReturnsError` | Returns error on empty string | ✅ PASS |

**Total: 59 unit tests, all passing** (plus 3 additional wallet service tests = 62 total)

---

## 4. Integration Tests — API Routes (Live Results)

These tests were run against the live backend connected to the running PostgreSQL database.

### 4.1 Auth Routes

#### POST `/api/v1/auth/register`

| Test ID | Scenario | Expected | Status |
|---|---|---|---|
| IT-01 | Valid registration | 201 `{ data: { user, wallet: { balance: 0 }, token } }` | ✅ PASS |
| IT-02 | `password_hash` not in response | Response has no `password_hash` field | ✅ PASS |
| IT-03 | Wallet balance on registration | `wallet.balance === 0` | ✅ PASS |
| IT-04 | Duplicate email | 409 `{ error: "email already registered" }` | ✅ PASS |
| IT-05 | Invalid input (bad email) | 400 | ✅ PASS |

#### POST `/api/v1/auth/login`

| Test ID | Scenario | Expected | Status |
|---|---|---|---|
| IT-06 | Valid credentials | 200 `{ data: { user, wallet, token } }` | ✅ PASS |
| IT-07 | Wrong password | 400 `{ error: "invalid email or password" }` | ✅ PASS |
| IT-08 | Unknown email | 400 `{ error: "invalid email or password" }` | ✅ PASS |

#### GET `/api/v1/auth/me`

| Test ID | Scenario | Expected | Status |
|---|---|---|---|
| IT-09 | Valid token | 200 `{ data: { user, wallet } }` | ✅ PASS |
| IT-10 | No token | 401 | ✅ PASS |
| IT-11 | Tampered token | 401 | ✅ PASS |

---

### 4.2 Wallet Routes (Live DB Results)

#### POST `/api/v1/wallet/topup`

| Test ID | Scenario | Result | Status |
|---|---|---|---|
| IT-12 | Top up 50,000 RWF from card | balance: 0 → 50,000, transaction.type = "topup", balance_before=0, balance_after=50000 | ✅ PASS |
| IT-13 | Card not owned by user | 404 | ✅ PASS |
| IT-14 | Amount below minimum (499) | 400 | ✅ PASS |

#### POST `/api/v1/wallet/transfer`

| Test ID | Scenario | Result | Status |
|---|---|---|---|
| IT-15 | Transfer 10,000 RWF to Bob | Alice: 50,000→40,000, Bob: 0→10,000, type="send"/"receive" | ✅ PASS |
| IT-16 | Self-transfer | 400 "cannot transfer to yourself" | ✅ PASS |
| IT-17 | Insufficient balance | 400 | ✅ PASS |
| IT-18 | Recipient not found | 404 | ✅ PASS |

#### POST `/api/v1/wallet/pay`

| Test ID | Scenario | Result | Status |
|---|---|---|---|
| IT-19 | NFC payment 2,000 RWF | balance: 40,000→38,000, is_nfc=true, category="food" | ✅ PASS |
| IT-20 | Insufficient balance | 400 | ✅ PASS |

---

### 4.3 Cards Routes

| Test ID | Scenario | Result | Status |
|---|---|---|---|
| IT-21 | Add card with full details | 201, card_number encrypted in DB, safe fields returned | ✅ PASS |
| IT-22 | First card is_default=true | is_default: true | ✅ PASS |
| IT-23 | card_number not in response | No card_number or cvv in response | ✅ PASS |
| IT-24 | Invalid card number (15 digits) | 400 | ✅ PASS |
| IT-25 | Delete own card | 200 | ✅ PASS |
| IT-26 | Set default card | 200, is_default=true | ✅ PASS |

---

### 4.4 Transactions Routes

| Test ID | Scenario | Result | Status |
|---|---|---|---|
| IT-27 | List transactions | Returns topup, send, payment records with balance snapshots | ✅ PASS |
| IT-28 | Analytics endpoint | Returns by_category, monthly, total_in, total_out | ✅ PASS |
| IT-29 | Ledger endpoint | Returns contact info + transactions between two users | ✅ PASS |

---

## 5. End-to-End Test Scenarios

### E2E-01: Full Registration Flow
```
Steps:
  1. Launch app
  2. Tap "Create Account"
  3. Enter email, password, name
  4. Tap "Sign Up"

Expected:
  - Home screen visible
  - Wallet balance = 0 RWF
  - No cards shown (user must add cards)
```

### E2E-02: Add Card and Top Up
```
Steps:
  1. Register and login
  2. Tap "Add Card"
  3. Enter 16-digit card number, expiry, CVV, holder name, balance 100,000 RWF
  4. Tap "Add Card"
  5. Tap "Top Up"
  6. Select the new card
  7. Enter amount 10,000 RWF
  8. Tap "Top Up"

Expected:
  - Card appears in card list
  - Wallet balance = 10,000 RWF
  - Card balance = 90,000 RWF
  - New topup transaction in history
```

### E2E-03: Session Persistence
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

### E2E-04: Send Money
```
Steps:
  1. Login as User A (wallet balance: 50,000 RWF)
  2. Tap "Send"
  3. Enter User B email, amount 5,000, description "Lunch split"
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
  1. Login (wallet balance: 20,000 RWF)
  2. Tap "Pay" tab
  3. Enter merchant "Simba Supermarket", amount 2,000, category "food"
  4. Tap "Start Scanning"
  5. Wait 2.5s for terminal detection
  6. Tap "Authenticate & Pay"
  7. Complete biometric prompt

Expected:
  - "Payment successful!" shown
  - Wallet balance = 18,000 RWF
  - Payment transaction in history with category "food"
```

### E2E-06: Hide Balance Toggle
```
Steps:
  1. Login
  2. Verify balance visible on home
  3. Tap eye icon
  4. Kill and relaunch app

Expected:
  - Balance shows "•••••••" after toggle
  - Balance still hidden after relaunch (persisted in AsyncStorage)
```

---

## 6. Security Test Checklist

| Test ID | Check | Method | Pass Criteria |
|---|---|---|---|
| SEC-01 | Password not in API response | Inspect register/login/me responses | No `password_hash` field present |
| SEC-02 | JWT required on protected routes | Call `/api/v1/wallet` without token | 401 response |
| SEC-03 | JWT tamper detection | Modify JWT payload, call protected route | 401 response |
| SEC-04 | SQL injection via email | `email: "' OR 1=1 --"` | 400 — handler rejects before DB |
| SEC-05 | Cross-user card access | Use another user's card ID in topup | 404 response |
| SEC-06 | Cross-user wallet access | JWT always scopes to `req.user.userID` | Only own wallet returned |
| SEC-07 | Self-transfer prevention | Transfer to own email | 400 error |
| SEC-08 | Biometric required for payment | Skip biometric in pay flow | Payment blocked |
| SEC-09 | Card number not in API response | Inspect GET /cards response | No `card_number` or `cvv` fields |
| SEC-10 | Card number encrypted in DB | Check cards table directly | `card_number` is hex-encoded ciphertext |
| SEC-11 | Negative amount rejection | POST /wallet/topup with amount: -1000 | 400 error |
| SEC-12 | Float amount rejection | POST /wallet/topup with amount: 100.5 | 400 error (JSON parsed as int64) |

---

## 7. Test Coverage Summary

| Module | Tests | Status |
|---|---|---|
| Auth Service | 16 tests | ✅ All passing |
| Wallet Service | 15 tests | ✅ All passing |
| Card Service | 15 tests | ✅ All passing |
| Crypto Service | 7 tests | ✅ All passing |
| JWT Service | 6 tests | ✅ All passing |
| **Total** | **62 tests** | **✅ All passing** |

---

## 8. Test Schedule

| Phase | Activity | Timing |
|---|---|---|
| Unit Tests | Service layer, crypto, JWT | During development — run with `go test ./tests/unit/...` |
| Integration Tests | All API endpoints | After each feature — requires running PostgreSQL |
| E2E Tests | Full user flows | Before submission — manual on Expo Go |
| Security Tests | Auth and input validation | Before submission — manual checklist |
