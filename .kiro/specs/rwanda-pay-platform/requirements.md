# Requirements Document

## Introduction

Rwanda Pay is an existing fintech mobile payment platform built with a Go/Fiber backend, PostgreSQL database, and a React Native (Expo) mobile app. The system already has a working foundation: JWT authentication, wallet management, card management, peer-to-peer transfers, merchant payments, and transaction history.

This document specifies the requirements to **extend and harden** the existing system across seven phases:

- **Phase 1 — Backend Stabilization**: Fix critical race conditions, add database transactions, idempotency, and structured logging.
- **Phase 2 — Database Improvements**: Add missing tables (nfc_payments, devices, audit_logs, saved_cards), indexes, and constraints.
- **Phase 3 — Payment/Wallet Logic**: Harden wallet operations with row-level locking, atomic SQL, and proper error handling.
- **Phase 4 — Stripe Integration**: Replace the simulated card-balance model with real Stripe payment methods, SetupIntents, PaymentIntents, and webhooks.
- **Phase 5 — Mobile App Integration**: Connect the React Native app to all new backend endpoints with proper TypeScript types, error handling, and loading states.
- **Phase 6 — NFC Payments**: Implement a cryptographically signed token-based NFC wallet-to-wallet payment flow using react-native-nfc-manager.
- **Phase 7 — Security + Hardening**: Add rate limiting, refresh tokens, audit logging, input sanitization, and CORS hardening.

The existing codebase uses: Go 1.26, Fiber v2, pgx/v5 (pgxpool), UUID primary keys, BIGINT for all monetary values in RWF, bcrypt for passwords, AES-256-GCM for card number encryption, and JWT (HS256) for authentication.

---

## Glossary

- **System**: The Rwanda Pay platform (backend API + mobile app + database).
- **API**: The Go/Fiber HTTP backend server.
- **App**: The React Native (Expo) mobile application.
- **Wallet**: A user's single RWF-denominated balance account stored in the `wallets` table.
- **Card**: A payment card linked to a user. In Phase 1–3, cards have their own simulated balance. In Phase 4+, cards are replaced by Stripe-backed saved payment methods.
- **Saved_Card**: A Stripe payment method (card) saved to a user's Stripe customer account, stored in the `saved_cards` table. Never stores raw card numbers.
- **Transaction**: An immutable financial event record stored in the `transactions` table.
- **NFC_Payment**: A wallet-to-wallet payment initiated via NFC, using a signed payment token. Stored in the `nfc_payments` table.
- **Payment_Token**: A short-lived, cryptographically signed JSON payload created by the API for NFC transfers. Contains sender ID, amount, nonce, and expiry.
- **Stripe_Customer**: A Stripe-side customer object linked to a Rwanda Pay user via `stripe_customer_id` on the `users` table.
- **SetupIntent**: A Stripe object used to securely collect and save a card's payment method without charging it.
- **PaymentIntent**: A Stripe object used to charge a saved payment method and move funds.
- **Webhook**: An HTTP POST from Stripe to the API notifying of payment events (e.g., `payment_intent.succeeded`).
- **Idempotency_Key**: A unique client-generated key sent with payment requests to prevent duplicate charges on retry.
- **Audit_Log**: An immutable record of every sensitive action (login, payment, card add/remove, freeze) stored in the `audit_logs` table.
- **Device**: A registered mobile device associated with a user, stored in the `devices` table.
- **Refresh_Token**: A long-lived token used to obtain a new access JWT without re-entering credentials.
- **Rate_Limiter**: A middleware component that restricts the number of requests per IP or user within a time window.
- **Repository**: A Go struct implementing a data-access interface for a specific domain entity.
- **Service**: A Go struct containing business logic, calling one or more Repositories.
- **Handler**: A Go Fiber handler function that parses HTTP requests, calls a Service, and returns HTTP responses.
- **DTO**: Data Transfer Object — a struct used to pass data between layers without exposing domain models directly.
- **RWF**: Rwandan Franc, the currency used throughout the system. All amounts are stored as BIGINT in the smallest unit (1 RWF = 1 unit, no sub-units).

---

## Requirements

### Requirement 1: Atomic Wallet Operations (Phase 1 + 3)

**User Story:** As a platform operator, I want all wallet balance changes to be atomic database transactions, so that race conditions and partial updates cannot corrupt user balances.

#### Acceptance Criteria

