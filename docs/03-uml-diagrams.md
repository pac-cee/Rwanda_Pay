# Rwanda Pay — UML Diagrams

---

## 1. Use Case Diagram

```mermaid
graph TD
    Guest([Guest User])
    User([Authenticated User])
    Demo([Demo User])
    System([System / Backend])

    Guest --> UC1[Register]
    Guest --> UC2[Login]
    Guest --> UC3[Demo Login]

    User --> UC4[View Wallet Balance]
    User --> UC5[Top Up Wallet]
    User --> UC6[Transfer Money]
    User --> UC7[NFC Tap-to-Pay]
    User --> UC8[View Cards]
    User --> UC9[Add Card]
    User --> UC10[Delete Card]
    User --> UC11[Set Default Card]
    User --> UC12[View Transactions]
    User --> UC13[Filter Transactions]
    User --> UC14[View Analytics]
    User --> UC15[Update Profile]
    User --> UC16[Toggle Hide Balance]
    User --> UC17[Toggle Face ID]
    User --> UC18[Logout]

    Demo --> UC3

    UC7 --> UC19[Biometric Auth]
    UC19 --> System

    UC5 --> System
    UC6 --> System
    UC7 --> System
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
        +Date createdAt
        +Date updatedAt
        +register(email, password, name, phone) User
        +login(email, password) JWT
        +updateProfile(name, phone) User
        +logout() void
    }

    class Wallet {
        +UUID id
        +UUID userId
        +Integer balance
        +Date createdAt
        +Date updatedAt
        +getBalance() Integer
        +topup(cardId, amount) Transaction
        +transfer(recipientEmail, amount, description) Transaction
        +pay(amount, description, category) Transaction
    }

    class Card {
        +UUID id
        +UUID userId
        +String last4
        +String cardType
        +String holderName
        +String cardName
        +String color
        +Boolean isDefault
        +Date createdAt
        +setDefault() void
        +delete() void
    }

    class Transaction {
        +UUID id
        +UUID userId
        +String type
        +Integer amount
        +String description
        +String status
        +UUID cardId
        +UUID recipientId
        +String recipientName
        +String category
        +Date createdAt
    }

    class AuthContext {
        +ApiUser user
        +Integer walletBalance
        +Boolean isAuthChecked
        +Boolean isSigningIn
        +signUp(email, password, name, phone) void
        +signIn(email, password) void
        +signInDemo() void
        +signOut() void
        +refreshBalance() void
    }

    class WalletContext {
        +Card[] cards
        +Transaction[] transactions
        +String selectedCardId
        +Boolean hideBalance
        +Profile profile
        +Boolean isLoading
        +addCard(card) void
        +removeCard(id) void
        +addTransaction(tx) void
        +refreshWallet() void
        +toggleHideBalance() void
        +updateProfile(partial) void
    }

    class Profile {
        +String name
        +String phone
        +String email
        +String initials
    }

    class JWTService {
        +signToken(payload) String
        +verifyToken(token) Payload
    }

    class RequireAuth {
        +middleware(req, res, next) void
    }

    User "1" --> "1" Wallet : owns
    User "1" --> "0..*" Card : has
    User "1" --> "0..*" Transaction : creates
    Transaction "0..*" --> "0..1" Card : linked to
    Transaction "0..*" --> "0..1" User : recipient
    AuthContext --> JWTService : uses
    RequireAuth --> JWTService : uses
    WalletContext --> AuthContext : reads balance from
    WalletContext "1" --> "1" Profile : contains
```

---

## 3. Sequence Diagram — User Registration

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant API as API Server
    participant DB as PostgreSQL

    U->>App: Fill register form (email, password, name)
    App->>API: POST /api/auth/register
    API->>API: Validate with Zod registerSchema
    API->>DB: SELECT user WHERE email = ?
    DB-->>API: [] (no existing user)
    API->>API: bcrypt.hash(password, 10)
    API->>DB: INSERT INTO users
    DB-->>API: user record
    API->>DB: INSERT INTO wallets (balance=50000)
    DB-->>API: wallet record
    API->>DB: INSERT INTO cards (3 seed cards)
    DB-->>API: cards[]
    API->>DB: INSERT INTO transactions (5 seed txs)
    DB-->>API: ok
    API->>API: signToken({ userId, email })
    API-->>App: 201 { user, wallet, token }
    App->>App: storeToken(token) via expo-secure-store
    App->>App: setUser(user), setWalletBalance(50000)
    App-->>U: Navigate to Home screen
