-- Migration: Add SMTP configuration to emailConfig in notification_config
-- This updates existing configurations to include SMTP fallback settings

DO $$
BEGIN
  -- Update existing notification_config records to add smtpConfig if missing
  UPDATE notification_config
  SET config_value = jsonb_set(
    config_value,
    '{emailConfig,smtpConfig}',
    '{
      "enabled": false,
      "host": "",
      "port": 587,
      "user": "",
      "password": "",
      "secure": false
    }'::jsonb,
    true
  )
  WHERE config_value->'emailConfig' IS NOT NULL
    AND config_value->'emailConfig'->'smtpConfig' IS NULL;

  RAISE NOTICE 'Added SMTP configuration to emailConfig';
END $$;