1. WHEN a top-up, transfer, or payment operation is executed, THE API SHALL wrap all balance reads and writes in a single PostgreSQL transaction using `pgxpool.Pool.Begin()` or `pgxpool.Pool.BeginTx()`.
2. WHEN a database transaction is started for a wallet operation, THE Repository SHALL acquire a row-level lock on the wallet row using `SELECT ... FOR UPDATE` before reading the balance.
3. IF any step within a wallet database transaction fails, THEN THE API SHALL roll back the entire transaction and return an appropriate error — no partial balance changes SHALL be committed.
4. WHEN a transfer is executed between two wallets, THE Repository SHALL lock both wallet rows in a consistent order (by wallet UUID ascending) to prevent deadlocks.
5. THE Wallet_Repository SHALL expose a `TransferTx(ctx, senderWalletID, recipientWalletID, amount)` method that performs the full debit-credit atomically within one database transaction.
6. THE Wallet_Repository SHALL expose a `TopupTx(ctx, walletID, cardID, amount)` method that atomically debits the card balance and credits the wallet balance within one database transaction.
7. WHEN a wallet balance update is committed, THE wallets table `updated_at` column SHALL be set to the current timestamp within the same transaction.
8. THE System SHALL never use application-level manual rollback (e.g., calling `UpdateBalance` again to undo) as a substitute for database transactions.

---

### Requirement 2: Idempotency for Payment Operations (Phase 1)

**User Story:** As a mobile app user, I want retried payment requests to not result in duplicate charges, so that network failures do not cause me to be charged twice.

#### Acceptance Criteria

1. THE API SHALL accept an `Idempotency-Key` HTTP header on `POST /api/v1/wallet/topup`, `POST /api/v1/wallet/transfer`, and `POST /api/v1/wallet/pay` endpoints.
2. WHEN a request is received with an `Idempotency-Key`, THE API SHALL check the `idempotency_keys` table (or a Redis cache) for a prior response stored under that key.
3. IF a prior response exists for the given `Idempotency-Key`, THEN THE API SHALL return the cached response with HTTP 200 without re-executing the operation.
4. WHEN a payment operation completes successfully, THE API SHALL store the idempotency key and the serialized response in the `idempotency_keys` table with a TTL of 24 hours.
5. IF an `Idempotency-Key` is not provided on a payment endpoint, THEN THE API SHALL proceed without idempotency protection (the key is optional but recommended).
6. THE `idempotency_keys` table SHALL have columns: `key` (VARCHAR UNIQUE), `user_id` (UUID FK), `response_body` (JSONB), `created_at` (TIMESTAMPTZ), and `expires_at` (TIMESTAMPTZ).

---

### Requirement 3: Structured Logging and Error Handling (Phase 1)

**User Story:** As a developer, I want structured JSON logs for all requests and errors, so that I can debug production issues efficiently.

#### Acceptance Criteria

1. THE API SHALL use a structured logger (e.g., `log/slog` from Go stdlib or `zerolog`) that outputs JSON-formatted log entries.
2. WHEN an HTTP request is received, THE API SHALL log the method, path, status code, latency, and request ID at INFO level.
3. WHEN an unhandled error occurs in a handler, THE API SHALL log the error with stack trace at ERROR level and return a generic `{"success": false, "error": "internal server error"}` response — never exposing internal error details to the client.
4. WHEN a domain error occurs (e.g., `ErrInsufficientFunds`), THE API SHALL return a structured error response `{"success": false, "error": "<human-readable message>"}` with the appropriate HTTP status code.
5. THE API SHALL include a `recover` middleware that catches panics, logs them at ERROR level, and returns HTTP 500 — the existing `recover.New()` middleware satisfies this requirement.
6. WHEN the application starts, THE API SHALL log the environment, port, and database connection status at INFO level.
7. THE API SHALL add a unique `X-Request-ID` header to every response, generated per request, for correlation in logs.

---

### Requirement 4: Database Schema Improvements (Phase 2)

**User Story:** As a platform operator, I want the database schema to include all tables needed for NFC payments, device tracking, audit logging, and Stripe integration, so that the system can support all planned features without schema migrations mid-development.

#### Acceptance Criteria

