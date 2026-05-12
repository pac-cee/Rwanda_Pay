# Phase 2 — Software Development Prototype & Design Patterns

---

## 1. Prototype Overview

Rwanda Pay is a **functional software prototype** — not a mockup or wireframe, but a working application with a real backend, real database, and real mobile UI. It demonstrates all core features of the proposed production system.

### What the Prototype Covers

| Module | Prototype Status | Notes |
|---|---|---|
| User Registration & Login | ✅ Fully working | JWT auth, bcrypt, secure storage |
| Digital Wallet | ✅ Fully working | Balance in RWF, real PostgreSQL |
| Top-Up from Card | ✅ Fully working | Atomic DB transaction, row-level lock |
| Peer-to-Peer Transfer | ✅ Fully working | Atomic, deadlock-safe, both sides updated |
| NFC Tap-to-Pay | ✅ Simulated | Real biometric auth, simulated NFC scan |
| Card Management | ✅ Fully working | Add (encrypted), delete, set default, add balance |
| Transaction History | ✅ Fully working | Paginated, filterable, with balance snapshots |
| Spending Analytics | ✅ Fully working | Category breakdown, monthly chart |
| Contact Ledger | ✅ Fully working | Transaction history between two users |
| Profile Settings | ✅ Fully working | Name, phone, preferences |
| Merchant Payments | ✅ Fully working | Merchant lookup by code, visit tracking |
| Real NFC Hardware | 🔲 Simulated | Requires merchant POS integration |
| Push Notifications | 🔲 UI toggle only | Backend integration pending |

### Prototype Architecture

The prototype uses a **clean architecture** pattern with strict layer separation:

```
Mobile App (React Native/Expo)
    ↓ HTTP REST JSON
API Server (Go/Fiber)
    Handler Layer  — parses HTTP, validates input, returns JSON
    Service Layer  — business logic, validation rules
    Repository Layer — SQL queries via pgx/v5
    ↓ pgx/v5 (pgxpool)
PostgreSQL 16
```

---

## 2. Programming Best Practices Applied

### 2.1 Google Go Style Guide Compliance

Rwanda Pay's backend follows the [Google Go Style Guide](https://google.github.io/styleguide/go/):

**Naming Conventions**
```go
// ✅ PascalCase for exported types and functions
type WalletService struct { ... }
func NewWalletService(...) *WalletService { ... }

// ✅ camelCase for unexported identifiers
type walletRepo struct { db *pgxpool.Pool }

// ✅ Short, descriptive variable names
func (r *walletRepo) GetByUserID(ctx context.Context, userID string) (*domain.Wallet, error) {
    w := &domain.Wallet{}
    err := r.db.QueryRow(ctx, query, userID).Scan(...)
    return w, err
}
```

**Error Handling**
```go
// ✅ Errors are always checked and wrapped with context
newWalletBalance, _, err := s.walletRepo.TopupTx(ctx, wallet.ID, card.ID, in.Amount)
if err != nil {
    return nil, err  // domain errors propagate up unchanged
}

// ✅ Domain errors are sentinel values for type-safe checking
if errors.Is(err, domain.ErrInsufficientFunds) {
    return response.BadRequest(c, err.Error())
}
```

**Type Safety — No Floats for Money**
```go
// ✅ All monetary values are int64 (BIGINT in PostgreSQL)
type Wallet struct {
    Balance int64 `json:"balance"` // in RWF, integer only — never float64
}

// ✅ Amounts validated as positive integers before any DB access
if in.Amount < 500 {
    return nil, fmt.Errorf("%w: minimum top-up is 500 RWF", domain.ErrInvalidInput)
}
```

**Dependency Injection**
```go
// ✅ All dependencies injected via constructor, typed as interfaces
func NewWalletService(
    walletRepo repository.WalletTxRepository,  // interface, not concrete type
    cardRepo   repository.CardRepository,
    userRepo   repository.UserRepository,
    ...
) *WalletService {
    return &WalletService{walletRepo: walletRepo, ...}
}
```

### 2.2 React Native Best Practices

- **useCallback** on all context methods to prevent unnecessary re-renders
- **StyleSheet.create** for all styles (compiled at load time, not render time)
- **Typed API client** — all API response types defined as TypeScript interfaces
- **Error boundaries** — `ErrorBoundary` component wraps the entire app
- **Secure storage** — JWT stored in `expo-secure-store` (OS keychain/keystore), never AsyncStorage

### 2.3 Fintech Engineering Rules Applied

| Rule | Implementation |
|---|---|
| Never use float for money | All amounts are `int64` in Go, `BIGINT` in PostgreSQL |
| Atomic balance changes | `BEGIN/SELECT FOR UPDATE/UPDATE/COMMIT` in `WalletTxRepository` |
| Prevent race conditions | Row-level locking with `SELECT ... FOR UPDATE` |
| Prevent deadlocks | Wallets locked in UUID-ascending order in `TransferTx` |
| Never store raw card data | AES-256-GCM encryption before INSERT, never returned in API |
| Validate all inputs | Handler-level validation before any service call |
| Immutable transaction log | `balance_before` and `balance_after` stored on every transaction |

---

## 3. Design Patterns

### 3.1 Repository Pattern

**Where:** `backend/internal/repository/`

**Description:** All database access is abstracted behind interfaces defined in `interfaces.go`. The service layer calls repository interfaces — it never writes SQL directly. This decouples business logic from the database, making it possible to swap implementations (e.g., for testing with mocks).

