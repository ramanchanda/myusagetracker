-- Login History Table
-- Tracks successful login attempts for security auditing

CREATE TABLE IF NOT EXISTS login_history (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL,
  role VARCHAR(50),
  login_time TIMESTAMP DEFAULT NOW(),
  ip_address VARCHAR(45),
  user_agent TEXT,
  browser VARCHAR(100),
  system_id VARCHAR(255)
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_login_history_username ON login_history(username);
CREATE INDEX IF NOT EXISTS idx_login_history_time ON login_history(login_time DESC);

-- Migration: Add new columns if they don't exist (for existing deployments)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_history' AND column_name='browser') THEN
    ALTER TABLE login_history ADD COLUMN browser VARCHAR(100);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_history' AND column_name='system_id') THEN
    ALTER TABLE login_history ADD COLUMN system_id VARCHAR(255);
  END IF;

  -- Drop old columns if they exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_history' AND column_name='success') THEN
    ALTER TABLE login_history DROP COLUMN success;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='login_history' AND column_name='failure_reason') THEN
    ALTER TABLE login_history DROP COLUMN failure_reason;
  END IF;
END $$;
