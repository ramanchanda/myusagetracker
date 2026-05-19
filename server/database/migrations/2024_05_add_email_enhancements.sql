-- ============================================================================
-- Migration: Add Email Configuration Enhancements
-- Date: 2024-05-19
-- Description: Adds subject and SMTP configuration fields to email config
-- ============================================================================

-- This migration is safe to run multiple times (idempotent)

DO $$
BEGIN
  RAISE NOTICE 'Starting email configuration enhancements migration...';

  -- ========================================================================
  -- Step 1: Add subject field to emailConfig
  -- ========================================================================

  UPDATE notification_config
  SET config_value = jsonb_set(
    config_value,
    '{emailConfig,subject}',
    '""',
    true
  )
  WHERE config_value->'emailConfig' IS NOT NULL
    AND config_value->'emailConfig'->'subject' IS NULL;

  RAISE NOTICE '✓ Added subject field to emailConfig';

  -- ========================================================================
  -- Step 2: Add subjectPrefix field to emailConfig (if missing)
  -- ========================================================================

  UPDATE notification_config
  SET config_value = jsonb_set(
    config_value,
    '{emailConfig,subjectPrefix}',
    '"Heroku Usage Monitor"',
    true
  )
  WHERE config_value->'emailConfig' IS NOT NULL
    AND config_value->'emailConfig'->'subjectPrefix' IS NULL;

  RAISE NOTICE '✓ Added subjectPrefix field to emailConfig';

  -- ========================================================================
  -- Step 3: Add SMTP configuration to emailConfig
  -- ========================================================================

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

  RAISE NOTICE '✓ Added SMTP configuration to emailConfig';

  -- ========================================================================
  -- Step 4: Verify migration
  -- ========================================================================

  DECLARE
    config_count INTEGER;
    subject_count INTEGER;
    smtp_count INTEGER;
  BEGIN
    SELECT COUNT(*) INTO config_count
    FROM notification_config
    WHERE config_value->'emailConfig' IS NOT NULL;

    SELECT COUNT(*) INTO subject_count
    FROM notification_config
    WHERE config_value->'emailConfig'->'subject' IS NOT NULL;

    SELECT COUNT(*) INTO smtp_count
    FROM notification_config
    WHERE config_value->'emailConfig'->'smtpConfig' IS NOT NULL;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Migration completed successfully!';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Total email configs: %', config_count;
    RAISE NOTICE 'Configs with subject field: %', subject_count;
    RAISE NOTICE 'Configs with SMTP settings: %', smtp_count;
    RAISE NOTICE '================================================';
  END;

END $$;
