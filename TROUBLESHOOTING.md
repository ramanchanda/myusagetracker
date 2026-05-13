# Troubleshooting Guide

## 403 Forbidden Error - Enterprise APIs

If you're seeing "Failed to fetch enterprise structure: Request failed with status code 403", here's how to fix it:

### Possible Causes

1. **API Key Missing or Invalid**
2. **Account Doesn't Have Enterprise Access**
3. **API Key Doesn't Have Required Permissions**
4. **Wrong Enterprise Account ID**

## Solution Steps

### Step 1: Verify API Key is Set

```bash
heroku config:get HEROKU_API_KEY --app herokuusagetracker
```

If empty or shows placeholder, set it:

```bash
heroku config:set HEROKU_API_KEY=$(heroku auth:token) --app herokuusagetracker
```

### Step 2: Check Enterprise Account Access

Test if your account has enterprise access:

```bash
curl -n https://api.heroku.com/enterprise-accounts \
  -H "Accept: application/vnd.heroku+json; version=3" \
  -H "Authorization: Bearer $(heroku auth:token)"
```

**Expected Response:**
```json
[
  {
    "id": "xxx-xxx-xxx",
    "name": "Your Enterprise Account",
    ...
  }
]
```

**If Empty Array `[]`:**
Your account doesn't have enterprise account access. You need:
- Enterprise account subscription
- Admin/member access to enterprise account

### Step 3: Verify API Permissions

The API key needs these permissions:
- Read access to `/enterprise-accounts`
- Read access to `/enterprise-accounts/{id}/usage/monthly`
- Read access to `/enterprise-accounts/{id}/daily-usage`
- Read access to `/teams`
- Read access to `/teams/{id}/monthly-usage`

### Step 4: Set Enterprise Account ID (Optional)

If you have multiple enterprise accounts, specify which one:

```bash
heroku config:set ENTERPRISE_ACCOUNT_ID_OR_NAME="your-enterprise-account-id" --app herokuusagetracker
```

### Step 5: Test API Access

Test the enterprise usage endpoint directly:

```bash
# Get your enterprise account ID first
ENTERPRISE_ID=$(curl -sn https://api.heroku.com/enterprise-accounts \
  -H "Accept: application/vnd.heroku+json; version=3" \
  -H "Authorization: Bearer $(heroku auth:token)" | jq -r '.[0].id')

# Test monthly usage endpoint
curl -n "https://api.heroku.com/enterprise-accounts/$ENTERPRISE_ID/usage/monthly?start=2026-05&end=2026-05" \
  -H "Accept: application/vnd.heroku+json; version=3" \
  -H "Authorization: Bearer $(heroku auth:token)"
```

## Alternative: Use Team-Level APIs (No Enterprise Required)

If you don't have enterprise account access, you can use team-level APIs instead:

### Modify `enterpriseUsageService.js`

Change the `getEnterpriseStructure` function to work with regular teams:

```javascript
async function getEnterpriseStructure(month) {
  const client = createHerokuClient();
  const targetMonth = month || getCurrentMonth();

  try {
    const account = await getAccountInfo(client);
    
    // Skip enterprise account lookup
    const structure = {
      account: {
        email: account.email,
        name: account.name,
        id: account.id
      },
      teams: [],
      summary: {
        totalTeams: 0,
        totalApps: 0,
        totalDynos: 0,
        totalDataAddons: 0,
        totalOtherAddons: 0,
        totalMonthlyCost: 0
      }
    };

    // Get all teams directly
    const teams = await getTeams(client);
    
    // Continue with team-level usage APIs...
    // (rest of the code remains the same)
```

## Checking Heroku Config

View all environment variables:

```bash
heroku config --app herokuusagetracker
```

Required variables:
- `HEROKU_API_KEY` - Your Heroku API token
- `ENTERPRISE_ACCOUNT_ID_OR_NAME` (optional) - Specific enterprise account

## Common Issues

