# Enterprise API Usage

This application now uses Heroku's **Enterprise Account Monthly Usage APIs** for accurate billing data instead of estimating costs from hourly rates.

## APIs Used

### 1. Enterprise Account APIs

#### Get Enterprise Accounts
```
GET /enterprise-accounts
```
Lists all enterprise accounts the user has access to.

#### Get Enterprise Account Monthly Usage
```
GET /enterprise-accounts/{enterprise-account-id}/monthly-usage/{year}/{month}
```
Returns aggregated monthly usage for entire enterprise account, including:
- Total cost
- Usage breakdown by teams
- Usage breakdown by apps
- All billable items (dynos, add-ons, etc.)

**Response format:**
```json
{
  "data": [
    {
      "app_id": "uuid",
      "app_name": "string",
      "addon_id": "uuid",
      "addon_name": "string",
      "type": "dyno|addon",
      "cost": 123.45,
      "quantity": 1,
      "dyno_type": "web|worker",
      "unit": "dyno-hours|addon-hours"
    }
  ]
}
```

### 2. Team Monthly Usage API

#### Get Team Monthly Usage
```
GET /teams/{team-id}/monthly-usage/{year}/{month}
```
Returns monthly usage for a specific team, including:
- All apps in the team
- Dyno usage and costs
- Add-on usage and costs
- Breakdown by resource type

**Response format:** Same as enterprise account usage

### 3. App Monthly Usage API

#### Get App Monthly Usage
```
GET /apps/{app-id}/monthly-usage/{year}/{month}
```
Returns monthly usage for a specific app (used for personal apps), including:
- Dyno costs by type
- Add-on costs
- Actual billed amounts

**Response format:** Same structure as above

## Benefits of Enterprise APIs

### ✅ Accurate Costs
- Real billed amounts from Heroku's billing system
- No estimation or calculation needed
- Historical data is actual invoice data

### ✅ Better Performance
- Fewer API calls (3 calls vs 10+ calls per team)
- Aggregated data reduces client-side processing
- Built-in caching on Heroku's side

### ✅ Complete Data
- All billable items included
- Usage metrics (dyno-hours, addon-hours)
- Quantity information

### ✅ Native Month Support
- Built-in monthly aggregation
- Easy historical data access
- Consistent date ranges

## Implementation

### Enterprise View
Uses `enterpriseUsageService.js`:
1. Calls `/enterprise-accounts` to find enterprise account
2. Calls `/enterprise-accounts/{id}/monthly-usage/{year}/{month}` for overview
3. Calls `/teams/{team-id}/monthly-usage/{year}/{month}` for each team
4. Fetches app details for resource information (dynos, addons)
5. Categorizes add-ons as data vs other

### Personal View
Uses `personalUsageService.js`:
1. Fetches personal apps (non-team apps)
2. Calls `/apps/{app-id}/monthly-usage/{year}/{month}` for each app
3. Fetches app details for resource information
4. Categorizes and aggregates costs

## Data Structure

### Cost Items
Each usage item includes:
- `type`: "dyno" or "addon"
- `cost`: Actual billed amount in dollars
- `quantity`: Number of units consumed
- `app_id` / `app_name`: Associated application
- `addon_id` / `addon_name`: For add-ons
- `dyno_type`: For dynos (web, worker, etc.)

### Aggregation
- Team level: Sum of all app costs in team
- Enterprise level: Sum of all team costs
- Personal level: Sum of all personal app costs

## Month Parameter

Format: `YYYY-MM` (e.g., "2025-05")

The APIs accept:
- Year: 4-digit year
- Month: 2-digit month (01-12)

Current month is used if not specified.

## Error Handling

The service handles:
- Missing enterprise account (falls back to regular account)
- 404 errors for months without data
- Permission errors (401/403)
- Rate limiting (429)

## API Documentation

Full API reference:
https://devcenter.heroku.com/articles/platform-api-reference#enterprise-account-monthly-usage

Related endpoints:
- Enterprise Account: https://devcenter.heroku.com/articles/platform-api-reference#enterprise-account
- Team: https://devcenter.heroku.com/articles/platform-api-reference#team
- App: https://devcenter.heroku.com/articles/platform-api-reference#app

## Migration Notes

### Old Approach
- Fetched dyno formations and calculated: `hourly_rate × 730`
- Fetched add-on plans and estimated monthly cost
- Required invoice parsing for historical data
- Many API calls per team/app

### New Approach
- Single API call per team/app for actual costs
- No estimation or calculation needed
- Built-in historical data support
- Accurate billing amounts

### Fallback
If Monthly Usage APIs return empty data:
- Shows configured resources (dynos, add-ons)
- Displays counts but cost = $0
- Happens for very new apps or current partial months
