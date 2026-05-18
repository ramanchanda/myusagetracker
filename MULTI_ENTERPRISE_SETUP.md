# Multi-Enterprise License Management Setup Guide

## Overview

The application now supports **role-based authentication** and **per-Enterprise Account license management** with database-backed configuration.

---

## PHASE 1: Role-Based Authentication

### Required Heroku Config Vars

Set these environment variables:

```bash
# Admin User (full access - can edit licenses)
heroku config:set APP_ADMIN_USERNAME=admin
heroku config:set APP_ADMIN_PASSWORD=your_secure_admin_password

# General User (read-only access)
heroku config:set APP_GENERAL_USERNAME=viewer
heroku config:set APP_GENERAL_PASSWORD=your_secure_viewer_password

# Session Secret
heroku config:set APP_SESSION_SECRET=$(openssl rand -base64 32)
```

### User Roles

**Admin Role:**
- Full dashboard access
- Edit enterprise license configurations
- Save license changes to database
- Manage thresholds and monitoring settings

**General Role:**
- Read-only dashboard access
- View all reports and dashboards
- View license configurations
- Cannot edit or save configurations

---

## PHASE 2: Database-Backed License Management

### Automatic Schema Initialization

The `enterprise_license_config` table is **automatically created** on application startup if `DATABASE_URL` is configured.

### Table Structure

```sql
enterprise_license_config:
  - account_id (unique) - Enterprise Account identifier
  - account_name - Display name
  - dyno_units_limit - Licensed dyno capacity
  - connect_rows_limit - Licensed Connect rows
  - data_addons_limit - Data add-ons capacity
  - general_addons_limit - General add-ons capacity
  - private_spaces_limit - Private Spaces count
  - shield_spaces_limit - Shield Spaces count
  - warning_percentage - Warning threshold (default 80%)
  - critical_percentage - Critical threshold (default 95%)
  - updated_by - Username who last updated
  - updated_at - Last update timestamp
```

### Backward Compatibility

The system **falls back to environment variables** if no database config exists:

```bash
# Legacy env var support (optional fallback)
LICENSE_DYNO_UNITS_LIMIT=1000
LICENSE_CONNECT_ROWS_LIMIT=500000
LICENSE_DATA_ADDONS_LIMIT=50
LICENSE_GENERAL_ADDONS_LIMIT=20
LICENSE_PRIVATE_SPACES_LIMIT=5
LICENSE_SHIELD_SPACES_LIMIT=2
```

**Recommended:** Use database configuration instead of env vars for per-EA management.

---

## PHASE 3-8: Using the License Management UI

### Accessing the UI

1. Navigate to: **`/notifications > Licenses` tab**
2. Login with admin or general credentials
3. View all Enterprise Accounts with their license configs

### UI Features

**For All Users:**
- View all Enterprise Accounts
- See current license capacities
- View monitoring thresholds
- Check account status (LICENSE OK, WARNING, CRITICAL, OVERAGE)

**Admin Users Only:**
- Click **Edit** button on any Enterprise Account
- Modify license limits for all 6 resource types
- Update warning/critical thresholds
- Click **Save** to persist to database
- Click **Cancel** to discard changes

### License Cards

Each Enterprise Account displays:

1. **Dyno Units** ⚙️ - Dyno capacity
2. **Connect Rows** 🔗 - Heroku Connect capacity
3. **Data Add-ons** 💾 - Data service add-ons
4. **General Add-ons** 🔌 - Other add-ons
5. **Private Spaces** 🔒 - Private Spaces count
6. **Shield Spaces** 🛡️ - Shield Spaces count

Plus monitoring thresholds:
- Warning Threshold (default 80%)
- Critical Threshold (default 95%)

---

## API Endpoints

### Authentication

```
POST /api/auth/login
  Body: { username, password }
  Returns: { success: true, role: 'admin' | 'general' }

GET /api/auth/user
  Returns: { username, role }

POST /api/auth/logout
  Destroys session
```

### License Management

```
GET /api/licenses/enterprise
  Returns: Array of all EA license configs

GET /api/licenses/enterprise/:accountId
  Returns: License config for specific EA

PUT /api/licenses/enterprise/:accountId (Admin only)
  Body: { dyno_units_limit, connect_rows_limit, ... }
  Updates license config

POST /api/licenses/enterprise/bulk (Admin only)
  Body: { configs: [...] }
  Bulk update multiple EAs
```

---

## Status Badges

Accounts display real-time status:

- **LICENSE OK** (Green) - All resources under warning threshold
- **WARNING** (Yellow) - One or more resources ≥80% utilization
- **CRITICAL** (Red) - One or more resources ≥95% utilization
- **OVERAGE** (Dark Red) - One or more resources >100% capacity
- **RESTRICTED** (Gray) - Billing access restricted

---

## Architecture Benefits

### Scalability
- Independent license limits per Enterprise Account
- Database-backed (no redeploys needed)
- Supports unlimited Enterprise Accounts

### Security
- Role-based access control
- Admin-only write operations
- Audit trail (updated_by, updated_at)
- Session-based authentication

### Flexibility
- Per-EA threshold configuration
- Easy to add new resource types
- Extensible for future features (history, approval workflows, forecasting)

---

## Future Enhancements (Architecture Ready)

The system is structured to support:

- License change history tracking
- Approval workflows for license changes
- Contract renewal date tracking
- Usage forecasting
- Email alerts for license changes
- Bulk import/export configurations
- Per-EA ownership and roles

---

## Troubleshooting

### "Admin access required" error
- You're logged in as a general user
- Logout and login with admin credentials

### License configs not persisting
- Check `DATABASE_URL` is configured
- Verify PostgreSQL connection is healthy
- Check Heroku logs for schema initialization

### Config shows "ENV FALLBACK"
- Database config doesn't exist yet
- System is using environment variable fallback
- Login as admin and save config to migrate to database

### Authentication not working
- Verify all 4 config vars are set (admin/general user/pass)
- Check `APP_SESSION_SECRET` is configured
- Restart dyno after setting config vars

---

## Migration from Old System

### Step 1: Set New Config Vars
Set the 4 new auth config vars (admin/general credentials)

### Step 2: First Admin Login
Login with admin credentials

### Step 3: Configure Each EA
Navigate to Licenses tab, edit each Enterprise Account, save

### Step 4: Verify Database
Old env var configs automatically fall back until you save to database

### Step 5: Remove Old Vars (Optional)
After all EAs configured in database, old `LICENSE_*` env vars can be removed

---

## Production Checklist

- [ ] Set `APP_ADMIN_USERNAME` and `APP_ADMIN_PASSWORD`
- [ ] Set `APP_GENERAL_USERNAME` and `APP_GENERAL_PASSWORD`
- [ ] Set `APP_SESSION_SECRET` (use `openssl rand -base64 32`)
- [ ] Verify `DATABASE_URL` is configured
- [ ] Login as admin and configure all Enterprise Accounts
- [ ] Test general user has read-only access
- [ ] Test session timeout (8 hours)
- [ ] Verify license status badges display correctly
- [ ] Test edit/save flow for at least one EA

---

## Support

For issues or questions:
- Check Heroku logs: `heroku logs --tail`
- Verify config vars: `heroku config`
- Check database connectivity: Navigate to `/api/health`