1. THE Database SHALL contain a `saved_cards` table with columns: `id` (UUID PK), `user_id` (UUID FK → users), `stripe_payment_method_id` (TEXT NOT NULL), `last4` (CHAR(4)), `brand` (VARCHAR(20)), `exp_month` (SMALLINT), `exp_year` (SMALLINT), `holder_name` (VARCHAR(255)), `is_default` (BOOLEAN DEFAULT FALSE), `created_at` (TIMESTAMPTZ), `updated_at` (TIMESTAMPTZ).
2. THE Database SHALL contain a `nfc_payments` table with columns: `id` (UUID PK), `token` (TEXT UNIQUE NOT NULL), `sender_id` (UUID FK → users), `receiver_id` (UUID FK → users, nullable), `amount` (BIGINT NOT NULL CHECK > 0), `status` (ENUM: 'pending', 'completed', 'expired', 'cancelled'), `expires_at` (TIMESTAMPTZ NOT NULL), `completed_at` (TIMESTAMPTZ), `transaction_id` (UUID FK → transactions, nullable), `created_at` (TIMESTAMPTZ).
3. THE Database SHALL contain a `devices` table with columns: `id` (UUID PK), `user_id` (UUID FK → users), `device_token` (TEXT UNIQUE NOT NULL), `platform` (VARCHAR(10)), `device_name` (VARCHAR(255)), `last_seen_at` (TIMESTAMPTZ), `is_active` (BOOLEAN DEFAULT TRUE), `created_at` (TIMESTAMPTZ).
4. THE Database SHALL contain an `audit_logs` table with columns: `id` (UUID PK), `user_id` (UUID FK → users, nullable), `action` (VARCHAR(100) NOT NULL), `entity_type` (VARCHAR(50)), `entity_id` (VARCHAR(100)), `ip_address` (INET), `user_agent` (TEXT), `metadata` (JSONB), `created_at` (TIMESTAMPTZ NOT NULL DEFAULT NOW()).
5. THE Database SHALL contain a `refresh_tokens` table with columns: `id` (UUID PK), `user_id` (UUID FK → users ON DELETE CASCADE), `token_hash` (TEXT UNIQUE NOT NULL), `expires_at` (TIMESTAMPTZ NOT NULL), `revoked_at` (TIMESTAMPTZ), `created_at` (TIMESTAMPTZ).
6. THE Database SHALL contain an `idempotency_keys` table with columns: `key` (VARCHAR(255) PK), `user_id` (UUID FK → users), `response_body` (JSONB NOT NULL), `created_at` (TIMESTAMPTZ NOT NULL), `expires_at` (TIMESTAMPTZ NOT NULL).
7. THE `users` table SHALL be altered to add: `stripe_customer_id` (TEXT UNIQUE), `failed_login_attempts` (SMALLINT DEFAULT 0), `locked_until` (TIMESTAMPTZ).
8. THE Database SHALL add indexes: `idx_saved_cards_user_id`, `idx_nfc_payments_token`, `idx_nfc_payments_sender_id`, `idx_nfc_payments_status`, `idx_devices_user_id`, `idx_audit_logs_user_id`, `idx_audit_logs_created_at`, `idx_refresh_tokens_user_id`, `idx_refresh_tokens_token_hash`.
9. THE Database SHALL enforce a CHECK constraint on `wallets.balance >= 0` — this constraint already exists and SHALL be preserved in all migrations.
10. THE Database SHALL enforce a CHECK constraint on `transactions.amount > 0` — this constraint already exists and SHALL be preserved.

---

### Requirement 5: JWT Refresh Token System (Phase 7)

**User Story:** As a mobile app user, I want my session to stay active without re-entering my password, so that I am not logged out unexpectedly after the access token expires.

#### Acceptance Criteria

1. WHEN a user logs in or registers, THE API SHALL issue both a short-lived access token (JWT, 15 minutes expiry) and a long-lived refresh token (opaque random string, 30 days expiry).
2. THE API SHALL store a bcrypt hash of the refresh token in the `refresh_tokens` table, never the raw token.
3. THE App SHALL store the refresh token in `expo-secure-store` alongside the access token.
4. WHEN the App receives an HTTP 401 response, THE App SHALL attempt to exchange the stored refresh token for a new access token via `POST /api/v1/auth/refresh` before retrying the original request.
5. WHEN `POST /api/v1/auth/refresh` is called with a valid refresh token, THE API SHALL issue a new access token and a new refresh token (token rotation), and revoke the old refresh token.
6. IF the refresh token is expired, revoked, or not found, THEN THE API SHALL return HTTP 401 and THE App SHALL clear all stored tokens and redirect the user to the login screen.
7. WHEN a user logs out, THE API SHALL revoke all active refresh tokens for that user by setting `revoked_at` to the current timestamp.
8. THE `POST /api/v1/auth/refresh` endpoint SHALL be rate-limited to 10 requests per minute per IP address.

---

### Requirement 6: Rate Limiting and Brute-Force Protection (Phase 7)

**User Story:** As a platform operator, I want authentication endpoints to be protected against brute-force attacks, so that user accounts cannot be compromised by automated password guessing.

#### Acceptance Criteria

