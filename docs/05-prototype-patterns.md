# Phase 2 — Software Development Prototype & Design Patterns

---

## 1. Prototype Overview

Rwanda Pay is a **functional software prototype** — not a mockup or wireframe, but a working application with a real backend, real database, and real mobile UI. It demonstrates all core features of the proposed production system.

### What the Prototype Covers

| Module | Prototype Status | Notes |
|---|---|---|
| User Registration & Login | ✅ Fully working | JWT auth, bcrypt, secure storage |
| Demo Account | ✅ Fully working | Auto-creates on first tap |
| Digital Wallet | ✅ Fully working | Balance in RWF, real DB |
| Top-Up from Card | ✅ Fully working | Validates card ownership |
| Peer-to-Peer Transfer | ✅ Fully working | Email-based, both sides updated |
| NFC Tap-to-Pay | ✅ Simulated | Real biometric auth, simulated NFC scan |
| Card Management | ✅ Fully working | Add, delete, set default |
| Transaction History | ✅ Fully working | Paginated, filterable, date-grouped |
| Spending Analytics | ✅ Fully working | Category breakdown, monthly chart |
| Profile Settings | ✅ Fully working | Name, phone, preferences |
| Google / Apple Sign-In | 🔲 Stub only | Requires OAuth credentials |
| Real NFC Hardware | 🔲 Simulated | Requires merchant POS integration |
| Push Notifications | 🔲 UI toggle only | Backend integration pending |

### Prototype Architecture

The prototype uses a **monorepo** structure with pnpm workspaces, separating concerns into:
- `artifacts/rwanda-pay` — the mobile app
- `artifacts/api-server` — the REST API
- `lib/db` — shared database schema
- `lib/api-zod` — shared validation types

This mirrors the intended production architecture, making the prototype directly promotable to production with environment changes only.

---

## 2. Programming Best Practices Applied

### 2.1 Google TypeScript Style Guide Compliance

Rwanda Pay follows the [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html):

**Naming Conventions**
```typescript
// ✅ camelCase for variables and functions
const walletBalance = 50000;
async function getToken(): Promise<string | null> {}

// ✅ PascalCase for classes, interfaces, types, components
interface AuthContextType {}
function AuthProvider({ children }: { children: React.ReactNode }) {}

// ✅ UPPER_SNAKE_CASE for constants
const TOKEN_KEY = "rp_token";
const BASE_URL = "http://localhost:8080/api";
```

**Type Safety**
```typescript
// ✅ Explicit return types on all public functions
export async function getToken(): Promise<string | null>
export async function storeToken(token: string): Promise<void>

// ✅ No implicit any — all types declared
const [user, setUser] = useState<ApiUser | null>(null);
const [walletBalance, setWalletBalance] = useState<number>(0);
```

**Error Handling**
```typescript
// ✅ All async operations wrapped in try/catch
const signIn = useCallback(async (email: string, password: string) => {
  setIsSigningIn(true);
  try {
    const { user: u, wallet, token } = await authApi.login({ email, password });
    await storeToken(token);
    setUser(u);
  } finally {
    setIsSigningIn(false); // always resets loading state
  }
}, []);
```

**Input Validation**
```typescript
// ✅ All API inputs validated with Zod before processing
const parsed = registerSchema.safeParse(req.body);
if (!parsed.success) {
  res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
  return;
}
```

**Immutability**
```typescript
// ✅ const by default, let only when reassignment needed
const { email, password, name, phone } = parsed.data;
const passwordHash = await bcrypt.hash(password, 10);
```

### 2.2 React Native Best Practices

- **useCallback** on all context methods to prevent unnecessary re-renders
- **StyleSheet.create** for all styles (compiled at load time, not render time)
- **Animated values via Reanimated** — animations run on the UI thread, not JS thread
- **Lazy loading** — screens only mount when navigated to via Expo Router
- **Error boundaries** — `ErrorBoundary` component wraps the entire app

### 2.3 API Best Practices

