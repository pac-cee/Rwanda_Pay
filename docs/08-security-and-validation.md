# Security & Validation Documentation

## 🔐 Card Storage Security

### **How Card Numbers Are Stored**

Rwanda Pay uses **military-grade encryption** to protect sensitive card data:

#### **Encryption Algorithm: AES-256-GCM**

- **AES-256**: Advanced Encryption Standard with 256-bit key
- **GCM**: Galois/Counter Mode (provides both encryption + authentication)
- **Industry Standard**: Same encryption used by banks, governments, and military

#### **What Gets Encrypted**

1. **Full Card Number** (16 digits) - ENCRYPTED ✅
2. **CVV** (3-4 digits) - ENCRYPTED ✅
3. **Last 4 Digits** - Stored in plain text (for display purposes)
4. **Expiry Date** - Stored in plain text (MM/YY format)
5. **Cardholder Name** - Stored in plain text

#### **Encryption Process**

```
User Input: "1234567890123456"
         ↓
   AES-256-GCM Encryption
         ↓
Stored in DB: "a3f5b2c8d1e4f7a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3"
```

**Key Features:**
- **Unique Nonce**: Each encryption uses a random nonce (prevents pattern detection)
- **Authentication Tag**: Ensures data hasn't been tampered with
- **32-byte Key**: 256-bit encryption key (64 hex characters)

#### **Database Storage**

```sql
-- cards table
CREATE TABLE cards (
    id              UUID PRIMARY KEY,
    user_id         UUID NOT NULL,
    
    -- ENCRYPTED FIELDS (never returned in API)
    card_number     TEXT NOT NULL,  -- Encrypted with AES-256-GCM
    cvv             TEXT NOT NULL,  -- Encrypted with AES-256-GCM
    
    -- SAFE TO RETURN
    last4           CHAR(4) NOT NULL,      -- "1234"
    expiry_date     CHAR(5) NOT NULL,      -- "12/25"
    holder_name     VARCHAR(255) NOT NULL,
    network         card_network NOT NULL,
    label           VARCHAR(100) NOT NULL,
    color           CHAR(7) NOT NULL,
    balance         BIGINT NOT NULL,
    is_default      BOOLEAN NOT NULL,
    status          card_status NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL
);
```

#### **API Response (What Frontend Receives)**

```json
{
  "id": "abc123",
  "last4": "1234",           // ✅ Safe to show
  "expiry_date": "12/25",    // ✅ Safe to show
  "holder_name": "John Doe", // ✅ Safe to show
  "network": "visa",
  "label": "Bank of Kigali",
  "color": "#1B5E20",
  "balance": 50000,
  "is_default": true,
  "status": "active"
  // ❌ card_number: NEVER returned
  // ❌ cvv: NEVER returned
}
```

---

## 🛡️ Security Layers

### **1. Transport Security**
- **TLS 1.3** encryption for all API requests
- **HTTPS only** in production
- Certificate pinning (recommended for production)

### **2. Authentication Security**
- **JWT tokens** with 7-day expiry
- **bcrypt password hashing** (cost factor 10)
- **Biometric authentication** (Face ID / Fingerprint)
- Tokens stored in **secure keychain** (iOS) / **keystore** (Android)

### **3. Data Security**
- **AES-256-GCM encryption** for card numbers and CVV
- **Encrypted at rest** in database
- **Never logged** or exposed in error messages
- **Secure key management** via environment variables

### **4. Session Management**
- **Persistent sessions** via JWT tokens
- **Auto-logout** on token expiry (7 days)
- **Biometric re-authentication** for sensitive operations
- **Token refresh** not implemented (user must re-login after 7 days)

---

## ✅ Frontend Validations

### **1. Card Number Validation**

```typescript
// Format: 1234 5678 9012 3456
const formatCardNumber = (text: string) => {
  const clean = text.replace(/\D/g, "").slice(0, 16);
  const groups = clean.match(/.{1,4}/g) ?? [];
  return groups.join(" ");
};

// Validation
- Minimum 12 digits (some cards are 13-16 digits)
- Maximum 16 digits
- Only numeric characters
- Auto-formatted with spaces
```

### **2. Expiry Date Validation**

```typescript
const validateExpiry = (expiryStr: string): boolean => {
  if (expiryStr.length !== 5) return false; // Must be MM/YY
  
  const [month, year] = expiryStr.split("/");
  const mm = parseInt(month, 10);
  const yy = parseInt(year, 10);
  
  // Month must be 1-12
  if (mm < 1 || mm > 12) return false;
  
  const now = new Date();
  const currentYear = now.getFullYear() % 100; // Last 2 digits
  const currentMonth = now.getMonth() + 1;
  
  // Card expired if year is less than current year
  if (yy < currentYear) return false;
  
  // If same year, check month
  if (yy === currentYear && mm < currentMonth) return false;
  
  return true;
};
```

**Validation Rules:**
- ✅ Format must be MM/YY
- ✅ Month must be 01-12
- ✅ Year cannot be in the past
- ✅ If current year, month must be current or future
- ❌ Rejects expired cards

**Examples:**
```
Current Date: May 2026 (05/26)

✅ Valid:   05/26, 06/26, 12/26, 01/27, 12/30
❌ Invalid: 04/26, 12/25, 13/26, 00/26, 99/99
```

### **3. Email Validation**

```typescript
// Basic email format check
const isValidEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};
```

### **4. Password Validation**

```typescript
// Minimum 8 characters (enforced on backend)
// No complexity requirements (for demo purposes)
```

### **5. Amount Validation**

```typescript
// Wallet balance check
if (amount > walletBalance) {
  throw new Error("Insufficient balance");
}

// Minimum amount
if (amount < 100) {
  throw new Error("Minimum amount is 100 RWF");
}

// Maximum amount
if (amount > 10_000_000) {
  throw new Error("Maximum amount is 10,000,000 RWF");
}
```