1. THE API SHALL apply rate limiting to `POST /api/v1/auth/login` at a maximum of 10 requests per minute per IP address.
2. THE API SHALL apply rate limiting to `POST /api/v1/auth/register` at a maximum of 5 requests per minute per IP address.
3. WHEN a user fails login 5 consecutive times, THE API SHALL set `users.locked_until` to 15 minutes in the future and return HTTP 429 with a message indicating the account is temporarily locked.
4. WHILE `users.locked_until` is in the future, THE API SHALL reject all login attempts for that user with HTTP 429 regardless of whether the password is correct.
5. WHEN a user successfully logs in, THE API SHALL reset `users.failed_login_attempts` to 0.
6. THE API SHALL apply rate limiting to all payment endpoints (`/wallet/topup`, `/wallet/transfer`, `/wallet/pay`) at a maximum of 30 requests per minute per authenticated user.
7. IF a rate limit is exceeded, THEN THE API SHALL return HTTP 429 with a `Retry-After` header indicating when the client may retry.

---

### Requirement 7: Audit Logging (Phase 7)

**User Story:** As a platform operator, I want an immutable audit trail of all sensitive financial and authentication actions, so that I can investigate disputes and comply with financial regulations.

#### Acceptance Criteria

1. THE API SHALL write an audit log entry to the `audit_logs` table for each of the following actions: user registration, user login (success and failure), user logout, wallet top-up, wallet transfer, wallet payment, card added, card deleted, card frozen/unfrozen, NFC payment initiated, NFC payment completed, Stripe payment method added, Stripe payment method removed, refresh token issued, refresh token revoked.
2. WHEN an audit log entry is written, THE API SHALL record: `user_id`, `action` (e.g., `"wallet.transfer"`), `entity_type` (e.g., `"transaction"`), `entity_id` (the relevant record UUID), `ip_address` (from the request), `user_agent` (from the request header), and `metadata` (a JSONB object with relevant context such as amount, recipient, etc.).
3. THE `audit_logs` table SHALL be append-only — no UPDATE or DELETE operations SHALL be performed on it by the application.
4. THE Audit_Log entries SHALL be written asynchronously (e.g., in a goroutine) so that audit logging failures do not block or fail the primary operation.
5. WHEN an audit log write fails, THE API SHALL log the failure at WARN level but SHALL NOT return an error to the client.

---

### Requirement 8: Stripe Customer and Payment Method Management (Phase 4)

**User Story:** As a user, I want to save my real bank card to my Rwanda Pay account using Stripe, so that I can fund my wallet without entering card details on every top-up.

#### Acceptance Criteria

1. WHEN a user registers, THE API SHALL create a Stripe Customer object via the Stripe API and store the resulting `stripe_customer_id` on the `users` record.
2. WHEN a user requests to add a card, THE API SHALL create a Stripe SetupIntent for the user's Stripe Customer and return the `client_secret` to the App.
3. WHEN the App receives a SetupIntent `client_secret`, THE App SHALL use the Stripe React Native SDK to present the card collection UI and confirm the SetupIntent.
4. WHEN a SetupIntent is confirmed successfully, THE App SHALL call `POST /api/v1/cards/stripe/confirm` with the `payment_method_id` returned by Stripe.
5. WHEN `POST /api/v1/cards/stripe/confirm` is called, THE API SHALL retrieve the PaymentMethod from Stripe, store the `stripe_payment_method_id`, `last4`, `brand`, `exp_month`, `exp_year`, and `holder_name` in the `saved_cards` table, and return the saved card to the App.
6. THE API SHALL never store raw card numbers, CVV codes, or full card details — only Stripe-issued payment method IDs and safe display metadata.
7. WHEN a user requests to delete a saved card, THE API SHALL detach the PaymentMethod from the Stripe Customer via the Stripe API and delete the record from `saved_cards`.
8. THE API SHALL expose `GET /api/v1/cards/stripe` to list a user's saved Stripe cards (returning only safe display fields: `id`, `last4`, `brand`, `exp_month`, `exp_year`, `holder_name`, `is_default`).

---

### Requirement 9: Stripe Wallet Top-Up (Phase 4)

**User Story:** As a user, I want to fund my Rwanda Pay wallet using a saved Stripe card, so that I have a real balance to make payments with.

#### Acceptance Criteria

