-- Migration: Remove thresholds from notification_config
-- Date: 2026-05-19
-- Description: Thresholds are now managed in enterprise_license_config table

-- Update existing config to remove thresholds field
UPDATE notification_config
SET
  config_value = config_value - 'thresholds',
  updated_by = 'system-migration',
  updated_at = NOW()
WHERE config_key = 'main'
  AND config_value ? 'thresholds';

-- Verify the update
SELECT
  config_key,
  jsonb_pretty(config_value) as cleaned_config,
  updated_by,
  updated_at
FROM notification_config
WHERE config_key = 'main';
