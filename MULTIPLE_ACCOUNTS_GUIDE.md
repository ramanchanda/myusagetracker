# Multiple Enterprise Accounts & Billing Restrictions Guide

## Overview

The application now supports:
1. **Multiple Enterprise Accounts** - Handle scenarios where user has access to multiple enterprise accounts
2. **Billing Access Restrictions** - Gracefully handle when user doesn't have billing permissions for certain accounts
3. **Multiple Teams per Account** - Each enterprise account can have multiple teams

## Backend Changes

### New Functions in `enterpriseUsageService.js`

#### 1. `getAllEnterpriseAccounts(client)`
Fetches all enterprise accounts the user has access to.

```javascript
const accounts = await getAllEnterpriseAccounts(client);
// Returns: [{ id, name, identity_provider, ... }]
```

#### 2. `testBillingAccess(client, accountId, month)`
Tests if user has billing permissions for a specific account.

```javascript
const accessCheck = await testBillingAccess(client, accountId, month);
// Returns: {
//   hasAccess: true/false,
//   error: "Billing access restricted...",
//   status: 403/404/etc
// }
```

#### 3. `getAllEnterpriseAccountsStructure(month)`
Fetches usage data for ALL enterprise accounts.

```javascript
const allData = await getAllEnterpriseAccountsStructure('2026-05');
// Returns: {
//   account: { email, name, id },
//   enterpriseAccounts: [
//     {
//       enterpriseAccount: {
//         id, name, has_billing_access, billing_error
//       },
//       teams: [...],
//       summary: { totalCost, ... }
//     }
//   ],
//   summary: { overall aggregation }
// }
```

#### 4. `getEnterpriseStructure(month, enterpriseAccountId)`
Updated to support optional account filtering.

```javascript
// Get all accounts
const allData = await getEnterpriseStructure(month);

// Get specific account
const singleAccount = await getEnterpriseStructure(month, 'account-uuid');
```

## API Endpoints

### 1. List Enterprise Accounts
```
GET /api/enterprise/accounts
```

**Response:**
```json
[
  {
    "id": "uuid-1",
    "name": "Company A Enterprise",
    "identity_provider": {...}
  },
  {
    "id": "uuid-2",
    "name": "Company B Enterprise",
    "identity_provider": {...}
  }
]
```

### 2. Get All Accounts Structure
```
GET /api/enterprise/all-accounts?month=2026-05
```

**Response:**
```json
{
  "account": {
    "email": "user@example.com",
    "name": "User Name",
    "id": "user-uuid"
  },
  "enterpriseAccounts": [
    {
      "enterpriseAccount": {
        "id": "ent-uuid-1",
        "name": "Company A",
        "has_billing_access": true,
        "billing_error": null,
        "billing_status": null
      },
      "teams": [
        {
          "id": "team-1",
          "name": "Engineering",
          "type": "enterprise",
          "resources": {...}
        }
      ],
      "summary": {
        "totalTeams": 1,
        "totalMonthlyCost": "1500.00"
      }
    },
    {
      "enterpriseAccount": {
        "id": "ent-uuid-2",
        "name": "Company B",
        "has_billing_access": false,
        "billing_error": "Billing access restricted...",
        "billing_status": 403
      },
      "teams": [],
      "summary": {
        "error": "Billing access restricted"
      }
    }
  ],
  "summary": {
    "totalEnterpriseAccounts": 2,
    "accountsWithBillingAccess": 1,
    "accountsWithoutBillingAccess": 1,
    "totalTeams": 1,
    "totalMonthlyCost": "1500.00"
  }
}
```

### 3. Get Single Account Structure
```
GET /api/enterprise/structure?month=2026-05&accountId=uuid
```

**Response:**
```json
{
  "account": {...},
  "enterpriseAccount": {
    "id": "uuid",
    "name": "Company A",
    "has_billing_access": true
  },
  "teams": [...],
  "summary": {...}
}
```

## Frontend Components

### 1. EnterpriseAccountSelector
New component to switch between enterprise accounts.

**Features:**
- Dropdown to select specific account
- "View All Accounts" toggle button
- Shows count (e.g., "1 of 3")
- Auto-hides if only 1 account

**Props:**
```javascript
<EnterpriseAccountSelector
  accounts={accounts}
  selectedAccountId={selectedAccountId}
  onAccountChange={setSelectedAccountId}
  showAllAccounts={showAllAccounts}
  onShowAllToggle={setShowAllAccounts}
/>
```

### 2. Updated EnterpriseView
Now handles:
- Multiple accounts with selector
- Billing restrictions with warning banners
- Aggregated data when viewing all accounts
- Per-account data when viewing single account

## Billing Access Scenarios

### Scenario 1: Full Access
```
✅ User has billing access to all enterprise accounts
✅ All usage data displays normally
✅ No warnings shown
```

### Scenario 2: Partial Access
```
✅ User has billing access to Account A
⚠️  User lacks billing access to Account B
✅ Account A data displays normally
⚠️  Account B shows warning banner
📊 Overall summary includes only Account A
```

