# Rwanda Pay — Software Requirements Document (SRD)

## 1. Project Overview

Rwanda Pay is a premium digital wallet and mobile payment application targeting the Rwandan market. It enables users to manage multiple bank cards, maintain a digital wallet in RWF (Rwandan Franc), send/receive money, make NFC-simulated tap-to-pay payments, and view spending analytics.

---

## 2. Stakeholders

| Role            | Description                                             |
| --------------- | ------------------------------------------------------- |
| End User        | Rwandan mobile users who want a digital wallet          |
| System Operator | Backend administrators managing the platform            |
| Card Provider   | External providers (Bank of Kigali, MTN MoMo, I&M Bank) |

---

## 3. Functional Requirements

### 3.1 Authentication

- **FR-01** Users shall register with email, password (min 6 chars), full name, and optional phone
- **FR-02** Users shall log in with email and password
- **FR-03** System shall issue a JWT token on successful login/registration
- **FR-04** JWT shall be stored securely using expo-secure-store
- **FR-05** Users shall be able to log out, clearing the stored token
- **FR-06** A demo account shall be auto-created on first tap (`demo@rwandapay.rw`)
- **FR-07** Google and Apple sign-in stubs shall exist (not yet functional — pending OAuth credentials)
- **FR-08** Users shall be able to update their name and phone number

### 3.2 Wallet

- **FR-09** Each user shall have exactly one wallet in RWF
- **FR-10** New users shall receive a 50,000 RWF welcome balance on registration
- **FR-11** Users shall top up their wallet from a linked card (min 500 RWF, max 5,000,000 RWF)
- **FR-12** Users shall transfer money to another user by email (min 100 RWF)
- **FR-13** System shall prevent self-transfers
- **FR-14** System shall reject transfers when sender has insufficient balance
- **FR-15** Wallet balance shall be displayed on the home screen with a hide/show toggle

### 3.3 Cards

- **FR-16** Users shall have 3 seed cards created on registration (Bank of Kigali Visa, MTN MoMo, I&M Bank Mastercard)
- **FR-17** Users shall add new cards (Visa, Mastercard, Amex) with last 4 digits, holder name, card name, and color
- **FR-18** Users shall delete cards
- **FR-19** Users shall set a default card
- **FR-20** Cards shall be displayed in a horizontal swipeable carousel on the home screen

### 3.4 Payments (NFC Tap-to-Pay Simulation)

- **FR-21** Users shall initiate an NFC payment simulation from the Pay tab
- **FR-22** System shall simulate terminal scanning with a 2.5s delay
- **FR-23** Users shall authenticate via Face ID / fingerprint before payment is processed
- **FR-24** Payment shall deduct the amount from the wallet balance
- **FR-25** Haptic feedback shall be provided at each payment stage
- **FR-26** Users shall optionally enter merchant name and amount before scanning

### 3.5 Transactions

- **FR-27** All wallet operations (topup, send, receive, payment) shall create a transaction record
- **FR-28** Transactions shall carry: type, amount, description, status, category, optional cardId, optional recipientId/recipientName
- **FR-29** Transaction list shall support pagination (limit/offset) and type filtering
- **FR-30** Transactions shall be grouped by date (Today, Yesterday, full date label)
- **FR-31** Transaction categories: `food`, `transport`, `shopping`, `entertainment`, `health`, `other`

### 3.6 Analytics

- **FR-32** Users shall view spending analytics for the past 7 or 30 days
- **FR-33** Analytics shall show total spent, a bar chart (daily/weekly buckets), and category breakdown with progress bars
- **FR-34** Backend analytics endpoint shall return `totalIn`, `totalOut`, `byCategory`, and `monthly` breakdown

### 3.7 Settings

- **FR-35** Users shall toggle balance visibility (hide/show) across the entire app
- **FR-36** Users shall toggle Face ID / fingerprint requirement for payments
- **FR-37** Users shall toggle push notifications (UI toggle; backend integration pending)
- **FR-38** Users shall view and inline-edit their profile name
- **FR-39** Users shall navigate to transaction history and analytics from settings

---

## 4. Non-Functional Requirements

### 4.1 Performance

- **NFR-01** API responses shall complete within 500ms under normal load
- **NFR-02** Mobile app shall render the home screen within 2 seconds of auth check
- **NFR-03** Animated splash screen shall display for 3 seconds then auto-navigate

### 4.2 Security

- **NFR-04** Passwords shall be hashed using bcrypt (cost factor 10)
- **NFR-05** JWT tokens shall be signed with the `SESSION_SECRET` environment variable
- **NFR-06** All protected routes shall require a valid `Authorization: Bearer <token>` header
- **NFR-07** Biometric authentication shall be required for every NFC payment
- **NFR-08** Password hashes shall never be returned in any API response

### 4.3 Usability

- **NFR-09** App shall support iOS and Android via Expo / React Native
- **NFR-10** App shall use the Inter font family for consistent typography
- **NFR-11** App shall support dark/light color themes via the `useColors` hook
- **NFR-12** All monetary values shall be formatted in RWF using the `en-RW` locale

### 4.4 Reliability

- **NFR-13** Wallet context shall fall back to mock data if the API is unavailable
- **NFR-14** AsyncStorage shall persist user preferences (selected card, hide balance, profile) across restarts
- **NFR-15** Database cascades shall clean up wallets, cards, and transactions when a user is deleted

### 4.5 Scalability

- **NFR-16** Transaction list endpoint shall cap at 100 records per request
- **NFR-17** Monorepo structure shall allow independent deployment of API and mobile app

---

## 5. Constraints

| Constraint      | Detail                                        |
| --------------- | --------------------------------------------- |
| Currency        | RWF only, stored as integers (no decimals)    |
| Database        | PostgreSQL only                               |
| Mobile runtime  | Expo SDK (bare React Native not supported)    |
| Package manager | pnpm only (npm/yarn rejected at install time) |
| Node.js         | Version 24+ required                          |

---

## 6. Assumptions

- Users have a smartphone with internet connectivity
- Biometric hardware is available on the device for payment authentication
- Real NFC hardware is not required; the payment flow is fully simulated
