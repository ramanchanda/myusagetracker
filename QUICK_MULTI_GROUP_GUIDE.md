# Quick Multi-Group Setup Guide

Get multi-group monitoring running in **5 minutes**!

---

## 🚀 Quick Start

### Step 1: Discover Your Teams (2 min)

```bash
# If already deployed
curl https://your-app.herokuapp.com/api/groups/discover

# Or run this locally to see what you have access to
heroku teams
```

This shows all teams you can monitor.

---

### Step 2: Configure Groups (2 min)

**Option A: Two Groups (Personal + One Team)**

```bash
heroku config:set HEROKU_GROUPS='[
  {
    "id": "personal",
    "name": "Personal Apps",
    "type": "personal",
    "apiKey": "'$(heroku auth:token)'",
    "accountEmail": "your@email.com",
    "teamName": null
  },
  {
    "id": "team-work",
    "name": "Work Team",
    "type": "team",
    "apiKey": "'$(heroku auth:token)'",
    "accountEmail": "your@email.com",
    "teamName": "your-team-name"
  }
]'
```

**Option B: Multiple Teams (Same Account)**

```bash
TOKEN=$(heroku auth:token)
EMAIL=$(heroku auth:whoami)

heroku config:set HEROKU_GROUPS='[
  {
    "id": "team-frontend",
    "name": "Frontend Team",
    "type": "team",
    "apiKey": "'$TOKEN'",
    "accountEmail": "'$EMAIL'",
    "teamName": "frontend-team"
  },
  {
    "id": "team-backend",
    "name": "Backend Team",
    "type": "team",
    "apiKey": "'$TOKEN'",
    "accountEmail": "'$EMAIL'",
    "teamName": "backend-team"
  }
]'
```

---

### Step 3: Restart & Test (1 min)

```bash
# Restart app
heroku restart

# Open dashboard
heroku open

# Or test API
curl https://your-app.herokuapp.com/api/groups
```

---

## ✅ What You'll See

### Group Selector
- Dropdown to switch between groups
- Toggle for "Single Group" vs "All Groups" view
- Count of personal/team/enterprise groups

### Single Group View
- Full dashboard for selected group
- Detailed usage cards
- Charts and add-ons table

### All Groups View
- Overview cards for each group
- Quick metrics comparison
- Status indicators per group

---

## 📋 Common Configurations

### Personal Only (Default)
No special config needed - just set:
```bash
HEROKU_API_KEY=token
HEROKU_ACCOUNT_EMAIL=email
```

### Personal + Work
```bash
HEROKU_GROUPS='[
  {"id":"personal","name":"Personal","type":"personal","apiKey":"token","accountEmail":"email","teamName":null},
  {"id":"work","name":"Work","type":"team","apiKey":"token","accountEmail":"email","teamName":"work-team"}
]'
```

### Multiple Clients (Agency)
```bash
HEROKU_GROUPS='[
  {"id":"client-a","name":"Client A","type":"team","apiKey":"token_a","accountEmail":"clienta@agency.com","teamName":"client-a-team"},
  {"id":"client-b","name":"Client B","type":"team","apiKey":"token_b","accountEmail":"clientb@agency.com","teamName":"client-b-team"}
]'
```

---

## 🎯 Key Points

1. **Same API Key**: If you have access to multiple teams with one account, use the same API key
2. **Team Names**: Must match exactly - check with `heroku teams`
3. **Group IDs**: Must be unique across all groups
4. **Backward Compatible**: App works with or without HEROKU_GROUPS

---

## 🔧 Troubleshooting

### Groups not showing?
```bash
heroku config:get HEROKU_GROUPS
```

### Wrong teams listed?
```bash
# Check your team names
heroku teams

# Verify spelling in config
```

### API errors?
```bash
# Check logs
heroku logs --tail | grep group

# Test endpoint
curl https://your-app.herokuapp.com/api/groups
```

---

## 📖 More Info

See `MULTI_GROUP_SETUP.md` for:
- Detailed configuration options
- API endpoint documentation
- Advanced use cases
- Security best practices

---

**Ready? Run the commands above and start monitoring! 🎉**
