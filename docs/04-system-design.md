# Phase 1 — System Design

---

## 1. High-Level Architecture

Rwanda Pay follows a **client-server architecture** with a clear separation between the mobile frontend, the REST API backend, and the data layer. All three layers communicate through well-defined interfaces.

```mermaid
graph TB
    subgraph Client["Client Layer"]
        IOS["iOS App\nExpo / React Native"]
        ANDROID["Android App\nExpo / React Native"]
    end

    subgraph Backend["Backend Layer"]
        subgraph Mobile["Mobile App Internals"]
            SCREENS["Screen Layer\nExpo Router v6"]
            CONTEXTS["Context Layer\nAuthContext · WalletContext"]
            APICLIENT["API Client\nlib/api.ts"]
        end

        subgraph Server["API Server"]
            MW["Middleware\nCORS · Logger · Auth"]
            ROUTES["Route Handlers\nauth · wallet · cards · transactions"]
            SERVICES["Services\nJWT · bcrypt · Drizzle ORM"]
        end
    end

    subgraph Data["Data Layer"]
        SQLITE[("SQLite\nDevelopment")]
        PG[("PostgreSQL\nProduction")]
    end

    subgraph Shared["Shared Libraries"]
        SCHEMA["@workspace/db\nDrizzle Schema + Zod"]
        APIZOD["@workspace/api-zod\nGenerated Types"]
    end

    IOS --> SCREENS
    ANDROID --> SCREENS
    SCREENS --> CONTEXTS
    CONTEXTS --> APICLIENT
    APICLIENT -->|"HTTPS REST JSON"| MW
    MW --> ROUTES
    ROUTES --> SERVICES
    SERVICES --> SCHEMA
    SCHEMA --> SQLITE
    SCHEMA --> PG
    ROUTES --> SCHEMA
    APICLIENT --> APIZOD
```

---

## 2. Monorepo Package Structure

Rwanda Pay uses a **pnpm monorepo** to share code between the mobile app and the API server without duplication.

```mermaid
graph LR
    ROOT["workspace root\npnpm-workspace.yaml"]

    ROOT --> A1["artifacts/rwanda-pay\nExpo mobile app\n@workspace/rwanda-pay"]
    ROOT --> A2["artifacts/api-server\nExpress REST API\n@workspace/api-server"]

    ROOT --> L1["lib/db\nDrizzle schema\nZod validators\nDB connection\n@workspace/db"]
    ROOT --> L2["lib/api-spec\nOpenAPI YAML\nOrval config"]
    ROOT --> L3["lib/api-zod\nGenerated Zod types\n@workspace/api-zod"]
    ROOT --> L4["lib/api-client-react\nGenerated React Query hooks\n@workspace/api-client-react"]

    A1 -->|"imports schema + types"| L1
    A1 -->|"imports hooks"| L4
    A2 -->|"imports schema + DB"| L1
    A2 -->|"imports Zod types"| L3
    L2 -->|"generates"| L3
    L2 -->|"generates"| L4
```

**Why a monorepo?**
- The database schema (`lib/db`) is shared between the API server and the mobile app — no duplication of type definitions
- Zod validators defined once in `lib/db` are used for both API validation and client-side type checking
- Changes to the schema automatically propagate to both the backend and frontend via TypeScript compilation

---

## 3. Mobile App — Screen and Navigation Structure

Rwanda Pay uses **Expo Router v6** for file-based navigation. The file structure directly maps to the URL/route structure.

```mermaid
graph TD
    ROOT_LAYOUT["app/_layout.tsx\nRoot Layout\nAuthProvider + WalletProvider\nQueryClientProvider\nSplashOverlay"]

    ROOT_LAYOUT --> AUTH["/auth\nauth.tsx\nSign In / Sign Up / Demo"]
    ROOT_LAYOUT --> TABS["/(tabs)/_layout.tsx\nBottom Tab Navigator\n5 tabs"]

    TABS --> HOME["/(tabs)/index.tsx\nHome\nBalance · Cards carousel\nQuick actions"]
    TABS --> PAY["/(tabs)/pay.tsx\nPay\nNFC simulation\nBiometric auth"]
    TABS --> TRANSFER["/(tabs)/transfer.tsx\nTransfer\nSend / Receive tabs"]
    TABS --> ANALYTICS["/(tabs)/analytics.tsx\nAnalytics\nCharts · Categories"]
    TABS --> SETTINGS["/(tabs)/settings.tsx\nSettings\nProfile · Preferences"]
    TABS --> TRANSACTIONS["/(tabs)/transactions.tsx\nTransactions\nHistory list"]

    ROOT_LAYOUT --> SEND["/send\nsend.tsx\nSend Money modal"]
    ROOT_LAYOUT --> RECEIVE["/receive\nreceive.tsx\nReceive / QR modal"]
    ROOT_LAYOUT --> TOPUP["/topup\ntopup.tsx\nTop Up Wallet modal"]
    ROOT_LAYOUT --> ADDCARD["/add-card\nadd-card.tsx\nAdd New Card modal"]
    ROOT_LAYOUT --> TXFULL["/transactions-full\nFull Transaction History"]
    ROOT_LAYOUT --> ANFULL["/analytics-full\nFull Analytics View"]
```

