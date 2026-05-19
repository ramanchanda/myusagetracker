-- Notification Configuration Table
-- Stores all notification settings including email config, thresholds, and schedules

CREATE TABLE IF NOT EXISTS notification_config (
  id SERIAL PRIMARY KEY,
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_notification_config_key ON notification_config(config_key);
CREATE INDEX IF NOT EXISTS idx_notification_config_updated_at ON notification_config(updated_at DESC);

-- Insert default configuration if not exists
-- Note: License thresholds are stored in enterprise_license_config table
INSERT INTO notification_config (config_key, config_value, updated_by)
VALUES (
  'main',
  '{
    "emailConfig": {
      "enabled": false,
      "provider": "mailgun",
      "recipients": [],
      "fromName": "Heroku Usage Monitor",
      "fromEmail": "",
      "subjectPrefix": "Heroku Usage Monitor",
      "subject": "",
      "smtpConfig": {
        "enabled": false,
        "host": "",
        "port": 587,
        "user": "",
        "password": "",
        "secure": false
      }
    },
    "triggerSchedule": {
      "dailySummary": {
        "enabled": false,
        "time": "09:00",
        "timezone": "UTC"
      },
      "weeklySummary": {
        "enabled": false,
        "dayOfWeek": "Monday",
        "time": "09:00",
        "timezone": "UTC"
      },
      "monthlySummary": {
        "enabled": false,
        "dayOfMonth": 1,
        "time": "09:00",
        "timezone": "UTC"
      },
      "realtimeAlerts": {
        "enabled": true,
        "checkIntervalMinutes": 60
      }
    },
    "cooldownPeriod": {
      "enabled": true,
      "durationMinutes": 60
    }
  }'::jsonb,
  'system'
)
ON CONFLICT (config_key) DO NOTHING;

-- Comments
COMMENT ON TABLE notification_config IS 'Stores notification system configuration including email settings, thresholds, and schedules';
COMMENT ON COLUMN notification_config.config_key IS 'Unique key for configuration (e.g., "main")';
COMMENT ON COLUMN notification_config.config_value IS 'Full configuration as JSONB for flexibility';
COMMENT ON COLUMN notification_config.updated_by IS 'Username or email of person who last updated the config';
