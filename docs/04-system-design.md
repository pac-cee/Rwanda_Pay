# Rwanda Pay — System Design

---

## 1. High-Level Architecture

```mermaid
graph TB
    subgraph Mobile["Mobile App (Expo / React Native)"]
        UI[Screen Layer<br/>Expo Router v6]
        CTX[Context Layer<br/>AuthContext / WalletContext]
        LIB[API Client<br/>lib/api.ts]
    end

    subgraph Backend["API Server (Node.js / Express 5)"]
        MW[Middleware<br/>CORS · pino-http · requireAuth]
        RT[Route Handlers<br/>auth · wallet · cards · transactions]
        SVC[Services<br/>JWT · bcrypt · Drizzle ORM]
    end

    subgraph Data["Data Layer"]
        PG[(PostgreSQL<br/>users · wallets · cards · transactions)]
    end

    subgraph Shared["Shared Libraries (pnpm workspace)"]
        SCHEMA[@workspace/db<br/>Drizzle schema + Zod validators]
        APICLIENT[@workspace/api-client-react<br/>Generated React hooks]
        APIZOD[@workspace/api-zod<br/>Zod types from OpenAPI]
    end

    UI --> CTX
    CTX --> LIB
    LIB -->|HTTP REST JSON| MW
    MW --> RT
    RT --> SVC
    SVC --> PG
    SVC --> SCHEMA
    RT --> SCHEMA
    LIB --> APICLIENT
    APICLIENT --> APIZOD
```

---

## 2. Monorepo Package Structure

```mermaid
graph LR
    ROOT[workspace root<br/>pnpm-workspace.yaml]

    ROOT --> A1[artifacts/rwanda-pay<br/>Expo mobile app]
    ROOT --> A2[artifacts/api-server<br/>Express REST API]
    ROOT --> A3[artifacts/mockup-sandbox<br/>UI preview / Vite]

    ROOT --> L1[lib/db<br/>Drizzle schema + migrations]
    ROOT --> L2[lib/api-spec<br/>OpenAPI YAML + Orval config]
    ROOT --> L3[lib/api-zod<br/>Generated Zod types]
    ROOT --> L4[lib/api-client-react<br/>Generated React query hooks]

    A1 --> L1
    A1 --> L4
    A2 --> L1
    L2 --> L3
    L2 --> L4
```

---

## 3. Mobile App — Screen & Navigation Structure

```mermaid
graph TD
    ROOT_LAYOUT[_layout.tsx<br/>AuthProvider + WalletProvider + SplashOverlay]

    ROOT_LAYOUT --> AUTH[/auth<br/>Sign In / Sign Up / Demo]
    ROOT_LAYOUT --> TABS[(tabs) _layout.tsx<br/>Bottom Tab Navigator]

    TABS --> HOME[index.tsx<br/>Home — Balance + Cards + Quick Actions]
    TABS --> PAY[pay.tsx<br/>NFC Tap-to-Pay]
    TABS --> TRANSFER[transfer.tsx<br/>Send / Receive]
    TABS --> ANALYTICS[analytics.tsx<br/>Spending Charts]
    TABS --> SETTINGS[settings.tsx<br/>Profile + Preferences]
    TABS --> TRANSACTIONS[transactions.tsx<br/>Transaction List]

    ROOT_LAYOUT --> SEND[/send<br/>Send Money modal]
    ROOT_LAYOUT --> RECEIVE[/receive<br/>Receive / QR Code]
    ROOT_LAYOUT --> TOPUP[/topup<br/>Top Up Wallet]
    ROOT_LAYOUT --> ADDCARD[/add-card<br/>Add New Card]
    ROOT_LAYOUT --> TXFULL[/transactions-full<br/>Full Transaction History]
    ROOT_LAYOUT --> ANFULL[/analytics-full<br/>Full Analytics]
```

---

## 4. API Server — Request Lifecycle

```mermaid
flowchart LR
    REQ[HTTP Request] --> CORS[CORS Middleware]
    CORS --> LOG[pino-http Logger]
    LOG --> BODY[express.json Parser]
    BODY --> ROUTER[/api Router]

    ROUTER --> AUTH_RT[/auth routes<br/>register · login · me · profile · logout]
    ROUTER --> WALLET_RT[/wallet routes<br/>GET · topup · transfer · pay]
    ROUTER --> CARDS_RT[/cards routes<br/>list · add · delete · set-default]
    ROUTER --> TX_RT[/transactions routes<br/>list · analytics]
    ROUTER --> HEALTH[/healthz]

    AUTH_RT --> REQUIRE{requireAuth?}
    WALLET_RT --> REQUIRE
    CARDS_RT --> REQUIRE
    TX_RT --> REQUIRE

    REQUIRE -->|valid JWT| DB[(PostgreSQL<br/>via Drizzle ORM)]
    REQUIRE -->|invalid| ERR401[401 Unauthorized]
    DB --> RES[JSON Response]
```

---

## 5. Authentication Flow