---

## 4. API Server — Request Lifecycle

Every HTTP request to the API server passes through a defined middleware chain before reaching the route handler.

```mermaid
flowchart LR
    REQ["Incoming\nHTTP Request"] --> CORS["cors()\nAllow cross-origin\nfrom mobile app"]
    CORS --> LOG["pino-http\nLog: method, URL,\nstatus, response time"]
    LOG --> BODY["express.json()\nParse JSON body"]
    BODY --> ROUTER["/api Router"]

    ROUTER --> AUTH_RT["/auth routes"]
    ROUTER --> WALLET_RT["/wallet routes"]
    ROUTER --> CARDS_RT["/cards routes"]
    ROUTER --> TX_RT["/transactions routes"]
    ROUTER --> HEALTH["/healthz"]

    AUTH_RT --> AUTH_CHECK{"requireAuth\nmiddleware?"}
    WALLET_RT --> AUTH_CHECK
    CARDS_RT --> AUTH_CHECK
    TX_RT --> AUTH_CHECK

    AUTH_CHECK -->|"No auth needed\n(register, login)"| HANDLER["Route Handler\nZod validation\nBusiness logic\nDrizzle ORM query"]
    AUTH_CHECK -->|"Valid JWT"| HANDLER
    AUTH_CHECK -->|"Missing/invalid JWT"| ERR401["401 Unauthorized\n{ error: 'Unauthorized' }"]

    HANDLER --> DB[("Database\nSQLite / PostgreSQL")]
    DB --> HANDLER
    HANDLER --> RES["JSON Response\n{ data } or { error }"]
```

---

## 5. Authentication and Session Management Flow

```mermaid
flowchart TD
    LAUNCH(["App Launch"]) --> SPLASH["Show animated splash screen"]
    SPLASH --> CHECK["getToken()\nexpo-secure-store"]

    CHECK -->|"Token found"| ME["GET /api/auth/me\nAuthorization: Bearer token"]
    CHECK -->|"No token"| AUTH_SCREEN["Show Auth Screen"]

    ME -->|"200 OK"| SET_USER["setUser(user)\nsetWalletBalance(balance)\nisAuthChecked = true"]
    ME -->|"401 Unauthorized"| CLEAR["clearToken()\nisAuthChecked = true"]
    CLEAR --> AUTH_SCREEN

    SET_USER --> HOME["Navigate to /(tabs)\nHome Screen"]

    AUTH_SCREEN --> REG["Register Form"]
    AUTH_SCREEN --> LOGIN["Login Form"]
    AUTH_SCREEN --> DEMO["Demo Button"]

    REG --> POST_REG["POST /api/auth/register"]
    LOGIN --> POST_LOGIN["POST /api/auth/login"]
    DEMO --> TRY_LOGIN["POST /api/auth/login\ndemo@rwandapay.rw"]
    TRY_LOGIN -->|"401 - no account"| AUTO_REG["POST /api/auth/register\nauto-create demo account"]

    POST_REG -->|"201"| STORE["storeToken(token)\nsetUser(user)\nsetWalletBalance(balance)"]
    POST_LOGIN -->|"200"| STORE
    TRY_LOGIN -->|"200"| STORE
    AUTO_REG -->|"201"| STORE

    STORE --> HOME

    HOME --> LOGOUT["User taps Sign Out"]
    LOGOUT --> CLEAR_ALL["clearToken()\nsetUser(null)\nsetWalletBalance(0)"]
    CLEAR_ALL --> AUTH_SCREEN
```