1. WHEN a user requests a wallet top-up with a saved Stripe card, THE API SHALL create a Stripe PaymentIntent for the specified amount (in the smallest currency unit) using the user's Stripe Customer ID and the selected `stripe_payment_method_id`.
2. WHEN creating a PaymentIntent, THE API SHALL set `confirm: true` and `payment_method_types: ["card"]` and pass the `Idempotency-Key` header to the Stripe API call.
3. WHEN the Stripe PaymentIntent status is `requires_action` (3D Secure), THE API SHALL return the `client_secret` to the App so the App can present the 3D Secure authentication flow using the Stripe SDK.
4. WHEN the Stripe PaymentIntent status is `succeeded`, THE API SHALL atomically credit the user's wallet balance and create a `topup` transaction record in a single database transaction.
5. THE API SHALL handle Stripe webhook events of type `payment_intent.succeeded` to credit wallet balances for payments that complete asynchronously (e.g., after 3D Secure).
6. WHEN a Stripe webhook is received, THE API SHALL verify the webhook signature using the Stripe webhook secret before processing the event.
7. IF a Stripe PaymentIntent fails (status `requires_payment_method` or `canceled`), THEN THE API SHALL return an appropriate error message to the App without modifying the wallet balance.
8. THE minimum top-up amount via Stripe SHALL be 500 RWF and the maximum SHALL be 5,000,000 RWF — these limits SHALL be enforced by the API before creating the PaymentIntent.
9. THE API SHALL never trust the amount from the frontend for Stripe charges — the amount SHALL be validated server-side against the minimum and maximum limits.

---

### Requirement 10: Stripe Webhook Handler (Phase 4)

**User Story:** As a platform operator, I want Stripe webhook events to be processed reliably, so that wallet balances are always consistent with Stripe payment outcomes.

#### Acceptance Criteria

1. THE API SHALL expose `POST /api/v1/webhooks/stripe` as a public endpoint (no JWT auth required) that receives Stripe webhook events.
2. WHEN a webhook request is received, THE API SHALL read the raw request body and verify the `Stripe-Signature` header using `stripe.ConstructEvent()` with the configured webhook secret.
3. IF the webhook signature verification fails, THEN THE API SHALL return HTTP 400 and log the failure at WARN level.
4. THE API SHALL handle the following webhook event types: `payment_intent.succeeded`, `payment_intent.payment_failed`, `setup_intent.succeeded`, `customer.deleted`.
5. WHEN a `payment_intent.succeeded` event is received, THE API SHALL check whether the corresponding wallet credit has already been applied (using the PaymentIntent ID as an idempotency key) before crediting the wallet, to prevent double-crediting.
6. THE API SHALL return HTTP 200 to Stripe for all received webhook events, even if the event type is not handled, to prevent Stripe from retrying.

---

### Requirement 11: NFC Payment Token Generation (Phase 6)

**User Story:** As a user, I want to initiate an NFC payment by generating a signed payment token on my device, so that I can transfer money to another user by tapping phones.

#### Acceptance Criteria

1. WHEN a user initiates an NFC payment, THE App SHALL call `POST /api/v1/nfc/initiate` with the payment amount and an optional description.
2. WHEN `POST /api/v1/nfc/initiate` is called, THE API SHALL validate that the sender's wallet has sufficient balance for the requested amount.
3. WHEN the balance check passes, THE API SHALL create an `nfc_payments` record with status `pending` and generate a signed Payment_Token.
4. THE Payment_Token SHALL be a JWT signed with the server's secret key containing: `nfc_payment_id`, `sender_id`, `amount`, `nonce` (UUID), and `exp` (5 minutes from creation).
5. THE API SHALL return the signed Payment_Token to the App.
6. THE App SHALL use `react-native-nfc-manager` to write the Payment_Token to an NFC tag or transmit it via Android Beam / iOS Core NFC to the receiving device.
7. WHEN the Payment_Token is written to NFC, THE App SHALL display a "Ready to tap" screen showing the amount and a countdown timer reflecting the 5-minute expiry.
8. IF the NFC write fails, THEN THE App SHALL display an error message and allow the user to retry or cancel.

---

### Requirement 12: NFC Payment Token Redemption (Phase 6)

**User Story:** As a receiving user, I want to complete an NFC payment by scanning the sender's token, so that the funds are transferred to my wallet instantly.

#### Acceptance Criteria

1. WHEN the receiving App reads an NFC tag, THE App SHALL extract the Payment_Token and call `POST /api/v1/nfc/complete` with the token.
2. WHEN `POST /api/v1/nfc/complete` is called, THE API SHALL verify the Payment_Token JWT signature and check that it has not expired.
3. IF the Payment_Token signature is invalid or the token is expired, THEN THE API SHALL return HTTP 400 with an appropriate error message and set the `nfc_payments` record status to `expired`.
4. WHEN the token is valid, THE API SHALL look up the `nfc_payments` record and verify its status is `pending`.
5. IF the `nfc_payments` record status is not `pending` (already completed, expired, or cancelled), THEN THE API SHALL return HTTP 409 to prevent double-redemption.
6. WHEN the token is valid and the payment is pending, THE API SHALL atomically: debit the sender's wallet, credit the receiver's wallet, create two transaction records (send + receive), update the `nfc_payments` record status to `completed`, and set `receiver_id`, `completed_at`, and `transaction_id`.
7. THE entire NFC payment completion operation SHALL be wrapped in a single database transaction with row-level locks on both wallets.
8. WHEN the NFC payment completes successfully, THE API SHALL return the transaction details and the receiver's new balance.
9. THE App SHALL display a payment success animation and haptic feedback upon successful NFC payment completion.

