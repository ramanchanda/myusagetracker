-- Create users table for multi-user management
-- Admin user remains in config vars (cannot be locked out)
-- All other users stored in database

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255),
  email VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  last_login_at TIMESTAMP
);

-- Create index for fast username lookup
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);

-- Add comments
COMMENT ON TABLE users IS 'Application users (non-admin users). Admin user stored in config vars.';
COMMENT ON COLUMN users.role IS 'User role: viewer (read-only) or editor (can configure notifications)';
COMMENT ON COLUMN users.is_active IS 'Whether user account is active. Inactive users cannot login.';
COMMENT ON COLUMN users.created_by IS 'Username of admin who created this user';
