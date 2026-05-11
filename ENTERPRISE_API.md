# Enterprise API Usage

This application now uses Heroku's **Enterprise Account Monthly Usage APIs** for accurate billing data instead of estimating costs from hourly rates.

## APIs Used

### 1. Enterprise Account Monthly Usage APIs

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

### 2. Enterprise Account Daily Usage APIs

#### Get Enterprise Account Daily Usage
```
GET /enterprise-accounts/{enterprise-account-id}/daily-usage?start={YYYY-MM-DD}&end={YYYY-MM-DD}
```
Returns day-by-day cost breakdown for entire enterprise account, including:
- Daily costs for each day in range
- Cost breakdown by resource type (dyno, addon)
- Usage metrics per day
- Allows tracking cost trends over time

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

### 3. Team Usage APIs

#### Get Team Monthly Usage
```
GET /teams/{team-id}/monthly-usage/{year}/{month}
```
Returns monthly usage for a specific team.

#### Get Team Daily Usage
```
GET /teams/{team-id}/daily-usage?start={YYYY-MM-DD}&end={YYYY-MM-DD}
```
Returns day-by-day usage for a specific team.

### 4. App Usage APIs

#### Get App Monthly Usage
```
GET /apps/{app-id}/monthly-usage/{year}/{month}
```
Returns monthly usage for a specific app (used for personal apps).

#### Get App Daily Usage
```
GET /apps/{app-id}/daily-usage?start={YYYY-MM-DD}&end={YYYY-MM-DD}
```
Returns day-by-day usage for a specific app.

**Response format (all usage APIs):**
```json
{
  "data": [
    {
      "date": "2025-05-10",
      "app_id": "uuid",
      "app_name": "string",
      "addon_id": "uuid",
      "addon_name": "string",
      "addon_service_name": "heroku-postgresql",
      "type": "dyno|addon",
      "cost": 12.34,
      "quantity": 24,
      "dyno_type": "web|worker",
      "unit": "dyno-hours|addon-hours"
    }
  ]
}
```

## Benefits of Enterprise APIs

### ✅ Accurate Costs
- Real billed amounts from Heroku's billing system
- No estimation or calculation needed
- Historical data is actual invoice data
- Day-by-day cost tracking for trends

### ✅ Better Performance
- Fewer API calls (3 calls vs 10+ calls per team)
- Aggregated data reduces client-side processing
- Built-in caching on Heroku's side

### ✅ Complete Data
- All billable items included
- Usage metrics (dyno-hours, addon-hours)
- Quantity information
- Daily granularity for detailed analysis

### ✅ Native Time Range Support
- Built-in monthly aggregation
- Daily breakdown with start/end dates
- Easy historical data access
- Consistent date ranges

### ✅ Cost Trend Analysis
- Daily cost visualization
- Identify cost spikes
- Compare weekday vs weekend usage
- Track cost changes over time

## Implementation

### Enterprise View
Uses `enterpriseUsageService.js` and `dailyUsageService.js`:
1. Calls `/enterprise-accounts` to find enterprise account
2. Calls `/enterprise-accounts/{id}/monthly-usage/{year}/{month}` for monthly overview
3. Calls `/enterprise-accounts/{id}/daily-usage?start=...&end=...` for daily breakdown
4. Calls `/teams/{team-id}/monthly-usage/{year}/{month}` for each team
5. Calls `/teams/{team-id}/daily-usage?start=...&end=...` for team daily trends
6. Fetches app details for resource information (dynos, addons)
7. Categorizes add-ons as data vs other

### Personal View
Uses `personalUsageService.js` and `dailyUsageService.js`:
1. Fetches personal apps (non-team apps)
2. Calls `/apps/{app-id}/monthly-usage/{year}/{month}` for monthly costs
3. Calls `/apps/{app-id}/daily-usage?start=...&end=...` for daily breakdown
4. Fetches app details for resource information
5. Categorizes and aggregates costs

### Daily Usage Service
The `dailyUsageService.js` provides:
- Day-by-day cost tracking across a date range
- Automatic date range calculation for selected month
- Aggregated daily costs by type (dyno, data addons, other addons)
- Summary statistics (total, average, max, min per day)
- Visual chart component for trend analysis

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