---

### Requirement 13: NFC Payment Expiry and Cancellation (Phase 6)

**User Story:** As a user, I want uncompleted NFC payment tokens to expire automatically, so that a lost or intercepted token cannot be used to steal funds.

#### Acceptance Criteria

1. THE Payment_Token SHALL expire 5 minutes after creation — this is enforced by the JWT `exp` claim verified by the API.
2. WHEN a user cancels an NFC payment before it is completed, THE App SHALL call `POST /api/v1/nfc/cancel` with the `nfc_payment_id`.
3. WHEN `POST /api/v1/nfc/cancel` is called, THE API SHALL set the `nfc_payments` record status to `cancelled` if the current status is `pending`.
4. THE API SHALL run a background job (or use a PostgreSQL scheduled query) to mark `nfc_payments` records as `expired` where `status = 'pending'` AND `expires_at < NOW()`.
5. WHEN an NFC payment token expires or is cancelled, THE sender's wallet balance SHALL NOT be affected — no funds are reserved or held during the pending state.
6. THE NFC payment system SHALL NOT pre-debit the sender's wallet when the token is created — funds are only moved at the moment of successful redemption.

---

### Requirement 14: React Native App — API Integration (Phase 5)

**User Story:** As a developer, I want the React Native app to have a complete, type-safe API client that covers all backend endpoints, so that screens can call the API without duplicating request logic.

#### Acceptance Criteria

1. THE App's `lib/api.ts` SHALL export typed functions for all backend endpoints including: Stripe card management (`stripeCardsApi`), NFC payment initiation and completion (`nfcApi`), refresh token exchange (`authApi.refresh`), and audit log retrieval (`auditApi`).
2. WHEN an API request returns HTTP 401, THE App's request function SHALL automatically attempt a token refresh using the stored refresh token before retrying the original request exactly once.
3. IF the token refresh also returns HTTP 401, THEN THE App SHALL call `signOut()` from `AuthContext` to clear all tokens and redirect to the login screen.
4. THE App SHALL use TypeScript interfaces for all API response types — no use of `any` type in API response handling.
5. WHEN an API request fails with a network error, THE App SHALL throw an error with a user-friendly message (e.g., "No internet connection. Please try again.") rather than a raw fetch error.
6. THE App's API client SHALL include the `Idempotency-Key` header on all payment requests, generated as a UUID per request attempt.

---

### Requirement 15: React Native App — Stripe Card Management UI (Phase 5)

**User Story:** As a user, I want to add and manage my real bank cards through the app using Stripe, so that I can fund my wallet securely.

#### Acceptance Criteria

1. THE App SHALL replace the existing manual card entry form (`app/add-card.tsx`) with a Stripe-powered card addition flow that uses the Stripe React Native SDK's `CardField` or `PaymentSheet`.
2. WHEN a user taps "Add Card", THE App SHALL call the backend to create a SetupIntent, then present the Stripe card collection UI.
3. WHEN the Stripe card collection is completed successfully, THE App SHALL confirm the card addition with the backend and refresh the card list.
4. THE App SHALL display saved Stripe cards showing: card brand icon, last 4 digits, expiry month/year, and a default indicator.
5. WHEN a user taps "Delete Card", THE App SHALL show a confirmation dialog before calling the delete endpoint.
6. THE App SHALL handle Stripe SDK errors and display user-friendly error messages (e.g., "Your card was declined. Please try a different card.").

---

### Requirement 16: React Native App — NFC Payment UI (Phase 5 + 6)

**User Story:** As a user, I want a clear NFC payment flow in the app that guides me through initiating and receiving NFC payments, so that I can complete wallet-to-wallet transfers by tapping phones.

#### Acceptance Criteria

1. THE App's Pay screen SHALL be updated to support two modes: "Tap to Pay" (sender mode, initiates NFC token) and "Receive Payment" (receiver mode, reads NFC token).
2. WHEN in sender mode, THE App SHALL call the NFC initiate endpoint, then use `react-native-nfc-manager` to write the Payment_Token to an NFC tag.
3. WHEN in receiver mode, THE App SHALL use `react-native-nfc-manager` to scan for an NFC tag and read the Payment_Token, then call the NFC complete endpoint.
4. THE App SHALL check for NFC hardware availability using `NfcManager.isSupported()` and display a "NFC not available on this device" message if NFC is not supported.
5. WHEN NFC is not available (e.g., on iOS simulator or web), THE App SHALL fall back to displaying a QR code containing the Payment_Token for manual scanning.
6. THE App SHALL display a countdown timer showing the remaining validity time of the Payment_Token during the NFC send flow.
7. WHEN an NFC payment completes successfully, THE App SHALL refresh the wallet balance and transaction list, display a success animation, and trigger haptic feedback.