---

## 6. State Management Architecture

Rwanda Pay uses **React Context API** for global state management. There are two providers: `AuthContext` for user identity and `WalletContext` for financial data.

```mermaid
graph TD
    subgraph Providers["React Context Providers — app/_layout.tsx"]
        AUTH["AuthContext\n─────────────────\nuser: ApiUser | null\nwalletBalance: number\nisAuthChecked: boolean\nisSigningIn: boolean\n─────────────────\nsignIn() signUp()\nsignInDemo() signOut()\nrefreshBalance()"]

        WALLET["WalletContext\n─────────────────\ncards: Card[]\ntransactions: Transaction[]\nselectedCardId: string\nhideBalance: boolean\nisLoading: boolean\n─────────────────\nrefreshWallet()\naddCard() removeCard()\naddTransaction()\ntoggleHideBalance()"]
    end

    subgraph Persistence["Persistence Layer"]
        SECURE["expo-secure-store\nJWT token\n(encrypted)"]
        ASYNC["AsyncStorage\nselectedCard\nhideBalance\nprofile\nnotifications"]
    end

    subgraph Screens["Screens that consume context"]
        HOME["Home\nbalance · cards · transactions"]
        PAY["Pay\nbalance check · add transaction"]
        SEND["Send\nbalance · add transaction"]
        TOPUP["TopUp\ncards · add transaction"]
        ANALYTICS["Analytics\ntransactions"]
        SETTINGS["Settings\nuser · hideBalance · profile"]
        TRANSACTIONS["Transactions\ntransactions list"]
    end

    AUTH <-->|"read/write token"| SECURE
    WALLET <-->|"read/write prefs"| ASYNC

    AUTH --> HOME
    AUTH --> SETTINGS
    WALLET --> HOME
    WALLET --> PAY
    WALLET --> SEND
    WALLET --> TOPUP
    WALLET --> ANALYTICS
    WALLET --> SETTINGS
    WALLET --> TRANSACTIONS
```

---

## 7. Data Flow — Wallet Top-Up

A detailed trace of data through all layers for the top-up operation.

```mermaid
flowchart LR
    USER(["User"]) -->|"Selects card\nEnters 10,000 RWF"| TOPUP_SCR["TopUp Screen\ntopup.tsx"]
    TOPUP_SCR -->|"walletApi.topup(cardId, 10000)"| API_CLIENT["lib/api.ts\nPOST /api/wallet/topup\nBearer token"]
    API_CLIENT -->|"HTTP POST"| AUTH_MW["requireAuth\nVerify JWT\nAttach req.user"]
    AUTH_MW -->|"req.user.userId"| WALLET_RT["wallet route handler\nValidate topupSchema"]
    WALLET_RT -->|"SELECT card WHERE id=? AND userId=?"| CARDS_DB[("cards table")]
    CARDS_DB -->|"card record"| WALLET_RT
    WALLET_RT -->|"SELECT wallet WHERE userId=?"| WALLET_DB[("wallets table")]
    WALLET_DB -->|"{ balance: 50000 }"| WALLET_RT
    WALLET_RT -->|"UPDATE balance = 60000"| WALLET_DB
    WALLET_RT -->|"INSERT transaction type=topup"| TX_DB[("transactions table")]
    TX_DB -->|"transaction record"| WALLET_RT
    WALLET_RT -->|"{ transaction, balance: 60000 }"| API_CLIENT
    API_CLIENT -->|"{ transaction, balance }"| TOPUP_SCR
    TOPUP_SCR -->|"setWalletBalance(60000)"| AUTH_CTX["AuthContext\nUpdates balance state"]
    TOPUP_SCR -->|"addTransaction(tx)"| WALLET_CTX["WalletContext\nPrepends to transactions"]
    AUTH_CTX -->|"Re-renders"| HOME_SCR["Home Screen\nShows 60,000 RWF"]
```

---

