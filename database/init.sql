-- ============================================================
-- Rwanda Pay Database Schema
-- PostgreSQL 16
-- Clean schema — start fresh
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE card_network AS ENUM ('visa', 'mastercard', 'amex');
CREATE TYPE card_status AS ENUM ('active', 'frozen', 'expired', 'cancelled');
CREATE TYPE transaction_type AS ENUM ('topup', 'payment', 'send', 'receive', 'refund', 'withdrawal');
CREATE TYPE transaction_status AS ENUM ('pending', 'success', 'failed', 'reversed');
CREATE TYPE transaction_category AS ENUM ('food', 'transport', 'shopping', 'entertainment', 'health', 'utilities', 'education', 'other');
CREATE TYPE merchant_category AS ENUM ('food_beverage', 'retail', 'transport', 'health', 'entertainment', 'education', 'utilities', 'services', 'other');
CREATE TYPE merchant_status AS ENUM ('active', 'suspended', 'pending_review');
CREATE TYPE relationship_status AS ENUM ('active', 'blocked');

-- ============================================================
-- USERS
-- ============================================================

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   TEXT NOT NULL,
    name            VARCHAR(255) NOT NULL,
    phone           VARCHAR(20),
    initials        VARCHAR(5) NOT NULL,
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================================
-- WALLETS
-- One per user. Balance starts at 0.
-- Payments always come from wallet balance.
-- ============================================================

CREATE TABLE wallets (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    balance         BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    currency        CHAR(3) NOT NULL DEFAULT 'RWF',
    is_frozen       BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);

-- ============================================================
-- CARDS
-- Each card has its own balance (simulated).
-- User tops up wallet FROM a card.
-- card_number and cvv are AES-256-GCM encrypted — never returned in API.
-- ============================================================

CREATE TABLE cards (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Sensitive — AES-256-GCM encrypted, never returned in API responses
    card_number     TEXT NOT NULL,
    cvv             TEXT NOT NULL,

    -- Safe to return
    last4           CHAR(4) NOT NULL,
    expiry_date     CHAR(5) NOT NULL,           -- MM/YY
    holder_name     VARCHAR(255) NOT NULL,
    network         card_network NOT NULL DEFAULT 'visa',
    label           VARCHAR(100) NOT NULL DEFAULT 'My Card',
    color           CHAR(7) NOT NULL DEFAULT '#1B5E20',
    balance         BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
    is_default      BOOLEAN NOT NULL DEFAULT FALSE,
    status          card_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cards_user_id ON cards(user_id);
-- Enforce only one default card per user
CREATE UNIQUE INDEX idx_cards_one_default ON cards(user_id) WHERE is_default = TRUE;

-- ============================================================
-- MERCHANTS
-- ============================================================

CREATE TABLE merchants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE,
    phone           VARCHAR(20),
    category        merchant_category NOT NULL DEFAULT 'other',
    description     TEXT,
    address         TEXT,
    city            VARCHAR(100),
    logo_url        TEXT,
    website         TEXT,
    merchant_code   VARCHAR(20) UNIQUE,
    status          merchant_status NOT NULL DEFAULT 'active',
    is_verified     BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_merchants_category ON merchants(category);
CREATE INDEX idx_merchants_merchant_code ON merchants(merchant_code);

-- ============================================================
-- USER_MERCHANTS
-- User <-> Merchant relationship: favourites, spend tracking
-- ============================================================

CREATE TABLE user_merchants (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    merchant_id     UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
    is_favourite    BOOLEAN NOT NULL DEFAULT FALSE,
    status          relationship_status NOT NULL DEFAULT 'active',
    total_spent     BIGINT NOT NULL DEFAULT 0,
    visit_count     INTEGER NOT NULL DEFAULT 0,
    last_visited_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, merchant_id)
);

CREATE INDEX idx_user_merchants_user_id ON user_merchants(user_id);
CREATE INDEX idx_user_merchants_merchant_id ON user_merchants(merchant_id);

-- ============================================================
-- TRANSACTIONS
-- Every financial event. Immutable audit trail.
-- ============================================================

CREATE TABLE transactions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            transaction_type NOT NULL,
    status          transaction_status NOT NULL DEFAULT 'pending',
    amount          BIGINT NOT NULL CHECK (amount > 0),
    fee             BIGINT NOT NULL DEFAULT 0,
    description     TEXT NOT NULL,
    category        transaction_category NOT NULL DEFAULT 'other',
    reference       VARCHAR(50) UNIQUE,
    card_id         UUID REFERENCES cards(id) ON DELETE SET NULL,
    merchant_id     UUID REFERENCES merchants(id) ON DELETE SET NULL,
    recipient_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    recipient_name  VARCHAR(255),
    balance_before  BIGINT,
    balance_after   BIGINT,
    is_nfc          BOOLEAN NOT NULL DEFAULT FALSE,
    device_info     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_merchant_id ON transactions(merchant_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX idx_transactions_reference ON transactions(reference);
CREATE INDEX idx_transactions_recipient_id ON transactions(recipient_id);

-- ============================================================
-- TRIGGERS — auto-update updated_at
-- ============================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_wallets_updated_at
    BEFORE UPDATE ON wallets FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_merchants_updated_at
    BEFORE UPDATE ON merchants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_merchants_updated_at
    BEFORE UPDATE ON user_merchants FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ============================================================
-- SEED MERCHANTS
-- ============================================================

INSERT INTO merchants (name, category, description, city, merchant_code, is_verified) VALUES
    ('Simba Supermarket',    'retail',         'Grocery and household items',    'Kigali', 'SIMBA001',   TRUE),
    ('Heaven Restaurant',    'food_beverage',  'Fine dining in Kigali',          'Kigali', 'HEAVEN001',  TRUE),
    ('Nyabugogo Bus Park',   'transport',      'Intercity bus services',         'Kigali', 'NYABUS001',  TRUE),
    ('Kigali City Tower',    'retail',         'Shopping mall',                  'Kigali', 'KCT001',     TRUE),
    ('King Faisal Hospital', 'health',         'Private hospital',               'Kigali', 'KFH001',     TRUE),
    ('MTN Rwanda',           'utilities',      'Mobile money and airtime',       'Kigali', 'MTN001',     TRUE),
    ('Airtel Rwanda',        'utilities',      'Mobile money and airtime',       'Kigali', 'AIRTEL001',  TRUE),
    ('Bourbon Coffee',       'food_beverage',  'Coffee and light meals',         'Kigali', 'BOURBON001', TRUE),
    ('Nakumatt',             'retail',         'Supermarket chain',              'Kigali', 'NAK001',     TRUE),
    ('Kigali Arena',         'entertainment',  'Sports and entertainment venue', 'Kigali', 'ARENA001',   TRUE);

-- ============================================================
-- NOTIFICATIONS
-- User notifications for transactions, payments, etc.
-- ============================================================

CREATE TYPE notification_type AS ENUM ('payment_received', 'payment_sent', 'topup_success', 'card_added', 'payment_success', 'payment_failed', 'system');

CREATE TABLE notifications (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            notification_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    message         TEXT NOT NULL,
    transaction_id  UUID REFERENCES transactions(id) ON DELETE SET NULL,
    is_read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