### Issue: "HEROKU_API_KEY is not configured"

**Solution:**
```bash
heroku config:set HEROKU_API_KEY=$(heroku auth:token) --app herokuusagetracker
```

### Issue: "No enterprise account found"

**Solutions:**
1. You don't have enterprise access - use team-level APIs instead
2. Set specific enterprise account ID if you have multiple
3. Check account permissions with Heroku support

### Issue: 401 Unauthorized

**Solution:**
API key expired or invalid. Generate new token:
```bash
heroku auth:token
# Copy token and set it
heroku config:set HEROKU_API_KEY=<new-token> --app herokuusagetracker
```

### Issue: 403 Forbidden (Even with Valid Key)

**Solutions:**
1. Account doesn't have enterprise subscription
2. API key user doesn't have admin access
3. Enterprise account is suspended/inactive

**Check your Heroku plan:**
```bash
heroku info --app herokuusagetracker
```

### Issue: Rate Limiting (429 Too Many Requests)

**Solution:**
The app makes multiple API calls. If you hit rate limits:
1. Increase refresh interval (currently 5 minutes)
2. Implement caching
3. Upgrade to higher rate limit tier

## Alternative Setup: Personal/Team Apps Only

If you don't need enterprise features, simplify to just teams:

1. **Remove enterprise endpoints** from `server/index.js`
2. **Use team-level APIs** directly
3. **Modify frontend** to not expect enterprise data

## Testing API Access Locally

Create a test script:

```javascript
// test-api.js
const axios = require('axios');

const apiKey = process.env.HEROKU_API_KEY;
const client = axios.create({
  baseURL: 'https://api.heroku.com',
  headers: {
    'Accept': 'application/vnd.heroku+json; version=3',
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
});

async function test() {
  try {
    // Test 1: Account access
    const account = await client.get('/account');
    console.log('✅ Account:', account.data.email);

    // Test 2: Enterprise accounts
    const enterprises = await client.get('/enterprise-accounts');
    console.log('✅ Enterprise accounts:', enterprises.data.length);

    if (enterprises.data.length > 0) {
      const entId = enterprises.data[0].id;
      console.log('Enterprise ID:', entId);

      // Test 3: Enterprise usage
      const usage = await client.get(`/enterprise-accounts/${entId}/usage/monthly`, {
        params: { start: '2026-05', end: '2026-05' }
      });
      console.log('✅ Enterprise usage:', usage.data);
    }

    // Test 4: Teams
    const teams = await client.get('/teams');
    console.log('✅ Teams:', teams.data.length);

  } catch (error) {
    console.error('❌ Error:', error.response?.status, error.message);
  }
}

test();
```

Run it:
```bash
node test-api.js
```

## Contact Support

If none of these work, contact Heroku support:
- https://help.heroku.com/
- Include: API error, your account email, enterprise account name

## Quick Fix for Demo

To get the app working quickly without enterprise features:

1. **Disable enterprise endpoints** temporarily
2. **Use mock data** for demo purposes
3. **Switch to team-level APIs** only

## Logs for Debugging

Check Heroku logs:
```bash
heroku logs --tail --app herokuusagetracker
```

Look for:
- API key validation errors
- 403/401 responses
- Enterprise account lookup failures

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `HEROKU_API_KEY` | Yes | Your Heroku API token |
| `ENTERPRISE_ACCOUNT_ID_OR_NAME` | No | Specific enterprise account (if multiple) |
| `NODE_ENV` | Yes | Set to `production` on Heroku |
| `PORT` | Auto | Heroku sets this automatically |

## Next Steps

1. Run through Step 1-5 above
2. Check the logs for specific errors
3. Test API access with curl commands
4. If no enterprise access, switch to team-level implementation
5. Contact support if needed

## Still Having Issues?

Share these details:
- Error message from logs
- Output of enterprise accounts API test
- Your Heroku account type (free/hobby/professional/enterprise)
- Whether you have enterprise subscription