---

## 🔒 Backend Validations

### **1. Card Service Validations**

```go
// Card number must be exactly 16 digits
if len(in.CardNumber) != 16 {
    return nil, fmt.Errorf("card number must be 16 digits")
}

// Expiry date must be MM/YY format
if len(in.ExpiryDate) != 5 {
    return nil, fmt.Errorf("expiry date must be MM/YY")
}

// CVV must be 3 or 4 digits
if len(in.CVV) < 3 || len(in.CVV) > 4 {
    return nil, fmt.Errorf("CVV must be 3 or 4 digits")
}

// Holder name is required
if in.HolderName == "" {
    return nil, fmt.Errorf("holder name is required")
}

// Balance cannot be negative
if in.Balance < 0 {
    return nil, fmt.Errorf("balance cannot be negative")
}
```

### **2. Wallet Service Validations**

```go
// Amount must be positive
if amount <= 0 {
    return nil, fmt.Errorf("amount must be greater than 0")
}

// Check sufficient balance
if wallet.Balance < amount {
    return nil, domain.ErrInsufficientBalance
}

// Check wallet not frozen
if wallet.IsFrozen {
    return nil, domain.ErrWalletFrozen
}

// Check card is active
if card.Status != domain.CardStatusActive {
    return nil, domain.ErrCardExpired
}
```

### **3. Auth Service Validations**

```go
// Email must be valid format
if !isValidEmail(email) {
    return nil, fmt.Errorf("invalid email format")
}

// Password minimum length
if len(password) < 8 {
    return nil, fmt.Errorf("password must be at least 8 characters")
}

// Email must be unique
existing, _ := s.userRepo.GetByEmail(ctx, email)
if existing != nil {
    return nil, domain.ErrEmailAlreadyRegistered
}
```

---

## 🚨 Security Best Practices

### **What We Do Right ✅**

1. **Encryption at Rest**: Card numbers encrypted in database
2. **Encryption in Transit**: HTTPS/TLS for all API calls
3. **Secure Storage**: JWT tokens in secure keychain/keystore
4. **Password Hashing**: bcrypt with cost factor 10
5. **Input Validation**: Both frontend and backend validation
6. **Biometric Auth**: Face ID / Fingerprint for payments
7. **No Sensitive Data in Logs**: Card numbers never logged
8. **Expiry Validation**: Prevents adding expired cards

### **Production Recommendations 🔧**

1. **Key Rotation**: Rotate encryption keys periodically
2. **Certificate Pinning**: Pin SSL certificates in mobile app
3. **Rate Limiting**: Prevent brute force attacks
4. **2FA**: Add two-factor authentication for login
5. **Fraud Detection**: Monitor suspicious transaction patterns
6. **PCI DSS Compliance**: If handling real cards, get certified
7. **Security Audits**: Regular penetration testing
8. **Backup Encryption**: Encrypt database backups
9. **Access Logs**: Log all access to sensitive data
10. **Token Refresh**: Implement refresh tokens for better UX

---

## 📊 Encryption Key Management

### **Current Setup (Development)**

```bash
# .env file
ENCRYPTION_KEY=a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2
JWT_SECRET=your-super-secret-jwt-key-change-in-production
```

### **Production Setup (Recommended)**

1. **AWS Secrets Manager**: Store keys in AWS Secrets Manager
2. **Environment Variables**: Never commit keys to Git
3. **Key Rotation**: Rotate keys every 90 days
4. **Access Control**: Limit who can access keys
5. **Audit Logs**: Log all key access

---

## 🔍 How to Verify Security

### **1. Check Encrypted Data in Database**

```sql
-- Connect to database
psql -U rwandapay -d rwandapay

-- View encrypted card data
SELECT id, last4, card_number, cvv FROM cards LIMIT 1;

-- Output:
-- id: abc123
-- last4: 1234
-- card_number: a3f5b2c8d1e4f7a9... (encrypted hex string)
-- cvv: b4c7d0e3f6a9... (encrypted hex string)
```

### **2. Check API Response**

```bash
# Login and get token
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}' \
  | jq -r '.data.token')

# Get cards
curl -s http://localhost:8080/api/v1/cards \
  -H "Authorization: Bearer $TOKEN" | jq

# Verify card_number and cvv are NOT in response
```

### **3. Test Expiry Validation**

```bash
# Try to add expired card (should fail)
curl -X POST http://localhost:8080/api/v1/cards \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "card_number": "1234567890123456",
    "expiry_date": "12/20",
    "cvv": "123",
    "holder_name": "Test User",
    "network": "visa"
  }'
```

---

## 📝 Summary

### **Card Storage: SECURE ✅**
- Full card numbers are **AES-256-GCM encrypted**
- CVV is **AES-256-GCM encrypted**
- Only last 4 digits stored in plain text
- **Never returned in API responses**

### **Validation: COMPREHENSIVE ✅**
- **Frontend**: Expiry date validation prevents expired cards
- **Backend**: Multiple layers of validation
- **Format checks**: Card number, CVV, expiry date
- **Business logic**: Balance checks, status checks

### **Session Management: PERSISTENT ✅**
- JWT tokens stored in **secure keychain/keystore**
- **7-day expiry** (configurable)
- **Auto-login** on app restart if token valid
- **Biometric login** available for convenience
- **No splash screen** for logged-in users

### **Security Rating: 🌟🌟🌟🌟 (4/5)**

**Why not 5/5?**
- No token refresh mechanism
- No 2FA
- No rate limiting
- No fraud detection
- Development keys in .env (should use secrets manager in production)

**For an academic project: EXCELLENT ✅**
**For production: Needs additional hardening 🔧**