---

### Requirement 17: React Native App — Loading and Error States (Phase 5)

**User Story:** As a user, I want clear loading indicators and error messages throughout the app, so that I always know what is happening and what went wrong.

#### Acceptance Criteria

1. WHEN any API request is in progress, THE App SHALL display a loading indicator (spinner or skeleton) appropriate to the context — full-screen for initial data loads, inline for button actions.
2. WHEN an API request fails, THE App SHALL display the error message from the API response (or a fallback message) in a visible, non-blocking way (e.g., a toast or inline error text) — not just a console log.
3. THE App SHALL disable action buttons (Send, Top Up, Pay) while a request is in progress to prevent duplicate submissions.
4. WHEN the wallet balance or transaction list fails to load, THE App SHALL display a "Retry" button that re-triggers the data fetch.
5. THE App SHALL use React Error Boundaries (the existing `ErrorBoundary` component) to catch and display unexpected rendering errors without crashing the entire app.

---

### Requirement 18: Input Validation (Phase 1 + 7)

**User Story:** As a platform operator, I want all API inputs to be validated before any business logic or database access, so that malformed data cannot cause errors or security vulnerabilities.

#### Acceptance Criteria

1. THE API SHALL validate all request bodies using a dedicated validator package before passing data to the service layer.
2. WHEN a payment amount is received from the client, THE API SHALL reject any amount that is not a positive integer — floating-point values, negative values, and zero SHALL be rejected with HTTP 400.
3. WHEN an email address is received, THE API SHALL validate it matches a standard email format (RFC 5322 simplified) and normalize it to lowercase before any database lookup.
4. WHEN a UUID is received as a path parameter or request body field, THE API SHALL validate it is a valid UUID v4 format before passing it to the repository layer.
5. THE API SHALL enforce maximum string lengths on all text inputs: email (255 chars), name (255 chars), description (500 chars), phone (20 chars).
6. THE API SHALL strip leading and trailing whitespace from all string inputs before validation and storage.
7. IF any validation fails, THEN THE API SHALL return HTTP 400 with a structured error response listing the specific validation failures.

---

### Requirement 19: CORS and Security Headers (Phase 7)

**User Story:** As a platform operator, I want the API to have proper CORS configuration and security headers, so that the API is not accessible from unauthorized origins.

#### Acceptance Criteria

