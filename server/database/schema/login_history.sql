-- Login History Table
-- Tracks all login attempts for security auditing

CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  login_time TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  success BOOLEAN DEFAULT false,
  failure_reason VARCHAR(255)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_username ON login_history(username);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_history_success ON login_history(success);
