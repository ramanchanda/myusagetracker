-- Enterprise License Configuration Table
-- Stores per-Enterprise Account license limits and thresholds

CREATE TABLE IF NOT EXISTS enterprise_license_config (
  id SERIAL PRIMARY KEY,

  -- Enterprise Account identification
  account_id TEXT UNIQUE NOT NULL,
  account_name TEXT NOT NULL,

  -- License capacity limits per resource type
  dyno_units_limit NUMERIC DEFAULT 0,
  connect_rows_limit NUMERIC DEFAULT 0,
  data_addons_limit NUMERIC DEFAULT 0,
  general_addons_limit NUMERIC DEFAULT 0,
  private_spaces_limit NUMERIC DEFAULT 0,
  shield_spaces_limit NUMERIC DEFAULT 0,

  -- Threshold percentages for alerting
  warning_percentage NUMERIC DEFAULT 80,
  critical_percentage NUMERIC DEFAULT 95,

  -- Status tracking
  is_active BOOLEAN DEFAULT true,

  -- Audit trail
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for fast lookups by account_id
CREATE INDEX IF NOT EXISTS idx_enterprise_license_account_id
  ON enterprise_license_config(account_id);

-- Index for active configs
CREATE INDEX IF NOT EXISTS idx_enterprise_license_active
  ON enterprise_license_config(is_active) WHERE is_active = true;
