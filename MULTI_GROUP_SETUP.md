# Multi-Group Dashboard Setup

Monitor multiple Heroku accounts, teams, and enterprise organizations in a single dashboard!

---

## 🎯 Overview

The multi-group feature allows you to:
- Monitor **personal apps**
- Track **team apps**
- Oversee **enterprise accounts**
- View all groups at once or switch between them
- Get separate usage stats per group

---

## 📋 Configuration Methods

### Method 1: Single Account (Default - Backward Compatible)

If you only have one Heroku account, no special configuration needed:

```bash
heroku config:set \
  HEROKU_API_KEY=your_token \
  HEROKU_ACCOUNT_EMAIL=your@email.com
```

The app will automatically work in single-account mode.

---

### Method 2: Multiple Groups (Manual Configuration)

Set the `HEROKU_GROUPS` environment variable with a JSON array:

```bash
heroku config:set HEROKU_GROUPS='[
  {
    "id": "personal",
    "name": "Personal Apps",
    "type": "personal",
    "apiKey": "your_personal_api_key",
    "accountEmail": "personal@example.com",
    "teamName": null
  },
  {
    "id": "team-acme",
    "name": "Acme Team",
    "type": "team",
    "apiKey": "your_team_api_key",
    "accountEmail": "team@example.com",
    "teamName": "acme-team"
  },
  {
    "id": "enterprise-bigcorp",
    "name": "BigCorp Enterprise",
    "type": "enterprise",
    "apiKey": "enterprise_api_key",
    "accountEmail": "admin@bigcorp.com",
    "teamName": "bigcorp-enterprise"
  }
]'
```

---

### Method 3: Auto-Discovery

Use the discovery endpoint to automatically find your teams:

```bash
curl https://your-app.herokuapp.com/api/groups/discover
```

This will return all accessible teams and suggest a configuration.

---

## 🏗️ Group Configuration Schema

Each group object requires:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique identifier | `"personal"`, `"team-acme"` |
| `name` | string | Display name | `"My Personal Apps"` |
| `type` | string | Group type | `"personal"`, `"team"`, `"enterprise"` |
| `apiKey` | string | Heroku API key | `"Bearer token..."` |
| `accountEmail` | string | Account email | `"you@example.com"` |
| `teamName` | string\|null | Team name (null for personal) | `"acme-team"` or `null` |

---

## 🔑 Getting API Keys for Multiple Groups

### Personal Account
```bash
heroku auth:token
```

### Team/Enterprise Account
```bash
# Login to the specific account
heroku auth:login

# Get the token
heroku auth:token

# Store it for that group
```

**Note:** If you have access to multiple teams with the same account, you can use the same API key for all teams under that account.

---

## 🎨 Group Types

### 1. Personal (`type: "personal"`)
- Your individual Heroku apps
- Not part of any team
- Icon: 👤

### 2. Team (`type: "team"`)
- Heroku team apps
- Shared resources
- Icon: 👥

### 3. Enterprise (`type: "enterprise"`)
- Enterprise organization
- Multiple teams under one org
- Icon: 🏢

---

## 📊 Dashboard Views

### Single Group View
- Shows detailed dashboard for one group
- Full usage cards, charts, and add-ons table
- Switch between groups using dropdown

### All Groups View
- Overview of all groups at once
- Compact cards showing key metrics
- Quick comparison across accounts
- Toggle between views

---

## 🚀 Setup Examples

### Example 1: Personal + Work Team

```bash
heroku config:set HEROKU_GROUPS='[
  {
    "id": "personal",
    "name": "Personal Projects",
    "type": "personal",
    "apiKey": "personal_token_here",
    "accountEmail": "john@gmail.com",
    "teamName": null
  },
  {
    "id": "work",
    "name": "Acme Inc Work",
    "type": "team",
    "apiKey": "work_token_here",
    "accountEmail": "john@acme.com",
    "teamName": "acme-inc"
  }
]'
```

### Example 2: Multiple Teams Under One Account

```bash
heroku config:set HEROKU_GROUPS='[
  {
    "id": "team-frontend",
    "name": "Frontend Team",
    "type": "team",
    "apiKey": "same_token_for_all",
    "accountEmail": "admin@company.com",
    "teamName": "frontend-team"
  },
  {
    "id": "team-backend",
    "name": "Backend Team",
    "type": "team",
    "apiKey": "same_token_for_all",
    "accountEmail": "admin@company.com",
    "teamName": "backend-team"
  },
  {
    "id": "team-devops",
    "name": "DevOps Team",
    "type": "team",
    "apiKey": "same_token_for_all",
    "accountEmail": "admin@company.com",
    "teamName": "devops-team"
  }
]'
```

