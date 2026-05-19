# Database Migration Guide

## Overview

This guide explains the database changes needed for the new email configuration features:
1. **Email Subject Field** - Add custom subject line to emails
2. **SMTP Configuration in GUI** - Configure SMTP fallback without config vars

---

## ⚠️ Important: Migration Required

**For existing Heroku deployments**, you MUST run migrations to add the new fields to your database.

**For new deployments**, the schema includes everything automatically - no migration needed!

---

## Quick Start: Run Migrations

### Option 1: Using npm script (Recommended)

```bash
# Local development
npm run migrate

# On Heroku (one-liner)
heroku run npm run migrate -a your-app-name
```

### Option 2: Using Heroku Postgres CLI

```bash
# Connect to your Heroku database
heroku pg:psql -a your-app-name

# Then paste the migration SQL
\i server/database/migrations/2024_05_add_email_enhancements.sql

# Or copy-paste the SQL content directly
```

### Option 3: Direct SQL file execution

```bash
# If you have the database URL
psql $DATABASE_URL < server/database/migrations/2024_05_add_email_enhancements.sql

# On Heroku
heroku pg:psql -a your-app-name < server/database/migrations/2024_05_add_email_enhancements.sql
```

---

## What Gets Changed?

The migration adds three new fields to your `notification_config` table's JSONB data:

### 1. Subject Field
```json
{
  "emailConfig": {
    "subject": ""  // NEW - custom email subject
  }
}
```

### 2. Subject Prefix Field (if missing)
```json
{
  "emailConfig": {
    "subjectPrefix": "Heroku Usage Monitor"  // ADDED if missing
  }
}
```

### 3. SMTP Configuration
```json
{
  "emailConfig": {
    "smtpConfig": {  // NEW - SMTP fallback settings
      "enabled": false,
      "host": "",
      "port": 587,
      "user": "",
      "password": "",
      "secure": false
    }
  }
}
```

---

## Migration Safety

✅ **Safe to run multiple times** - The migration is idempotent  
✅ **No data loss** - Only adds new fields, doesn't remove anything  
✅ **No downtime required** - Can run while app is running  
✅ **Backward compatible** - Old code continues working during deployment  

---

## Verification

After running the migration, verify it worked:

### Check via psql
```sql
-- Connect to database
heroku pg:psql -a your-app-name

-- Check the structure
SELECT 
  config_key,
  config_value->'emailConfig'->>'subject' as subject,
  config_value->'emailConfig'->>'subjectPrefix' as subject_prefix,
  config_value->'emailConfig'->'smtpConfig'->>'enabled' as smtp_enabled
FROM notification_config 
WHERE config_key = 'main';
```

**Expected output:**
- `subject`: Empty string `""`
- `subject_prefix`: `"Heroku Usage Monitor"`
- `smtp_enabled`: `"false"`

### Check via UI (after deployment)
1. Login as admin
2. Go to **Notification Settings → Email Setup**
3. Click **Edit Configuration**
4. You should see:
   - ✅ "Email Subject" field
   - ✅ "SMTP Fallback Configuration" section

---

## Deployment Workflow

### For existing Heroku app:

```bash
# 1. Deploy the code changes
git add .
git commit -m "Add email subject and SMTP configuration features"
git push heroku main

# 2. Wait for deployment to complete

# 3. Run migrations
heroku run npm run migrate -a your-app-name

# 4. Restart dynos (optional, but recommended)
heroku restart -a your-app-name

# 5. Verify in UI
# Login → Notification Settings → Email Setup
```

### For new Heroku app:

```bash
# 1. Create app and provision database
heroku create your-app-name
heroku addons:create heroku-postgresql:mini -a your-app-name

# 2. Set environment variables
heroku config:set APP_ADMIN_USERNAME=admin -a your-app-name
heroku config:set APP_ADMIN_PASSWORD=yourpassword -a your-app-name
# ... (other config vars)

# 3. Deploy
git push heroku main

# 4. Schema auto-initializes on first startup - no migration needed!
```

---

## Troubleshooting

### "relation 'notification_config' does not exist"

**Problem**: The base table hasn't been created yet.

**Solution**: 
```bash
# Let the app start once to create the table
heroku restart -a your-app-name

# Wait 30 seconds, then run migration
heroku run npm run migrate -a your-app-name
```

### "ERROR: invalid input syntax for type json"

**Problem**: Malformed JSON in the migration.

**Solution**: This shouldn't happen with our migration, but if it does:
```bash
# Check your config_value is valid JSONB
SELECT config_key, config_value FROM notification_config;
```

### Migration completes but UI doesn't show new fields

**Problem**: Browser cache or React state issue.

**Solution**:
1. Hard refresh: `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. Clear browser cache
3. Check browser console for errors

---

## Migration Files

All migration files are in: `server/database/migrations/`

- ✅ `2024_05_add_email_enhancements.sql` - **Main migration (run this one)**
- `add_subject_field_to_email_config.sql` - Legacy (included in main)
- `add_smtp_config_to_email_config.sql` - Legacy (included in main)

**Recommendation**: Use the consolidated `2024_05_add_email_enhancements.sql` file.

---

## Rollback (if needed)

To remove the new fields (not recommended, but possible):

```sql
-- Remove subject field
UPDATE notification_config
SET config_value = config_value #- '{emailConfig,subject}'
WHERE config_value->'emailConfig'->'subject' IS NOT NULL;

-- Remove SMTP config
UPDATE notification_config
SET config_value = config_value #- '{emailConfig,smtpConfig}'
WHERE config_value->'emailConfig'->'smtpConfig' IS NOT NULL;
```

---

## Support

If you encounter issues:

1. Check Heroku logs: `heroku logs --tail -a your-app-name`
2. Verify database connection: `heroku pg:info -a your-app-name`
3. Check migration output for errors
4. Ensure you're running the latest code version

---

## Summary Checklist

Before deployment:
- [ ] Review migration SQL
- [ ] Backup database (if critical data)
- [ ] Test migration locally first

After deployment:
- [ ] Run `npm run migrate` on Heroku
- [ ] Verify fields exist in database
- [ ] Test UI - can you see new fields?
- [ ] Test email sending with new subject
- [ ] Test SMTP configuration (if using)

**Status**: ✅ Ready for production deployment