```

---

## 4. Sequence Diagram — NFC Tap-to-Pay

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant Bio as Biometric (expo-local-authentication)
    participant API as API Server
    participant DB as PostgreSQL

    U->>App: Tap "Start Scanning"
    App->>App: setFlow("scanning"), haptic feedback
    App->>App: setTimeout 2500ms (simulate NFC scan)
    App-->>U: "Scanning for terminal…"
    App->>App: setFlow("terminal_found"), haptic warning
    App-->>U: "Terminal detected! Tap to authenticate"
    U->>App: Tap "Authenticate & Pay"
    App->>App: setFlow("auth_prompt"), show AuthModal
    U->>App: Tap "Authenticate" in modal
    App->>Bio: authenticateAsync({ promptMessage })
    Bio-->>App: { success: true }
    App->>App: setFlow("processing"), haptic heavy
    App->>API: POST /api/wallet/pay { amount, description, category }
    API->>API: requireAuth middleware (verify JWT)
    API->>DB: SELECT wallet WHERE userId = ?
    DB-->>API: wallet { balance }
    API->>API: Check balance >= amount
    API->>DB: UPDATE wallet SET balance = balance - amount
    API->>DB: INSERT INTO transactions (type="payment")
    DB-->>API: transaction record
    API-->>App: 200 { transaction, balance }
    App->>App: setFlow("success"), haptic success
    App-->>U: "Payment successful!" + animation
    App->>App: setTimeout 3000ms → reset to idle
```

---

## 5. Sequence Diagram — Wallet Transfer

```mermaid
sequenceDiagram
    actor S as Sender
    participant App as Mobile App
    participant API as API Server
    participant DB as PostgreSQL
    actor R as Recipient

    S->>App: Enter recipientEmail, amount, description
    App->>API: POST /api/wallet/transfer
    API->>API: requireAuth (verify JWT)
    API->>API: Validate transferSchema
    API->>API: Check sender != recipient
    API->>DB: SELECT wallet WHERE userId = sender
    DB-->>API: senderWallet
    API->>API: Check senderWallet.balance >= amount
    API->>DB: SELECT user WHERE email = recipientEmail
    DB-->>API: recipient user
    API->>DB: UPDATE wallet SET balance -= amount (sender)
    API->>DB: SELECT wallet WHERE userId = recipient
    DB-->>API: recipientWallet (or null)
    alt Recipient wallet exists
        API->>DB: UPDATE wallet SET balance += amount
    else No wallet
        API->>DB: INSERT INTO wallets (balance = amount)
    end
    API->>DB: INSERT transaction (type="send", userId=sender)
    API->>DB: INSERT transaction (type="receive", userId=recipient)
    DB-->>API: senderTx
    API-->>App: 200 { transaction, balance }
    App-->>S: "Sent successfully!" animation
    Note over DB,R: Recipient sees new "receive" transaction on next refresh
```

---

## 6. Sequence Diagram — Login & Token Restore

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant Store as expo-secure-store
    participant API as API Server

    App->>Store: getToken()
    alt Token exists
        Store-->>App: jwt string
        App->>API: GET /api/auth/me (Bearer token)
        API->>API: verifyToken(jwt)
        API-->>App: { user, wallet }
        App->>App: setUser(u), setWalletBalance(balance)
        App-->>U: Navigate to Home
    else No token
        Store-->>App: null
        App-->>U: Show Auth screen
        U->>App: Enter email + password
        App->>API: POST /api/auth/login
        API-->>App: { user, wallet, token }
        App->>Store: storeToken(token)
        App-->>U: Navigate to Home
    end
```

---

## 7. Sequence Diagram — Analytics

```mermaid
sequenceDiagram
    actor U as User
    participant App as Mobile App
    participant API as API Server
    participant DB as PostgreSQL

    U->>App: Open Analytics tab
    App->>App: Compute cutoff = now - 7 days (default)
    App->>App: Filter local transactions by cutoff + type
    App-->>U: Render chart + category breakdown (local data)

    U->>App: Switch to "This Month"
    App->>App: Recompute cutoff = now - 30 days
    App-->>U: Re-render with 30-day data

    Note over App,API: Background refresh (on mount)
    App->>API: GET /api/transactions/analytics?period=30
    API->>DB: SELECT transactions WHERE userId AND createdAt >= since
    DB-->>API: transactions[]
    API->>API: Compute totalIn, totalOut, byCategory, monthly
    API-->>App: { byCategory, monthly, totalIn, totalOut }
    App-->>U: Update analytics display
```