### Scenario 3: No Access
```
❌ User lacks billing access to all accounts
⚠️  Warning banner for each account
📊 Summary shows 0 teams, 0 cost
💡 Message: "Contact enterprise admin for billing access"
```

## Error Handling

### 403 Billing Restricted
```javascript
if (accessCheck.status === 403) {
  // User doesn't have billing permissions
  accountStructure.has_billing_access = false;
  accountStructure.billing_error = "Billing access restricted";
  // Continue to next account (don't throw)
}
```

### 404 No Data
```javascript
if (error.status === 404) {
  // No usage data for this month (OK)
  accountStructure.has_billing_access = true;
  // Return empty structure (don't throw)
}
```

### Other Errors
```javascript
// Log error but don't crash
console.error(`Error for ${accountName}:`, error.message);
accountStructure.summary.error = error.message;
// Continue processing other accounts
```

## UI Components

### Billing Restriction Warning
Shows when user lacks billing access:

```jsx
<div className="billing-restrictions-warning">
  <div className="warning-icon">⚠️</div>
  <div className="warning-content">
    <h3>Billing Access Restricted</h3>
    <p>
      You don't have billing permissions for 2 enterprise accounts:
    </p>
    <ul>
      <li>Company B - Billing access restricted. You may not have permissions...</li>
      <li>Company C - Billing access restricted. You may not have permissions...</li>
    </ul>
    <p className="warning-note">
      Contact your enterprise admin to grant billing access for these accounts.
    </p>
  </div>
</div>
```

### Account Selector (Multiple Accounts)
```
┌─────────────────────────────────────┐
│ 🏢 Enterprise Account:              │
│                                     │
│ [Company A ▼]  📊 View All Accounts│
│                     1 of 3          │
└─────────────────────────────────────┘
```

### Account Badge (Single Account)
```
┌──────────────────────────┐
│  🏢  Company A Enterprise │
└──────────────────────────┘
```

## Testing Scenarios

### Test 1: Single Account with Access
```bash
# Setup: User has 1 enterprise account with billing access
# Expected: Selector hidden, data displays normally
```

### Test 2: Multiple Accounts with Full Access
```bash
# Setup: User has 3 accounts, all with billing access
# Expected: Selector shows, can switch between accounts, "View All" works
```

### Test 3: Multiple Accounts with Partial Access
```bash
# Setup: User has 3 accounts, billing access to 2
# Expected: 
# - Warning for 1 account
# - Data for 2 accounts
# - Summary excludes restricted account
```

### Test 4: Multiple Accounts with No Access
```bash
# Setup: User has 2 accounts, no billing access
# Expected:
# - Warning for both accounts
# - No team/cost data
# - Message to contact admin
```

## Configuration

### Environment Variables

```bash
# Optional: Specify default enterprise account
ENTERPRISE_ACCOUNT_ID_OR_NAME=uuid-or-name

# If not set, uses first account from list
```

## Logs to Monitor

```
=== Processing Enterprise Account: Company A ===
Using enterprise account: Company A (uuid-123)
Fetching monthly usage: /enterprise-accounts/uuid-123/monthly-usage/2026/05
✅ Found 5 teams with usage data

=== Processing Enterprise Account: Company B ===
Using enterprise account: Company B (uuid-456)
⚠️  Billing access restricted for Company B
Status: 403
Error: Billing access restricted. You may not have permissions...
```

## Best Practices

### 1. Graceful Degradation
- Don't crash on billing restrictions
- Show what data is available
- Clearly indicate what's restricted

### 2. Clear Messaging
- Explain why data isn't available
- Provide actionable next steps
- Show who to contact

### 3. Performance
- Test billing access before fetching large datasets
- Cache account lists
- Aggregate efficiently

### 4. Security
- Never bypass billing restrictions
- Log access attempts
- Respect Heroku's permission model

## Troubleshooting

### Issue: User sees warning for their own enterprise account
**Cause:** User role doesn't include billing permissions  
**Solution:** Enterprise admin must grant billing viewer/admin role

### Issue: Some teams missing from account
**Cause:** Teams belong to different enterprise account  
**Solution:** Switch to "View All Accounts" mode

### Issue: "View All" shows 0 teams
**Cause:** No billing access to any account  
**Solution:** Contact all enterprise admins for access

### Issue: Can't select second account
**Cause:** Frontend state issue  
**Solution:** Check browser console, refresh page

## Future Enhancements

1. **Role-Based UI** - Show different views for admin vs viewer
2. **Access Request** - Button to request billing access
3. **Account Filtering** - Filter teams by account in "View All" mode
4. **Cost Comparison** - Compare costs across accounts
5. **Permissions Dashboard** - Show detailed permissions per account

## Summary

✅ **Multi-Account Support** - Handle 1 to N enterprise accounts  
✅ **Billing Restrictions** - Graceful handling of 403 errors  
✅ **Clear UI** - Selector, warnings, and indicators  
✅ **Robust Error Handling** - Don't crash, inform user  
✅ **Aggregated View** - See all accounts or filter to one  

The system now properly handles the complex scenarios of multiple enterprise accounts with varying billing permissions.