### Example 3: Enterprise Setup

```bash
heroku config:set HEROKU_GROUPS='[
  {
    "id": "enterprise-main",
    "name": "BigCorp Enterprise",
    "type": "enterprise",
    "apiKey": "enterprise_key",
    "accountEmail": "admin@bigcorp.com",
    "teamName": "bigcorp-enterprise"
  }
]'
```

---

## 🧪 Testing Your Configuration

### 1. List Configured Groups
```bash
curl https://your-app.herokuapp.com/api/groups
```

### 2. Get Usage for Specific Group
```bash
curl https://your-app.herokuapp.com/api/groups/personal/usage
```

### 3. Get All Groups Usage
```bash
curl https://your-app.herokuapp.com/api/groups/all/usage
```

### 4. Discover Available Teams
```bash
curl https://your-app.herokuapp.com/api/groups/discover
```

---

## 🔧 API Endpoints

### Groups Management

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/groups` | GET | List all configured groups |
| `/api/groups/discover` | GET | Auto-discover teams |
| `/api/groups/:id/usage` | GET | Get usage for specific group |
| `/api/groups/all/usage` | GET | Get usage for all groups |

---

## 💡 Pro Tips

### 1. Same API Key for Multiple Teams
If you're a member of multiple teams under one account, use the same API key:

```json
{
  "apiKey": "your_token_here",
  "teamName": "team-a"
}
```

```json
{
  "apiKey": "your_token_here",
  "teamName": "team-b"
}
```

### 2. Naming Convention
Use clear, descriptive names:
- ✅ "Personal - Side Projects"
- ✅ "Acme Inc - Production"
- ✅ "Client XYZ - Staging"
- ❌ "Group 1", "Test", "Apps"

### 3. Group IDs
Use consistent naming:
- `personal-*` for personal accounts
- `team-*` for team accounts
- `enterprise-*` for enterprise accounts

### 4. Security
Store API keys securely:
- Never commit to git
- Use Heroku config vars
- Rotate keys regularly

---

## 🎯 Use Cases

### 1. Freelancer/Consultant
Monitor personal apps + multiple client accounts

### 2. Agency
Track multiple client teams from one dashboard

### 3. Enterprise Admin
Oversee all teams in organization

### 4. DevOps Team
Monitor dev, staging, and production environments

### 5. Multi-Account Developer
Personal projects + work projects separation

---

## 🐛 Troubleshooting

### Groups Not Showing Up
```bash
# Check if HEROKU_GROUPS is set
heroku config:get HEROKU_GROUPS

# Verify JSON is valid
echo $HEROKU_GROUPS | jq .
```

### "Failed to fetch group usage"
- Verify API key is correct
- Check team name spelling
- Ensure you have access to the team

### "Group not found"
- Check group ID matches configuration
- Verify groups are loaded

### Teams Not Discovered
- Ensure API key has team access
- Check account has team memberships

---

## 📝 Configuration File Method (Alternative)

Instead of environment variables, you can create a config file:

**groups-config.json:**
```json
[
  {
    "id": "personal",
    "name": "Personal Apps",
    "type": "personal",
    "apiKey": "token_here",
    "accountEmail": "you@example.com",
    "teamName": null
  }
]
```

Then set:
```bash
heroku config:set HEROKU_GROUPS="$(cat groups-config.json)"
```

---

## 🔄 Updating Configuration

### Add New Group
1. Get current config: `heroku config:get HEROKU_GROUPS > groups.json`
2. Edit `groups.json` to add new group
3. Update: `heroku config:set HEROKU_GROUPS="$(cat groups.json)"`
4. Restart: `heroku restart`

### Remove Group
1. Get current config
2. Remove group from JSON
3. Update config
4. Restart app

---

## 📊 Dashboard Features Per View

### Single Group View
- ✅ Detailed usage cards
- ✅ Charts and graphs
- ✅ Complete add-ons table
- ✅ Searchable apps list
- ✅ Full historical data

### All Groups View
- ✅ Overview cards per group
- ✅ Quick metrics comparison
- ✅ Status at a glance
- ✅ Cost summary per group
- ⚠️ Limited details (switch to single view for more)

---

## 🎉 Benefits

- **Centralized Monitoring**: One dashboard for all accounts
- **Easy Switching**: Toggle between groups instantly
- **Cost Tracking**: See costs per team/account
- **Overview Mode**: Compare all groups at once
- **Flexible**: Works with 1 or 100 groups

---

## 📞 Need Help?

1. Check groups are configured: `/api/groups`
2. Test discovery: `/api/groups/discover`
3. Verify API keys are valid
4. Check Heroku logs: `heroku logs --tail`

---

**Happy monitoring! 🚀**
