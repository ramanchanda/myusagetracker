# API Endpoint Fix for 403 Error

## Issue
Getting 403 Forbidden error when calling enterprise usage endpoints.

## Root Cause
The enterprise monthly usage endpoint was incorrect:

**Wrong:** `/enterprise-accounts/{id}/usage/monthly?start=YYYY-MM&end=YYYY-MM`  
**Correct:** `/enterprise-accounts/{id}/monthly-usage/{year}/{month}`

## Fix Applied

### Changed in `enterpriseUsageService.js`

```javascript
// BEFORE (Incorrect)
async function getEnterpriseMonthlyUsage(client, enterpriseAccountId, month) {
  const response = await client.get(
    `/enterprise-accounts/${enterpriseAccountId}/usage/monthly`,
    { params: { start: month, end: month } }
  );
}

// AFTER (Correct)
async function getEnterpriseMonthlyUsage(client, enterpriseAccountId, month) {
  const [year, monthNum] = month.split('-');
  const response = await client.get(
    `/enterprise-accounts/${enterpriseAccountId}/monthly-usage/${year}/${monthNum}`
  );
}
```

## Heroku API Reference

According to the official documentation:
https://devcenter.heroku.com/articles/platform-api-reference#enterprise-account-monthly-usage

### Enterprise Account Monthly Usage
```
GET /enterprise-accounts/{enterprise-account-id}/monthly-usage/{year}/{month}
```

**Path Parameters:**
- `enterprise-account-id` - UUID or name of enterprise account
- `year` - 4-digit year (e.g., "2026")
- `month` - 2-digit month (e.g., "05" for May)

**Response:**
```json
{
  "addons": 123.45,
  "data": 678.90,
  "dynos": 234.56,
  "partner": 0,
  "space": 0,
  "teams": [
    {
      "id": "team-uuid",
      "name": "team-name",
      "addons": 50.00,
      "data": 30.00,
      "dynos": 20.00,
      "apps": [...]
    }
  ]
}
```

### Enterprise Account Daily Usage
```
GET /enterprise-accounts/{enterprise-account-id}/daily-usage?start=YYYY-MM-DD&end=YYYY-MM-DD
```

**Query Parameters:**
- `start` - Start date (YYYY-MM-DD)
- `end` - End date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "date": "2026-05-01",
    "addons": 12.34,
    "data": 6.78,
    "dynos": 23.45,
    "teams": [...]
  }
]
```

## Additional Checks

If 403 error persists after this fix, check:

### 1. API Key Permissions
Ensure your API key has access to enterprise endpoints:
```bash
curl -n https://api.heroku.com/enterprise-accounts \
  -H "Accept: application/vnd.heroku+json; version=3"
```

### 2. Enterprise Account Access
Your Heroku account must be:
- Part of an enterprise account
- Have admin or member role
- Enterprise account must be active

### 3. API Version
Ensure you're using API version 3:
```
Accept: application/vnd.heroku+json; version=3
```

### 4. Account Type
Check your account type:
```bash
heroku info --app herokuusagetracker
```

Required: Enterprise or Teams subscription

## Testing the Fix

After deploying, test with:

```bash
# Get enterprise account ID
ENTERPRISE_ID=$(curl -sn https://api.heroku.com/enterprise-accounts \
  -H "Accept: application/vnd.heroku+json; version=3" | jq -r '.[0].id')

# Test monthly usage (correct endpoint)
curl -n "https://api.heroku.com/enterprise-accounts/$ENTERPRISE_ID/monthly-usage/2026/05" \
  -H "Accept: application/vnd.heroku+json; version=3"

# Test daily usage
curl -n "https://api.heroku.com/enterprise-accounts/$ENTERPRISE_ID/daily-usage?start=2026-05-01&end=2026-05-31" \
  -H "Accept: application/vnd.heroku+json; version=3"
```

## Deployment

```bash
git add .
git commit -m "Fix enterprise API endpoint path"
git push heroku main
```

## Expected Behavior After Fix

✅ Enterprise structure loads successfully  
✅ Monthly usage data displays correctly  
✅ Daily usage chart renders  
✅ Team costs show real data  
✅ No more 403 errors

## If Still Getting 403

The issue is likely permissions, not the endpoint. You need:

1. **Enterprise Subscription** - Not just Teams
2. **Admin Access** - To enterprise account
3. **Active Account** - Not suspended/trial expired

Contact Heroku support if you have enterprise subscription but still get 403.

## Alternative: Fallback to Team APIs

If you don't have enterprise access, modify `getEnterpriseStructure()`:

```javascript
async function getEnterpriseStructure(month) {
  const client = createHerokuClient();
  
  try {
    // Skip enterprise account lookup
    const account = await getAccountInfo(client);
    const teams = await getTeams(client);
    
    // Use team-level monthly usage APIs
    for (const team of teams) {
      const [year, monthNum] = month.split('-');
      const teamUsage = await client.get(
        `/teams/${team.id}/monthly-usage/${year}/${monthNum}`
      );
      // Process team usage...
    }
  }
}
```

Team-level APIs work without enterprise subscription.
