# Phase 1 — UML Diagrams

All diagrams are written in Mermaid syntax. They can be rendered in:
- GitHub (native Mermaid support in `.md` files)
- VS Code with the "Mermaid Preview" extension
- [mermaid.live](https://mermaid.live) — paste any diagram block to render it

---

## 1. Use Case Diagram

```mermaid
graph TD
    subgraph Actors
        G([Guest User])
        U([Authenticated User])
        B([Biometric Device\nFace ID / Fingerprint])
        API([API Server])
    end

    subgraph Authentication
        UC1[Register Account]
        UC2[Login with Email]
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
        UC16[Add Balance to Card]
    end

    subgraph Transactions
        UC17[View Transaction History]
        UC18[Filter Transactions by Type]
        UC19[View Spending Analytics]
        UC20[View Contact Ledger]
    end

    subgraph Settings
        UC21[Toggle Hide Balance]
        UC22[Toggle Face ID for Payments]
    end

    G --> UC1
    G --> UC2

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
    U --> UC22

    UC10 --> UC11
    UC11 --> B

    UC1 --> API
    UC2 --> API
    UC8 --> API
    UC9 --> API
    UC10 --> API
    UC17 --> API
    UC19 --> API
```

---

## 2. Class Diagram

```mermaid
classDiagram
    class User {
        +UUID id
        +String email
        +String passwordHash
        +String name
        +String phone
        +String initials
        +Boolean isVerified
        +Boolean isActive
        +Time createdAt
        +Time updatedAt
    }

    class Wallet {
        +UUID id
        +UUID userId
        +Int64 balance
        +String currency
        +Boolean isFrozen
        +Time createdAt
        +Time updatedAt
    }

    class Card {
        +UUID id
        +UUID userId
        +String cardNumber
        +String cvv
        +String last4
        +String expiryDate
        +String holderName
        +CardNetwork network
        +String label
        +String color
        +Int64 balance
        +Boolean isDefault
        +CardStatus status
        +Time createdAt
    }

    class Transaction {
        +UUID id
        +UUID userId
        +TransactionType type
        +TransactionStatus status
        +Int64 amount
        +Int64 fee
        +String description
        +TransactionCategory category
        +String reference
        +UUID cardId
        +UUID merchantId
        +UUID recipientId
        +String recipientName
        +Int64 balanceBefore
        +Int64 balanceAfter
        +Boolean isNFC
        +Time createdAt
    }

    class Merchant {
        +UUID id
        +String name
        +MerchantCategory category
        +String merchantCode
        +Boolean isVerified
        +Time createdAt
    }

    class AuthService {
        +Register(ctx, input) AuthResult
        +Login(ctx, input) AuthResult
        +GetMe(ctx, userID) AuthResult
        +UpdateProfile(ctx, userID, name, phone) User
    }

    class WalletService {
        +GetBalance(ctx, userID) Wallet
        +Topup(ctx, input) WalletResult
        +Transfer(ctx, input) WalletResult
        +Pay(ctx, input) WalletResult
    }

    class CardService {
        +AddCard(ctx, input) Card
        +ListCards(ctx, userID) []Card
        +AddCardBalance(ctx, cardID, userID, amount) Card
        +DeleteCard(ctx, cardID, userID) error
        +SetDefault(ctx, cardID, userID) Card
    }

    class TransactionService {
        +List(ctx, userID, limit, offset, type) []Transaction
        +Analytics(ctx, userID, days) Analytics
        +GetLedger(ctx, userID, contactEmail) Ledger
    }

    class WalletRepository {
        +Create(ctx, wallet) error
        +GetByUserID(ctx, userID) Wallet
        +UpdateBalance(ctx, walletID, balance) error
        +TransferTx(ctx, senderID, recipientID, amount) balances
        +TopupTx(ctx, walletID, cardID, amount) balances
        +PayTx(ctx, walletID, amount) balance
    }

    class JWTService {
        +Sign(userID, email) String
        +Verify(token) Claims
    }

    class CryptoService {
        +Encrypt(plaintext) String
        +Decrypt(ciphertext) String
    }

    User "1" --> "1" Wallet : owns
    User "1" --> "0..*" Card : has
    User "1" --> "0..*" Transaction : creates
    Transaction "0..*" --> "0..1" Card : linked to
    Transaction "0..*" --> "0..1" User : recipient
    Transaction "0..*" --> "0..1" Merchant : paid to

    AuthService --> WalletRepository : uses
    WalletService --> WalletRepository : uses
    CardService --> CryptoService : encrypts with
    AuthService --> JWTService : signs tokens with
```

---

## 3. Activity Diagram — NFC Tap-to-Pay Flow

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

    PROCESSING --> API_CALL[POST /api/v1/wallet/pay\namount, description, category]
    API_CALL --> API_RESULT{API response}

    API_RESULT -->|Insufficient balance| INSUF[Show insufficient balance error\nReset to idle]
    INSUF --> IDLE
    API_RESULT -->|Network error| NET_ERR[Show network error\nReset to idle]
    NET_ERR --> IDLE
    API_RESULT -->|200 Success| SUCCESS[Set state to success\nHaptic success feedback\nUpdate wallet balance\nAdd transaction to history]

    SUCCESS --> SHOW_SUCCESS[Show Payment Successful screen\nDisplay amount and merchant]
    SHOW_SUCCESS --> WAIT_RESET[Wait 3000ms]
    WAIT_RESET --> IDLE
```

---

## 4. Activity Diagram — User Registration and Onboarding

```mermaid
flowchart TD
    START([User opens app for first time]) --> SPLASH[Show animated splash screen]
    SPLASH --> AUTH_CHECK[Check for stored JWT token\nexpo-secure-store]
    AUTH_CHECK --> HAS_TOKEN{Token\nexists?}

    HAS_TOKEN -->|Yes| RESTORE[Call GET /api/v1/auth/me\nwith Bearer token]
    RESTORE --> RESTORE_RESULT{Response}
    RESTORE_RESULT -->|200 OK| HOME[Navigate to Home screen\nSet user and balance]
    RESTORE_RESULT -->|401 Unauthorized| CLEAR_TOKEN[Clear invalid token]
    CLEAR_TOKEN --> AUTH_SCREEN

    HAS_TOKEN -->|No| AUTH_SCREEN[Show Auth screen\nLogin / Register]

    AUTH_SCREEN --> CHOICE{User choice}
    CHOICE -->|Login| LOGIN_FORM[Show login form]
    CHOICE -->|Register| REG_FORM[Show registration form]

    REG_FORM --> FILL[User fills email\npassword, name, phone]
    FILL --> VALIDATE{Client-side\nvalidation}
    VALIDATE -->|Invalid| SHOW_ERRORS[Show inline field errors]
    SHOW_ERRORS --> FILL
    VALIDATE -->|Valid| POST_REG[POST /api/v1/auth/register]

    POST_REG --> REG_RESULT{Server response}
    REG_RESULT -->|400 Invalid input| SHOW_ERRORS
    REG_RESULT -->|409 Email exists| EMAIL_ERR[Show email already registered error]
    EMAIL_ERR --> FILL
    REG_RESULT -->|201 Created| STORE_TOKEN[Store JWT in expo-secure-store]
    STORE_TOKEN --> SET_STATE[Set user state\nSet wallet balance 0 RWF]
    SET_STATE --> HOME

    LOGIN_FORM --> LOGIN_FILL[User fills email and password]
    LOGIN_FILL --> POST_LOGIN[POST /api/v1/auth/login]
    POST_LOGIN --> LOGIN_RESULT{Server response}
    LOGIN_RESULT -->|401 Wrong credentials| LOGIN_ERR[Show invalid credentials error]
    LOGIN_ERR --> LOGIN_FILL
    LOGIN_RESULT -->|200 OK| STORE_TOKEN
```

---

## 5. Sequence Diagram — Complete NFC Payment

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant Bio as Biometric System
    participant API as API Server (Go/Fiber)
    participant DB as PostgreSQL

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
    App->>API: POST /api/v1/wallet/pay { amount: 2000, description: "Simba Supermarket", category: "food" }
    API->>API: middleware.Auth — verify JWT
    API->>DB: SELECT id, balance, is_frozen FROM wallets WHERE id = ? FOR UPDATE
    DB-->>API: { balance: 50000, is_frozen: false }
    API->>API: Check 50000 >= 2000 ✓
    API->>DB: UPDATE wallets SET balance = 48000, updated_at = NOW() WHERE id = ?
    API->>DB: COMMIT
    API->>DB: INSERT INTO transactions { type: "payment", amount: 2000, balance_before: 50000, balance_after: 48000 }
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

## 6. Sequence Diagram — Wallet Transfer (Atomic)

```mermaid
sequenceDiagram
    actor S as Sender
    actor R as Recipient
    participant App as Mobile App
    participant API as API Server (Go/Fiber)
    participant DB as PostgreSQL

    S->>App: Open Send screen
    S->>App: Enter recipient@example.com, 5000 RWF, "Lunch split"
    App->>App: Validate form (email format, amount >= 100)
    App->>API: POST /api/v1/wallet/transfer { recipient_email, amount: 5000, description }
    API->>API: middleware.Auth — verify JWT
    API->>DB: SELECT user WHERE email = "recipient@example.com"
    DB-->>API: recipient user record
    API->>DB: SELECT wallet WHERE user_id = sender.id
    DB-->>API: sender wallet { id: "wallet-A" }
    API->>DB: SELECT wallet WHERE user_id = recipient.id
    DB-->>API: recipient wallet { id: "wallet-B" }
    Note over API,DB: BEGIN TRANSACTION
    API->>DB: SELECT balance, is_frozen FROM wallets WHERE id = "wallet-A" FOR UPDATE (lock in UUID order)
    API->>DB: SELECT balance, is_frozen FROM wallets WHERE id = "wallet-B" FOR UPDATE
    DB-->>API: sender: { balance: 50000 }, recipient: { balance: 20000 }
    API->>API: Check 50000 >= 5000 ✓
    API->>DB: UPDATE wallets SET balance = 45000 WHERE id = "wallet-A"
    API->>DB: UPDATE wallets SET balance = 25000 WHERE id = "wallet-B"
    API->>DB: COMMIT
    Note over API,DB: END TRANSACTION — atomic, no race condition possible
    API->>DB: INSERT transaction { type: "send", user_id: sender.id, amount: 5000 }
    API->>DB: INSERT transaction { type: "receive", user_id: recipient.id, amount: 5000 }
    DB-->>API: sender transaction
    API-->>App: 200 { transaction, balance: 45000 }
    App->>App: setWalletBalance(45000)
    App-->>S: "Sent 5,000 RWF successfully!"
    Note over DB,R: Next time Recipient opens app, their balance shows 25,000 RWF
```

---

## 7. Component Diagram

```mermaid
graph TB
    subgraph MobileApp["📱 Mobile Application — Expo React Native"]
        subgraph ScreenLayer["Screen Layer (Expo Router v6)"]
            AUTH_SCR["auth.tsx\nLogin / Register"]
            HOME_SCR["index.tsx\nHome — Balance + Cards"]
            PAY_SCR["pay.tsx\nNFC Tap-to-Pay"]
            SEND_SCR["send.tsx\nSend Money"]
            TOPUP_SCR["topup.tsx\nTop-Up Wallet"]
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
            API_CLIENT["lib/api.ts\nHTTP Client — /api/v1/"]
            SECURE["expo-secure-store\nEncrypted JWT storage"]
            ASYNC_ST["AsyncStorage\nPreferences persistence"]
            BIO["expo-local-authentication\nFace ID / Fingerprint"]
            HAPTICS["expo-haptics\nTactile feedback"]
        end
    end

    subgraph APIServer["🖥️ API Server — Go 1.22 / Fiber v2"]
        subgraph MiddlewareLayer["Middleware Chain"]
            RECOVER_MW["recover.New()\nPanic recovery"]
            LOG_MW["logger.New()\nRequest logging"]
            CORS_MW["cors.New()\nCross-origin requests"]
            AUTH_MW["middleware.Auth()\nJWT verification"]
        end

        subgraph HandlerLayer["Handlers"]
            AUTH_H["AuthHandler\nregister · login · me · profile · logout"]
            WALLET_H["WalletHandler\nbalance · topup · transfer · pay"]
            CARD_H["CardHandler\nlist · add · delete · default · balance"]
            TX_H["TransactionHandler\nlist · analytics · ledger"]
        end

        subgraph ServiceLayer["Services"]
            AUTH_SVC["AuthService\nbcrypt · JWT signing"]
            WALLET_SVC["WalletService\nbusiness rules · validation"]
            CARD_SVC["CardService\nAES-256-GCM encryption"]
            TX_SVC["TransactionService\nanalytics · ledger"]
        end

        subgraph RepoLayer["Repositories (pgx/v5)"]
            USER_REPO["UserRepository\nCRUD users"]
            WALLET_REPO["WalletTxRepository\nCRUD + TransferTx + TopupTx + PayTx"]
            CARD_REPO["CardRepository\nCRUD cards"]
            TX_REPO["TransactionRepository\nCRUD + analytics + ledger"]
            MERCHANT_REPO["MerchantRepository\nread merchants"]
        end
    end

    subgraph DatabaseLayer["🗄️ PostgreSQL 16"]
        USERS_T[("users")]
        WALLETS_T[("wallets")]
        CARDS_T[("cards")]
        TX_T[("transactions")]
        MERCHANTS_T[("merchants")]
        USER_MERCHANTS_T[("user_merchants")]
    end

    ScreenLayer --> ContextLayer
    ContextLayer --> API_CLIENT
    API_CLIENT --> SECURE
    WALLET_CTX --> ASYNC_ST
    PAY_SCR --> BIO
    PAY_SCR --> HAPTICS

    API_CLIENT -->|"HTTP REST JSON\nAuthorization: Bearer\n/api/v1/"| MiddlewareLayer
    MiddlewareLayer --> HandlerLayer
    HandlerLayer --> AUTH_MW
    AUTH_MW --> AUTH_SVC
    HandlerLayer --> ServiceLayer
    ServiceLayer --> RepoLayer
    RepoLayer --> USERS_T
    RepoLayer --> WALLETS_T
    RepoLayer --> CARDS_T
    RepoLayer --> TX_T
    RepoLayer --> MERCHANTS_T
    RepoLayer --> USER_MERCHANTS_T
```