- **Stateless authentication** — JWT, no server-side sessions
- **Input validation at the boundary** — Zod validates before any DB access
- **Structured logging** — pino-http logs every request with method, URL, status, response time
- **HTTP status codes** — correct codes used (201 for creation, 409 for conflict, 401 for auth failure)
- **No sensitive data in responses** — `passwordHash` destructured out before every response

---

## 3. Design Patterns

### 3.1 Repository Pattern

**Where:** `lib/db/src/index.ts` and all route handlers

**Description:** All database access is abstracted behind the Drizzle ORM schema. Route handlers never write raw SQL — they use the typed schema objects. This decouples business logic from the database engine, making it possible to swap SQLite (dev) for PostgreSQL (prod) with zero code changes.

```typescript
// Route handler uses schema abstraction, not raw SQL
const [user] = await db
  .select()
  .from(usersTable)
  .where(eq(usersTable.email, email))
  .limit(1);
```

### 3.2 Provider / Context Pattern

**Where:** `context/AuthContext.tsx`, `context/WalletContext.tsx`

**Description:** Global application state is managed through React Context providers. Components anywhere in the tree can access auth state and wallet data without prop drilling. This is the React-native equivalent of the Dependency Injection pattern.

```typescript
// Any screen can access auth state
const { user, walletBalance, signIn, signOut } = useAuth();

// Any screen can access wallet data
const { cards, transactions, hideBalance } = useWallet();
```

### 3.3 Middleware Pattern (Chain of Responsibility)

**Where:** `artifacts/api-server/src/middlewares/requireAuth.ts`

**Description:** Express middleware forms a processing chain. Each middleware either passes the request to the next handler or terminates it with an error response. The `requireAuth` middleware intercepts all protected routes, verifies the JWT, and attaches the decoded user to `req.user`.

```typescript
// Middleware chain: CORS → Logger → Body Parser → requireAuth → Route Handler
router.get("/wallet", requireAuth, async (req, res) => {
  // req.user is guaranteed to exist here
  const wallet = await db.select()
    .from(walletsTable)
    .where(eq(walletsTable.userId, req.user!.userId));
});
```

### 3.4 Strategy Pattern

**Where:** `artifacts/rwanda-pay/app/(tabs)/pay.tsx` — biometric authentication

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

**Where:** `artifacts/api-server/src/routes/auth.ts` — registration handler

**Description:** When a user registers, a factory process creates the complete user environment: user record + wallet + 3 seed cards + 5 seed transactions. This ensures every new user starts with a consistent, fully-populated account state.

```typescript
// Factory: creates all related entities in one registration call
const [user] = await db.insert(usersTable).values({...}).returning();
const [wallet] = await db.insert(walletsTable).values({ userId: user.id, balance: 50000 }).returning();
const cards = await db.insert(cardsTable).values(seedCards).returning();
await db.insert(transactionsTable).values(seedTransactions);
```

### 3.6 Observer Pattern

**Where:** TanStack React Query throughout the mobile app

**Description:** Components subscribe to data queries. When data changes (e.g. after a top-up), all subscribed components automatically re-render with fresh data. Components do not need to manually trigger updates.

```typescript
// Component observes wallet data — auto-updates when invalidated
const { data: wallet } = useQuery({
  queryKey: ['wallet'],
  queryFn: walletApi.get,
});
```

---

## 4. Prototype Limitations (Known)

| Limitation | Reason | Production Fix |
|---|---|---|
| NFC is simulated | Real NFC requires merchant POS SDK integration | Integrate with Rwanda's payment switch |
| SQLite in dev | Not suitable for concurrent production load | Switch to PostgreSQL via `DATABASE_URL` |
| No real Google/Apple OAuth | Requires OAuth credentials and app store registration | Add `/api/auth/google` and `/api/auth/apple` routes |
| No push notifications | Requires FCM/APNs setup | Integrate Expo Notifications + backend webhook |
| Single currency (RWF) | Prototype scope | Add multi-currency support |