## 8. Database Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        text id PK "UUID"
        text email UK "NOT NULL"
        text password_hash "NOT NULL, never returned in API"
        text name "NOT NULL"
        text phone "nullable"
        text initials "NOT NULL, 1-2 chars"
        integer created_at "Unix timestamp"
        integer updated_at "Unix timestamp"
    }

    WALLETS {
        text id PK "UUID"
        text user_id FK "UNIQUE, CASCADE DELETE"
        integer balance "NOT NULL, DEFAULT 0, in RWF"
        integer created_at "Unix timestamp"
        integer updated_at "Unix timestamp"
    }

    CARDS {
        text id PK "UUID"
        text user_id FK "CASCADE DELETE"
        text last4 "NOT NULL, exactly 4 chars"
        text card_type "visa / mastercard / amex"
        text holder_name "NOT NULL"
        text card_name "NOT NULL, display name"
        text color "NOT NULL, hex color"
        integer is_default "0 or 1 (boolean)"
        integer created_at "Unix timestamp"
    }

    TRANSACTIONS {
        text id PK "UUID"
        text user_id FK "CASCADE DELETE"
        text type "topup / send / receive / payment"
        integer amount "NOT NULL, in RWF"
        text description "NOT NULL"
        text status "success / failed"
        text card_id FK "SET NULL on card delete"
        text recipient_id FK "SET NULL on user delete"
        text recipient_name "nullable, denormalized"
        text category "food/transport/shopping/entertainment/health/other"
        integer created_at "Unix timestamp"
    }

    USERS ||--|| WALLETS : "has exactly one"
    USERS ||--o{ CARDS : "has zero or many"
    USERS ||--o{ TRANSACTIONS : "creates zero or many"
    CARDS ||--o{ TRANSACTIONS : "referenced by zero or many"
    USERS ||--o{ TRANSACTIONS : "is recipient of zero or many"
```

---

## 9. Security Architecture

```mermaid
flowchart TD
    subgraph MobileLayer["Mobile Security"]
        SECURE_STORE["expo-secure-store\nJWT encrypted at rest\nOS keychain / keystore"]
        BIO_AUTH["expo-local-authentication\nFace ID / Fingerprint\nRequired for every payment"]
        NO_PLAIN["No plaintext secrets\nin AsyncStorage"]
    end

    subgraph TransportLayer["Transport Security"]
        HTTPS["HTTPS in production\nTLS 1.2+"]
        BEARER["Authorization: Bearer token\non every protected request"]
    end

    subgraph APILayer["API Security"]
        JWT_VERIFY["JWT signature verification\nHS256 algorithm\nExpiry check (7 days)"]
        BCRYPT["bcrypt password hashing\ncost factor 10\n~100ms per hash"]
        ZOD_VAL["Zod input validation\nRejects malformed input\nbefore any DB access"]
        NO_HASH["passwordHash stripped\nfrom all API responses"]
        SCOPE["User scoping\nAll queries filter by req.user.userId\nCannot access other users' data"]
    end

    subgraph DBLayer["Database Security"]
        CASCADE["CASCADE DELETE\nNo orphaned records"]
        SET_NULL["SET NULL on FK delete\nNo broken references"]
        INT_AMOUNTS["Integer amounts\nNo floating point precision issues"]
    end

    SECURE_STORE --> BEARER
    BIO_AUTH --> JWT_VERIFY
    BEARER --> JWT_VERIFY
    JWT_VERIFY --> ZOD_VAL
    ZOD_VAL --> SCOPE
    SCOPE --> CASCADE
```

---

## 10. Deployment Architecture

```mermaid
graph TB
    subgraph Devices["User Devices"]
        IOS["iPhone\niOS 14+\nExpo Go / Standalone"]
        ANDROID["Android Phone\nAndroid 10+\nExpo Go / Standalone"]
    end

    subgraph Cloud["Cloud / Server"]
        subgraph Container["Docker Container (Production)"]
            API["API Server\nNode.js 24 · Express 5\nPort 8080"]
        end
        subgraph DBServer["Database Server"]
            PG[("PostgreSQL 15\nManaged DB")]
        end
    end

    subgraph EnvVars["Environment Variables"]
        SECRET["SESSION_SECRET\nJWT signing key"]
        DB_URL["DATABASE_URL\nPostgreSQL connection string"]
        PORT["PORT=8080"]
        DOMAIN["EXPO_PUBLIC_DOMAIN\nAPI server URL for mobile app"]
    end

    IOS -->|"HTTPS REST\nAuthorization: Bearer"| API
    ANDROID -->|"HTTPS REST\nAuthorization: Bearer"| API
    API -->|"Drizzle ORM\nSQL queries"| PG
    EnvVars --> API
    DOMAIN --> IOS
    DOMAIN --> ANDROID
```