```go
// Interface defined in interfaces.go
type WalletTxRepository interface {
    WalletRepository
    TransferTx(ctx, senderWalletID, recipientWalletID string, amount int64) (int64, int64, error)
    TopupTx(ctx, walletID, cardID string, amount int64) (int64, int64, error)
    PayTx(ctx, walletID string, amount int64) (int64, error)
}

// Service uses the interface — not the concrete struct
type WalletService struct {
    walletRepo repository.WalletTxRepository  // interface
}

// In tests, a mock is injected instead of the real DB
walletRepo := &mocks.MockWalletTxRepository{}
walletRepo.On("PayTx", ...).Return(int64(18000), nil)
svc := service.NewWalletService(walletRepo, ...)
```

### 3.2 Provider / Context Pattern

**Where:** `rwanda-pay/context/AuthContext.tsx`, `rwanda-pay/context/WalletContext.tsx`

**Description:** Global application state is managed through React Context providers. Components anywhere in the tree can access auth state and wallet data without prop drilling. This is the React-native equivalent of the Dependency Injection pattern.

```typescript
// Any screen can access auth state
const { user, walletBalance, signIn, signOut } = useAuth();

// Any screen can access wallet data
const { cards, transactions, hideBalance } = useWallet();
```

### 3.3 Middleware Pattern (Chain of Responsibility)

**Where:** `backend/internal/router/router.go`, `backend/internal/middleware/auth.go`

**Description:** Fiber middleware forms a processing chain. Each middleware either passes the request to the next handler or terminates it with an error response. The `Auth` middleware intercepts all protected routes, verifies the JWT, and attaches the decoded `userID` to the request context.

```go
// Middleware chain: Recover → Logger → CORS → [Auth] → Handler
protected := v1.Group("", middleware.Auth(jwtSvc))
protected.Post("/wallet/topup", h.Wallet.Topup)

// Auth middleware
func Auth(jwtSvc *jwt.Service) fiber.Handler {
    return func(c *fiber.Ctx) error {
        token := strings.TrimPrefix(c.Get("Authorization"), "Bearer ")
        claims, err := jwtSvc.Verify(token)
        if err != nil {
            return response.Unauthorized(c)
        }
        c.Locals("userID", claims.UserID)
        return c.Next()
    }
}
```

### 3.4 Strategy Pattern

**Where:** `rwanda-pay/app/(tabs)/pay.tsx` — biometric authentication

**Description:** The payment authentication strategy is abstracted. On iOS it uses Face ID, on Android it uses fingerprint, and on unsupported devices it falls back gracefully. The payment flow does not need to know which biometric method is used.

```typescript
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: "Authenticate to pay",
  fallbackLabel: "Use Passcode",
});
// Strategy resolves to { success: boolean } regardless of method
if (result.success) { processPayment(); }
```

### 3.5 Factory Pattern

**Where:** `backend/internal/service/auth_service.go` — registration handler

**Description:** When a user registers, a factory process creates the complete user environment: user record + wallet. This ensures every new user starts with a consistent, fully-populated account state.

```go
// Factory: creates all related entities in one registration call
user := &domain.User{ID: uuid.NewString(), Email: ..., PasswordHash: hash, ...}
if err := s.userRepo.Create(ctx, user); err != nil { return nil, err }

wallet := &domain.Wallet{ID: uuid.NewString(), UserID: user.ID, Balance: 0, Currency: "RWF"}
if err := s.walletRepo.Create(ctx, wallet); err != nil { return nil, err }
```

### 3.6 Template Method Pattern

**Where:** `backend/internal/repository/wallet_repo.go` — atomic transaction methods

**Description:** `TransferTx`, `TopupTx`, and `PayTx` all follow the same template: BEGIN → lock rows with SELECT FOR UPDATE → validate → UPDATE → COMMIT (or ROLLBACK on error). The template ensures no money operation can ever leave the database in a partial state.

```go
func (r *walletRepo) PayTx(ctx context.Context, walletID string, amount int64) (int64, error) {
    tx, err := r.db.Begin(ctx)          // Step 1: Begin
    defer tx.Rollback(ctx)              // Step 2: Ensure rollback on any error path
    
    // Step 3: Lock row
    err = tx.QueryRow(ctx, `SELECT balance, is_frozen FROM wallets WHERE id = $1 FOR UPDATE`, walletID).Scan(...)
    
    // Step 4: Validate
    if balance < amount { return 0, domain.ErrInsufficientFunds }
    
    // Step 5: Update
    tx.Exec(ctx, `UPDATE wallets SET balance = $1 WHERE id = $2`, newBalance, walletID)
    
    return newBalance, tx.Commit(ctx)   // Step 6: Commit
}
```

---

## 4. Prototype Limitations (Known)

| Limitation | Reason | Production Fix |
|---|---|---|
| NFC is simulated | Real NFC requires merchant POS SDK integration | Integrate with Rwanda's payment switch |
| No Stripe integration | Requires Stripe account and API keys | Add Stripe SetupIntent + PaymentIntent flow |
| No push notifications | Requires FCM/APNs setup | Integrate Expo Notifications + backend webhook |
| Single currency (RWF) | Prototype scope | Add multi-currency support |
| No refresh tokens | JWT is 7-day access token | Add refresh token rotation |
| No rate limiting | Prototype scope | Add Fiber rate limiter middleware |