```mermaid
flowchart TD
    START([App Launch]) --> CHECK[getToken from expo-secure-store]
    CHECK -->|token found| ME[GET /api/auth/me]
    CHECK -->|no token| AUTH_SCREEN[Show Auth Screen]

    ME -->|200 OK| HOME[Navigate to Home]
    ME -->|401 error| CLEAR[clearToken] --> AUTH_SCREEN

    AUTH_SCREEN --> REGISTER[Register Form]
    AUTH_SCREEN --> LOGIN[Login Form]
    AUTH_SCREEN --> DEMO[Demo Button]

    REGISTER --> POST_REG[POST /api/auth/register]
    LOGIN --> POST_LOGIN[POST /api/auth/login]
    DEMO --> TRY_LOGIN[POST /api/auth/login<br/>demo@rwandapay.rw]
    TRY_LOGIN -->|fail| AUTO_REG[POST /api/auth/register<br/>auto-create demo account]

    POST_REG --> STORE[storeToken + setUser]
    POST_LOGIN --> STORE
    AUTO_REG --> STORE
    TRY_LOGIN -->|success| STORE
    STORE --> HOME
```

---

## 6. Data Flow — Wallet Top-Up

```mermaid
flowchart LR
    USER([User]) -->|selects card + amount| TOPUP_SCREEN[TopUp Screen]
    TOPUP_SCREEN -->|POST /api/wallet/topup| API[API Server]
    API -->|validate cardId ownership| CARDS_DB[(cards table)]
    CARDS_DB --> API
    API -->|read current balance| WALLET_DB[(wallets table)]
    WALLET_DB --> API
    API -->|UPDATE balance += amount| WALLET_DB
    API -->|INSERT transaction type=topup| TX_DB[(transactions table)]
    TX_DB --> API
    API -->|{ transaction, balance }| TOPUP_SCREEN
    TOPUP_SCREEN -->|setWalletBalance| AUTH_CTX[AuthContext]
    AUTH_CTX --> HOME[Home Screen re-renders balance]
```

---

## 7. State Management Architecture

```mermaid
graph TD
    subgraph Providers["React Context Providers (app/_layout.tsx)"]
        AUTH[AuthContext<br/>user · walletBalance · isAuthChecked · isSigningIn]
        WALLET[WalletContext<br/>cards · transactions · selectedCard · hideBalance · profile]
    end

    subgraph Persistence["Persistence Layer"]
        SECURE[expo-secure-store<br/>JWT token]
        ASYNC[AsyncStorage<br/>selectedCard · hideBalance · profile · notifications]
    end

    subgraph Screens["Screens / Components"]
        HOME[Home]
        PAY[Pay]
        TRANSFER[Transfer]
        ANALYTICS[Analytics]
        SETTINGS[Settings]
        TRANSACTIONS[Transactions]
    end

    AUTH --> HOME
    AUTH --> SETTINGS
    WALLET --> HOME
    WALLET --> PAY
    WALLET --> TRANSFER
    WALLET --> ANALYTICS
    WALLET --> SETTINGS
    WALLET --> TRANSACTIONS

    AUTH <--> SECURE
    WALLET <--> ASYNC
```

---

## 8. Database Entity Relationship Diagram

```mermaid
erDiagram
    USERS {
        uuid id PK
        text email UK
        text password_hash
        text name
        text phone
        text initials
        timestamp created_at
        timestamp updated_at
    }

    WALLETS {
        uuid id PK
        uuid user_id FK
        integer balance
        timestamp created_at
        timestamp updated_at
    }

    CARDS {
        uuid id PK
        uuid user_id FK
        text last4
        text card_type
        text holder_name
        text card_name
        text color
        boolean is_default
        timestamp created_at
    }

    TRANSACTIONS {
        uuid id PK
        uuid user_id FK
        text type
        integer amount
        text description
        text status
        uuid card_id FK
        uuid recipient_id FK
        text recipient_name
        text category
        timestamp created_at
    }

    USERS ||--|| WALLETS : "has one"
    USERS ||--o{ CARDS : "has many"
    USERS ||--o{ TRANSACTIONS : "creates"
    CARDS ||--o{ TRANSACTIONS : "linked to"
    USERS ||--o{ TRANSACTIONS : "recipient of"
```

---

## 9. Deployment Architecture

```mermaid
graph TB
    subgraph Client["Client Devices"]
        IOS[iOS App<br/>Expo standalone]
        ANDROID[Android App<br/>Expo standalone]
    end

    subgraph Server["Replit / Cloud Server"]
        API_SRV[API Server<br/>Node.js 24 · Express 5<br/>Port 8080]
        STATIC[Static Server<br/>Landing Page<br/>Port 20371]
    end

    subgraph DB["Database"]
        PG[(PostgreSQL 15<br/>Replit managed)]
    end

    subgraph ENV["Environment Variables"]
        SECRET[SESSION_SECRET]
        DB_URL[DATABASE_URL / PGHOST etc.]
        DOMAIN[EXPO_PUBLIC_DOMAIN]
    end

    IOS -->|HTTPS REST| API_SRV
    ANDROID -->|HTTPS REST| API_SRV
    API_SRV --> PG
    ENV --> API_SRV
    ENV --> IOS
    ENV --> ANDROID
```