1. THE API SHALL configure CORS to allow requests only from the configured list of allowed origins (set via environment variable `ALLOWED_ORIGINS`), not `*` in production.
2. THE API SHALL add the following security headers to all responses: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`.
3. THE API SHALL add a `Strict-Transport-Security` header when running in production (`APP_ENV=production`).
4. THE API SHALL not expose the `Server` or `X-Powered-By` headers in responses.
5. WHEN the `APP_ENV` is `development`, THE API SHALL allow `*` as the CORS origin to support local development.

---

### Requirement 20: Clean Architecture — Dependency Injection (Phase 1)

**User Story:** As a developer, I want the backend to use dependency injection throughout, so that components are testable in isolation and the codebase is maintainable.

#### Acceptance Criteria

1. THE API SHALL wire all dependencies (repositories, services, handlers) in `cmd/server/main.go` using explicit constructor injection — no global variables or `init()` functions for dependency setup.
2. WHEN a new service is added, THE Service SHALL accept its repository dependencies via constructor parameters typed as interfaces (not concrete structs), so that mock implementations can be substituted in tests.
3. THE API SHALL define all repository interfaces in `internal/repository/interfaces.go` — this file already exists and SHALL be extended for new repositories (NfcPaymentRepository, SavedCardRepository, AuditLogRepository, DeviceRepository, RefreshTokenRepository).
4. THE API SHALL define all service interfaces (or at minimum, all service methods SHALL be callable via the handler layer through the concrete service type) to allow handler-level testing.
5. THE existing mock implementations in `tests/mocks/mocks.go` SHALL be extended to cover all new repository interfaces.

---

### Requirement 21: Transaction Ledger Endpoint (Phase 3)

**User Story:** As a user, I want to view a transaction history with a specific contact (by email), so that I can see all money sent to and received from that person.

#### Acceptance Criteria

1. THE API SHALL expose `GET /api/v1/transactions/ledger/:email` that returns all transactions between the authenticated user and the specified contact email.
2. WHEN the ledger endpoint is called, THE API SHALL return: the contact's profile (id, name, email, initials), a list of transactions between the two users, `total_sent` (sum of amounts sent by the authenticated user to the contact), `total_received` (sum of amounts received by the authenticated user from the contact), and `net` (total_received - total_sent).
3. IF the contact email does not correspond to a registered user, THEN THE API SHALL return HTTP 404.
4. THE ledger query SHALL use a single SQL query with appropriate indexes on `transactions.user_id`, `transactions.recipient_id`, and `transactions.type` for performance.
5. THE App SHALL display the ledger screen (`app/contact-ledger.tsx`) showing the contact's name, net balance, and a chronological list of transactions.

---

### Requirement 22: Wallet Freeze and Admin Controls (Phase 3)

**User Story:** As a platform operator, I want to be able to freeze a user's wallet to prevent fraudulent transactions, so that I can respond to security incidents.

#### Acceptance Criteria

1. THE API SHALL expose `PUT /api/v1/admin/wallets/:userID/freeze` and `PUT /api/v1/admin/wallets/:userID/unfreeze` endpoints protected by an admin role check.
2. WHEN a wallet is frozen, THE API SHALL set `wallets.is_frozen = TRUE` and write an audit log entry.
3. WHILE a wallet is frozen, THE API SHALL reject all top-up, transfer, and payment operations for that wallet with HTTP 403 and the message "wallet is frozen" — this behavior already exists in the service layer and SHALL be preserved.
4. THE API SHALL expose `PUT /api/v1/cards/:id/freeze` and `PUT /api/v1/cards/:id/unfreeze` endpoints for users to freeze their own cards.
5. WHEN a card is frozen, THE API SHALL set `cards.status = 'frozen'` and write an audit log entry.
6. WHILE a card is frozen, THE API SHALL reject all top-up operations using that card with HTTP 403 — this behavior already exists and SHALL be preserved.

---

### Requirement 23: Transaction Reference Numbers (Phase 3)

**User Story:** As a user, I want every transaction to have a unique human-readable reference number, so that I can reference specific transactions in support requests.

#### Acceptance Criteria

1. THE API SHALL generate a unique reference number for every transaction at creation time.
2. THE reference number format SHALL be: `RWP-{YYYYMMDD}-{6-character-uppercase-alphanumeric}` (e.g., `RWP-20250115-A3F9K2`).
3. THE `transactions.reference` column already has a UNIQUE constraint — the API SHALL use this constraint to detect and handle (via retry) the rare case of a reference collision.
4. THE reference number SHALL be included in all transaction API responses and displayed in the App's transaction detail view.
5. THE App SHALL allow users to copy the reference number to the clipboard from the transaction detail screen.

---

### Requirement 24: Device Registration (Phase 7)

**User Story:** As a platform operator, I want to track which devices are used to access accounts, so that I can detect suspicious login activity from unknown devices.

#### Acceptance Criteria

1. WHEN a user logs in or registers, THE App SHALL include a `X-Device-Token` header containing a unique device identifier (generated once and stored in `expo-secure-store`).
2. WHEN the API receives a login or register request with an `X-Device-Token` header, THE API SHALL upsert a record in the `devices` table with the device token, platform, and `last_seen_at`.
3. THE API SHALL expose `GET /api/v1/devices` for authenticated users to list their registered devices.
4. THE API SHALL expose `DELETE /api/v1/devices/:id` for users to remove a device from their account.
5. WHEN a device is removed, THE API SHALL revoke all refresh tokens associated with that device.

---

### Requirement 25: Password Change (Phase 7)

**User Story:** As a user, I want to change my password from within the app, so that I can maintain account security.

#### Acceptance Criteria

1. THE API SHALL expose `PUT /api/v1/auth/password` (protected) that accepts `current_password` and `new_password`.
2. WHEN `PUT /api/v1/auth/password` is called, THE API SHALL verify the `current_password` against the stored bcrypt hash before updating.
3. IF the `current_password` is incorrect, THEN THE API SHALL return HTTP 400 with the message "current password is incorrect".
4. THE `new_password` SHALL be at least 8 characters long — the API SHALL return HTTP 400 if this requirement is not met.
5. WHEN the password is changed successfully, THE API SHALL revoke all existing refresh tokens for the user (forcing re-login on all other devices) and write an audit log entry.
6. THE App SHALL expose a "Change Password" option in the Settings screen that presents a form with current password, new password, and confirm new password fields.
7. WHEN the new password and confirm new password fields do not match, THE App SHALL display a validation error before making any API call.
