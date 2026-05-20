-- Migration: Add subject field to emailConfig in notification_config
-- This updates existing configurations to include the new subject field

DO $$
BEGIN
  -- Update existing notification_config records to add subject field if missing
  UPDATE notification_config
  SET config_value = jsonb_set(
    config_value,
    '{emailConfig,subject}',
    '""',
    true
  )
  WHERE config_value->'emailConfig' IS NOT NULL
    AND config_value->'emailConfig'->'subject' IS NULL;

  -- Also add subjectPrefix if missing (for very old configs)
  UPDATE notification_config
  SET config_value = jsonb_set(
    config_value,
    '{emailConfig,subjectPrefix}',
    '"Heroku Usage Monitor"',
    true
  )
  WHERE config_value->'emailConfig' IS NOT NULL
    AND config_value->'emailConfig'->'subjectPrefix' IS NULL;

  RAISE NOTICE 'Added subject and subjectPrefix fields to emailConfig';
END $$;
