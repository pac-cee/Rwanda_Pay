# Phase 1 — UML Diagrams

All diagrams are written in Mermaid syntax. They can be rendered in:
- GitHub (native Mermaid support in `.md` files)
- VS Code with the "Mermaid Preview" extension
- [mermaid.live](https://mermaid.live) — paste any diagram block to render it

---

## 1. Use Case Diagram

Describes all interactions between actors and the system.

```mermaid
graph TD
    subgraph Actors
        G([Guest User])
        U([Authenticated User])
        D([Demo User])
        B([Biometric Device\nFace ID / Fingerprint])
        S([API Server])
    end

    subgraph Authentication
        UC1[Register Account]
        UC2[Login with Email]
        UC3[Try Demo Account]
        UC4[Restore Session on Launch]
        UC5[Update Profile]
        UC6[Logout]
    end

    subgraph Wallet Operations
        UC7[View Wallet Balance]
        UC8[Top Up Wallet from Card]
        UC9[Transfer Money by Email]
        UC10[NFC Tap-to-Pay]
        UC11[Biometric Authentication]
    end

    subgraph Card Management
        UC12[View Cards]
        UC13[Add New Card]
        UC14[Delete Card]
        UC15[Set Default Card]
    end

    subgraph Transactions
        UC16[View Transaction History]
        UC17[Filter Transactions by Type]
        UC18[View Spending Analytics]
    end

    subgraph Settings
        UC19[Toggle Hide Balance]
        UC20[Toggle Face ID for Payments]
        UC21[Toggle Notifications]
    end

    G --> UC1
    G --> UC2
    G --> UC3

    D --> UC3

    U --> UC4
    U --> UC5
    U --> UC6
    U --> UC7
    U --> UC8
    U --> UC9
    U --> UC10
    U --> UC12
    U --> UC13
    U --> UC14
    U --> UC15
    U --> UC16
    U --> UC17
    U --> UC18
    U --> UC19
    U --> UC20
    U --> UC21

    UC10 --> UC11
    UC11 --> B

    UC1 --> S
    UC2 --> S
    UC8 --> S
    UC9 --> S
    UC10 --> S
    UC16 --> S
    UC18 --> S
```

---

## 2. Class Diagram

Describes the structure of the system — classes, attributes, methods, and relationships.

```mermaid
classDiagram
    class User {
        +String id
        +String email
        +String passwordHash
        +String name
        +String phone
        +String initials
        +Date createdAt
        +Date updatedAt
        +register(email, password, name, phone) User
        +login(email, password) String
        +updateProfile(name, phone) User
        +logout() void
        +makeInitials(name) String
    }

    class Wallet {
        +String id
        +String userId
        +Integer balance
        +Date createdAt
        +Date updatedAt
        +getBalance() Integer
        +topup(cardId, amount) Transaction
        +transfer(recipientEmail, amount, description) Transaction
        +pay(amount, description, category) Transaction
        +checkSufficientBalance(amount) Boolean
    }

    class Card {
        +String id
        +String userId
        +String last4
        +String cardType
        +String holderName
        +String cardName
        +String color
        +Boolean isDefault
        +Date createdAt
        +setDefault() void
        +delete() void
        +belongsToUser(userId) Boolean
    }

    class Transaction {
        +String id
        +String userId
        +String type
        +Integer amount
        +String description
        +String status
        +String cardId
        +String recipientId
        +String recipientName
        +String category
        +Date createdAt
        +isIncoming() Boolean
        +isOutgoing() Boolean
    }

    class AuthContext {
        +User user
        +Integer walletBalance
        +Boolean isAuthChecked
        +Boolean isSigningIn
        +signUp(email, password, name, phone) void
        +signIn(email, password) void
        +signInDemo() void
        +signOut() void
        +refreshBalance() void
        +setWalletBalance(balance) void
    }

    class WalletContext {
        +Card[] cards
        +Transaction[] transactions
        +String selectedCardId
        +Boolean hideBalance
        +Boolean isLoading
        +addCard(card) void
        +removeCard(id) void
        +addTransaction(tx) void
        +refreshWallet() void
        +toggleHideBalance() void
        +setSelectedCard(id) void
        +updateProfile(partial) void
    }

    class APIClient {
        +String BASE_URL
        +getToken() Promise~String~
        +storeToken(token) Promise~void~
        +clearToken() Promise~void~
        +request(path, options) Promise~T~
    }

    class JWTService {
        +String secret
        +String expiresIn
        +signToken(payload) String
        +verifyToken(token) JWTPayload
    }

    class RequireAuthMiddleware {
        +handle(req, res, next) void
        +extractBearerToken(header) String
    }

    class DrizzleRepository {
        +Database db
        +select(table) QueryBuilder
        +insert(table) InsertBuilder
        +update(table) UpdateBuilder
        +delete(table) DeleteBuilder
    }

    class ZodValidator {
        +registerSchema ZodSchema
        +loginSchema ZodSchema
        +topupSchema ZodSchema
        +transferSchema ZodSchema
        +paySchema ZodSchema
        +addCardSchema ZodSchema
        +validate(schema, data) ParseResult
    }

    User "1" --> "1" Wallet : owns
    User "1" --> "0..*" Card : has
    User "1" --> "0..*" Transaction : creates
    Transaction "0..*" --> "0..1" Card : linked to
    Transaction "0..*" --> "0..1" User : recipient

    AuthContext --> APIClient : uses
    AuthContext --> JWTService : delegates token ops
    WalletContext --> AuthContext : reads balance from
    WalletContext --> APIClient : fetches data via

    RequireAuthMiddleware --> JWTService : verifies with
    DrizzleRepository --> User : persists
    DrizzleRepository --> Wallet : persists
    DrizzleRepository --> Card : persists
    DrizzleRepository --> Transaction : persists
    ZodValidator --> APIClient : validates requests for
```

---

## 3. Activity Diagram — NFC Tap-to-Pay Flow

Describes the step-by-step flow of the most complex user interaction in the system.

```mermaid
flowchart TD
    START([User opens Pay tab]) --> IDLE[Idle state\nShow payment form]
    IDLE --> INPUT[User enters merchant name\namount and category]
    INPUT --> TAP_SCAN[User taps Start Scanning]
    TAP_SCAN --> SET_SCAN[Set state to scanning\nStart animation\nHaptic light feedback]
    SET_SCAN --> WAIT[Wait 2500ms\nSimulate NFC scan]
    WAIT --> FOUND{NFC terminal\ndetected?}

    FOUND -->|Timeout / Error| ERR_SCAN[Show scan error\nReset to idle after 2s]
    ERR_SCAN --> IDLE

    FOUND -->|Yes| TERMINAL[Set state to terminal_found\nHaptic warning feedback\nShow terminal UI]
    TERMINAL --> TAP_AUTH[User taps Authenticate and Pay]
    TAP_AUTH --> SHOW_MODAL[Show Auth Modal\nDisplay amount and merchant]
    SHOW_MODAL --> TAP_CONFIRM[User taps Confirm in modal]
    TAP_CONFIRM --> BIO_PROMPT[Trigger biometric prompt\nexpo-local-authentication\nFace ID or fingerprint]

    BIO_PROMPT --> BIO_RESULT{Biometric\nresult}
    BIO_RESULT -->|Cancelled| CANCEL[User cancelled\nReturn to terminal_found state]
    CANCEL --> TERMINAL
    BIO_RESULT -->|Failed| BIO_FAIL[Show auth failed message\nReset after 2.5s]
    BIO_FAIL --> TERMINAL
    BIO_RESULT -->|Success| PROCESSING[Set state to processing\nHaptic heavy feedback]

    PROCESSING --> API_CALL[POST /api/wallet/pay\namount, description, category]
    API_CALL --> API_RESULT{API response}

    API_RESULT -->|Insufficient balance| INSUF[Show insufficient balance error\nReset to idle]
    INSUF --> IDLE
    API_RESULT -->|Network error| NET_ERR[Show network error\nReset to idle]
    NET_ERR --> IDLE
    API_RESULT -->|200 Success| SUCCESS[Set state to success\nHaptic success feedback\nUpdate wallet balance\nAdd transaction to history]

    SUCCESS --> SHOW_SUCCESS[Show Payment Successful screen\nDisplay amount and merchant\nConfetti animation]
    SHOW_SUCCESS --> WAIT_RESET[Wait 3000ms]
    WAIT_RESET --> IDLE
```

---

## 4. Activity Diagram — User Registration and Onboarding

```mermaid
flowchart TD
    START([User opens app for first time]) --> SPLASH[Show animated splash screen\n3 second duration]
    SPLASH --> AUTH_CHECK[Check for stored JWT token\nexpo-secure-store]
    AUTH_CHECK --> HAS_TOKEN{Token\nexists?}

    HAS_TOKEN -->|Yes| RESTORE[Call GET /api/auth/me\nwith Bearer token]
    RESTORE --> RESTORE_RESULT{Response}
    RESTORE_RESULT -->|200 OK| HOME[Navigate to Home screen\nSet user and balance]
    RESTORE_RESULT -->|401 Unauthorized| CLEAR_TOKEN[Clear invalid token]
    CLEAR_TOKEN --> AUTH_SCREEN

    HAS_TOKEN -->|No| AUTH_SCREEN[Show Auth screen\nLogin / Register / Demo]

    AUTH_SCREEN --> CHOICE{User choice}
    CHOICE -->|Login| LOGIN_FORM[Show login form]
    CHOICE -->|Register| REG_FORM[Show registration form]
    CHOICE -->|Demo| DEMO[Auto-login or create demo account]

    REG_FORM --> FILL[User fills email\npassword, name, phone]
    FILL --> VALIDATE{Client-side\nvalidation}
    VALIDATE -->|Invalid| SHOW_ERRORS[Show inline field errors]
    SHOW_ERRORS --> FILL
    VALIDATE -->|Valid| POST_REG[POST /api/auth/register]

    POST_REG --> REG_RESULT{Server response}
    REG_RESULT -->|400 Invalid input| SHOW_ERRORS
    REG_RESULT -->|409 Email exists| EMAIL_ERR[Show email already registered error]
    EMAIL_ERR --> FILL
    REG_RESULT -->|201 Created| STORE_TOKEN[Store JWT in expo-secure-store]
    STORE_TOKEN --> SET_STATE[Set user state\nSet wallet balance 50000 RWF]
    SET_STATE --> HOME

    LOGIN_FORM --> LOGIN_FILL[User fills email and password]
    LOGIN_FILL --> POST_LOGIN[POST /api/auth/login]
    POST_LOGIN --> LOGIN_RESULT{Server response}
    LOGIN_RESULT -->|401 Wrong credentials| LOGIN_ERR[Show invalid credentials error]
    LOGIN_ERR --> LOGIN_FILL
    LOGIN_RESULT -->|200 OK| STORE_TOKEN

    DEMO --> DEMO_RESULT{Demo account\nexists?}
    DEMO_RESULT -->|Yes - login succeeds| STORE_TOKEN
    DEMO_RESULT -->|No - auto-register| POST_REG
```

---

## 5. Sequence Diagram — Complete NFC Payment

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant Bio as Biometric System
    participant API as API Server
    participant DB as Database

    U->>App: Open Pay tab
    App-->>U: Show payment form (idle state)
    U->>App: Enter amount 2000 RWF, merchant "Simba Supermarket"
    U->>App: Tap "Start Scanning"
    App->>App: setState(scanning), haptic light
    App-->>U: Show scanning animation
    Note over App: 2500ms simulated NFC scan
    App->>App: setState(terminal_found), haptic warning
    App-->>U: "Terminal detected! Tap to authenticate"
    U->>App: Tap "Authenticate & Pay"
    App-->>U: Show auth modal with amount
    U->>App: Tap "Confirm"
    App->>Bio: authenticateAsync({ promptMessage: "Authenticate to pay" })
    Bio-->>App: { success: true }
    App->>App: setState(processing), haptic heavy
    App->>API: POST /api/wallet/pay { amount: 2000, description: "Simba Supermarket", category: "food" }
    API->>API: requireAuth — verify JWT
    API->>DB: SELECT wallet WHERE userId = req.user.userId
    DB-->>API: { balance: 50000 }
    API->>API: Check 50000 >= 2000 ✓
    API->>DB: UPDATE wallets SET balance = 48000 WHERE userId = ?
    API->>DB: INSERT INTO transactions { type: "payment", amount: 2000, ... }
    DB-->>API: transaction record
    API-->>App: 200 { transaction, balance: 48000 }
    App->>App: setState(success), haptic success
    App->>App: setWalletBalance(48000)
    App->>App: addTransaction(transaction)
    App-->>U: "Payment Successful! 2,000 RWF"
    Note over App: 3000ms display
    App->>App: setState(idle)
    App-->>U: Reset to payment form
```

---

## 6. Sequence Diagram — Wallet Transfer

```mermaid
sequenceDiagram
    actor S as Sender
    actor R as Recipient
    participant App as Mobile App
    participant API as API Server
    participant DB as Database

    S->>App: Open Send screen
    S->>App: Enter recipient@example.com, 5000 RWF, "Lunch split"
    App->>App: Validate form (email format, amount >= 100)
    App->>API: POST /api/wallet/transfer { recipientEmail, amount: 5000, description }
    API->>API: requireAuth — verify JWT
    API->>API: Validate transferSchema
    API->>API: Check sender email != recipient email
    API->>DB: SELECT wallet WHERE userId = sender.id
    DB-->>API: { balance: 50000 }
    API->>API: Check 50000 >= 5000 ✓
    API->>DB: SELECT user WHERE email = "recipient@example.com"
    DB-->>API: recipient user record
    API->>DB: UPDATE wallets SET balance = 45000 WHERE userId = sender.id
    API->>DB: SELECT wallet WHERE userId = recipient.id
    DB-->>API: recipient wallet { balance: 20000 }
    API->>DB: UPDATE wallets SET balance = 25000 WHERE userId = recipient.id
    API->>DB: INSERT transaction { type: "send", userId: sender.id, amount: 5000 }
    API->>DB: INSERT transaction { type: "receive", userId: recipient.id, amount: 5000 }
    DB-->>API: sender transaction
    API-->>App: 200 { transaction, balance: 45000 }
    App->>App: setWalletBalance(45000)
    App->>App: addTransaction(transaction)
    App-->>S: "Sent 5,000 RWF successfully!"
    Note over DB,R: Next time Recipient opens app, their balance shows 25,000 RWF
```

---

## 7. Component Diagram

Describes the physical components of the system and their dependencies.

```mermaid
graph TB
    subgraph MobileApp["📱 Mobile Application — Expo React Native"]
        subgraph ScreenLayer["Screen Layer (Expo Router v6)"]
            AUTH_SCR["auth.tsx\nLogin / Register / Demo"]
            HOME_SCR["index.tsx\nHome — Balance + Cards"]
            PAY_SCR["pay.tsx\nNFC Tap-to-Pay"]
            SEND_SCR["send.tsx\nSend Money Modal"]
            RECEIVE_SCR["receive.tsx\nReceive Modal"]
            TOPUP_SCR["topup.tsx\nTop-Up Modal"]
            TX_SCR["transactions.tsx\nTransaction List"]
            AN_SCR["analytics.tsx\nSpending Charts"]
            SET_SCR["settings.tsx\nProfile + Preferences"]
            ADDCARD_SCR["add-card.tsx\nAdd New Card"]
        end

        subgraph ContextLayer["Context Layer (React Context API)"]
            AUTH_CTX["AuthContext\nuser · balance · isAuthChecked"]
            WALLET_CTX["WalletContext\ncards · transactions · hideBalance"]
        end

        subgraph LibLayer["Library Layer"]
            API_CLIENT["lib/api.ts\nHTTP Client + Auth helpers"]
            SECURE["expo-secure-store\nEncrypted JWT storage"]
            ASYNC_ST["AsyncStorage\nPreferences persistence"]
            BIO["expo-local-authentication\nFace ID / Fingerprint"]
            HAPTICS["expo-haptics\nTactile feedback"]
            REANIMATED["react-native-reanimated\nUI thread animations"]
        end
    end

    subgraph APIServer["🖥️ API Server — Node.js 24 / Express 5"]
        subgraph MiddlewareLayer["Middleware Chain"]
            CORS_MW["cors\nCross-origin requests"]
            LOG_MW["pino-http\nStructured request logging"]
            BODY_MW["express.json\nRequest body parsing"]
            AUTH_MW["requireAuth\nJWT verification"]
        end

        subgraph RouteLayer["Route Handlers"]
            AUTH_RT["/auth\nregister · login · me · profile · logout"]
            WALLET_RT["/wallet\nbalance · topup · transfer · pay"]
            CARDS_RT["/cards\nlist · add · delete · set-default"]
            TX_RT["/transactions\nlist · analytics"]
            HEALTH_RT["/healthz\nhealth check"]
        end

        subgraph ServiceLayer["Services"]
            JWT_SVC["JWT Service\nsignToken · verifyToken"]
            BCRYPT_SVC["bcryptjs\nhash · compare"]
            DRIZZLE["Drizzle ORM\ntype-safe SQL queries"]
            PINO["pino\nstructured logger"]
        end
    end

    subgraph SharedLibs["📦 Shared Libraries — pnpm workspace"]
        DB_LIB["@workspace/db\nDrizzle schema definitions\nZod validators\nDB connection"]
        ZOD_LIB["@workspace/api-zod\nGenerated Zod types\nfrom OpenAPI spec"]
        CLIENT_LIB["@workspace/api-client-react\nGenerated React Query hooks"]
    end

    subgraph DatabaseLayer["🗄️ Database"]
        SQLITE[("SQLite\nbetter-sqlite3\nDevelopment")]
        PG[("PostgreSQL 15\nProduction")]
    end

    ScreenLayer --> ContextLayer
    ContextLayer --> API_CLIENT
    API_CLIENT --> SECURE
    WALLET_CTX --> ASYNC_ST
    PAY_SCR --> BIO
    PAY_SCR --> HAPTICS
    ScreenLayer --> REANIMATED

    API_CLIENT -->|"HTTP REST JSON\nAuthorization: Bearer"| MiddlewareLayer
    MiddlewareLayer --> RouteLayer
    RouteLayer --> AUTH_MW
    AUTH_MW --> JWT_SVC
    RouteLayer --> ServiceLayer
    ServiceLayer --> DB_LIB
    DRIZZLE --> SQLITE
    DRIZZLE --> PG

    DB_LIB --> ZOD_LIB
    RouteLayer --> DB_LIB
    MobileApp --> CLIENT_LIB
    CLIENT_LIB --> ZOD_LIB
```
