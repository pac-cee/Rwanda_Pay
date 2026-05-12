-- Activity Logs Table for Admin Dashboard
CREATE TABLE IF NOT EXISTS activity_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id         UUID REFERENCES users(id) ON DELETE SET NULL,
    action          VARCHAR(255) NOT NULL,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    duration_ms     INTEGER,
    status_code     INTEGER,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Add last_login to users table for tracking active users
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMPTZ;

-- Create index for last_login
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC);

-- Sample activity log entries
INSERT INTO activity_logs (action, ip_address, user_agent, duration_ms, status_code) VALUES
('POST /api/v1/auth/login', '192.168.1.1', 'Mozilla/5.0', 150, 200),
('GET /api/v1/wallet', '192.168.1.1', 'Mozilla/5.0', 50, 200),
('POST /api/v1/wallet/topup', '192.168.1.2', 'Mozilla/5.0', 200, 200);
