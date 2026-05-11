# Enterprise View - Teams & Resource Breakdown

## Overview

The Enterprise View provides a comprehensive overview of your Heroku account structure, showing all teams you're part of and breaking down resources into clear categories: **Dynos**, **Connect**, **Data Add-ons**, and **Other Add-ons**.

---

## 🎯 Key Features

### 1. **Account Structure Visibility**
- View all teams you're part of
- See personal apps separately
- Identify team types (Personal, Team, Enterprise)
- Overall account summary

### 2. **Resource Categorization**
Resources are organized into 4 clear categories:

| Category | Icon | Description |
|----------|------|-------------|
| **Dynos** | ⚡ | Compute resources (web, worker dynos) |
| **Connect** | 🔌 | Heroku Connect hours (if applicable) |
| **Data Add-ons** | 💾 | Databases, caches, search engines |
| **Other Add-ons** | 🔧 | Monitoring, email, queues, etc. |

### 3. **Team-Level Breakdown**
- Apps per team
- Dynos per team
- Data add-ons per team
- Other add-ons per team
- Monthly cost per team

### 4. **Detailed Resource View**
Click any team to see:
- List of all dynos with sizes and quantities
- Complete data add-ons with costs
- Complete other add-ons with costs
- Per-app breakdown

---

## 📊 What is Categorized as "Data Add-ons"

### Databases
- **PostgreSQL** (heroku-postgresql)
- **MySQL** (cleardb, mysql)
- **MongoDB** (mongodb, mlab)

### Caching
- **Redis** (heroku-redis, redis-cloud)
- **Memcache** (memcached)

### Search
- **Elasticsearch** (bonsai, searchbox, elasticsearch)

**All database and data storage services are categorized as "Data Add-ons"**

---

## 🔧 What is Categorized as "Other Add-ons"

Everything that's not a data service:

### Monitoring & Logging
- Papertrail, New Relic, Sentry, Logentries

### Email Services
- SendGrid, Mailgun, Mailtogo, Postmark

### Queue & Workers
- CloudAMQP, RabbitMQ, IronWorker

### Scheduler
- Heroku Scheduler

### Storage
- Bucketeer, S3

### Analytics
- Segment, Keen

### Security
- SSL certificates, security services

---

## 🎨 UI Components

### Overall Summary Bar
Displays totals across all teams:
- 👥 Total Teams
- 📱 Total Applications
- ⚡ Total Dynos
- 💾 Total Data Add-ons
- 🔧 Total Other Add-ons
- 💰 Total Monthly Cost

### Team Cards
Each team shows:
- Team name and type (Personal/Team/Enterprise)
- Number of apps
- Number of dynos
- Number of data add-ons
- Number of other add-ons
- Monthly cost for that team
- **"Show Details"** button

### Team Details Panel
When you click a team, see:

**⚡ Dynos Section**
- App name
- Dyno type (web, worker, etc.)
- Dyno size (standard-1x, etc.)
- Quantity

**💾 Data Add-ons Section**
- Add-on name
- Service type (PostgreSQL, Redis, etc.)
- Plan name
- Monthly cost
- Associated app

**🔧 Other Add-ons Section**
- Add-on name
- Service type (SendGrid, Papertrail, etc.)
- Plan name
- Monthly cost
- Associated app

---

## 🚀 How to Use

### Step 1: Access Enterprise View
Click the **🏢 Enterprise** button in the top navigation.

### Step 2: Review Overall Summary
See totals across all teams at the top.

### Step 3: Browse Teams
Scroll through team cards to see high-level stats.

### Step 4: View Team Details
Click any team card to expand and see:
- All dynos
- All data add-ons with costs
- All other add-ons with costs

### Step 5: Analyze Costs
- Compare costs across teams
- Identify expensive data add-ons
- Review other service costs

---

## 📈 Use Cases

### 1. **Cost Analysis by Team**
**Scenario**: Finance wants to know how much each team spends

**Steps**:
1. Go to Enterprise View
2. Review team cards
3. Note monthly cost per team
4. Click teams to see detailed breakdown

### 2. **Database Audit**
**Scenario**: Audit all databases across the organization

**Steps**:
1. Go to Enterprise View
2. Look at "Data Add-ons" count in summary
3. Click each team
4. Review "Data Add-ons" section
5. See all databases with costs

### 3. **Resource Optimization**
**Scenario**: Identify underutilized or expensive resources

**Steps**:
1. Check overall summary for totals
2. Click teams with high costs
3. Review detailed add-ons
4. Identify optimization opportunities

### 4. **Team Comparison**
**Scenario**: Compare resource usage across teams

**Steps**:
1. View all team cards
2. Compare apps, dynos, add-ons counts
3. Compare monthly costs
4. Identify outliers

---

## 🔄 Switching Between Views

### Dashboard View (📊)
- Traditional usage dashboard
- Color-coded usage cards
- Charts and graphs
- Categorized add-ons view
- Multi-group support

### Enterprise View (🏢)
- Team-based organization
- Resource categorization
- Per-team breakdown
- Cost analysis by team

**Toggle between views** using the buttons in the header.

---

## 📊 API Endpoints

### Get Enterprise Structure
```bash
GET /api/enterprise/structure
```

**Response:**
```json
{
  "account": {
    "email": "you@example.com",
    "name": "Your Name",
    "id": "account-id"
  },
  "personalApps": {
    "teamName": "Personal Apps",
    "teamType": "personal",
    "totalApps": 2,
    "dynos": { ... },
    "dataAddons": { ... },
    "otherAddons": { ... },
    "totalMonthlyCost": "25.00"
  },
  "teams": [
    {
      "name": "frontend-team",
      "type": "team",
      "resources": {
        "totalApps": 5,
        "dynos": {
          "count": 8,
          "totalQuantity": 10,
          "formations": [...]
        },
        "dataAddons": {
          "count": 3,
          "addons": [...],
          "totalCost": "75.00"
        },
        "otherAddons": {
          "count": 2,
          "addons": [...],
          "totalCost": "15.00"
        },
        "totalMonthlyCost": "90.00"
      }
    }
  ],
  "summary": {
    "totalTeams": 3,
    "totalApps": 15,
    "totalDynos": 25,
    "totalDataAddons": 8,
    "totalOtherAddons": 5,
    "totalMonthlyCost": "250.00"
  }
}
```

### Get Teams List
```bash
GET /api/enterprise/teams
```

---

## 💡 Benefits

### For Management
- **Visibility**: See all teams and resources at once
- **Cost Control**: Monthly costs by team
- **Planning**: Understand resource distribution

### For DevOps
- **Organization**: Resources grouped logically
- **Audit**: Easy database and service audit
- **Optimization**: Identify expensive resources

### For Finance
- **Allocation**: Costs broken down by team
- **Budgeting**: Plan budgets per team
- **Reporting**: Clear cost categories

---

## 🎯 Example Scenarios

### Scenario 1: New Team Member Onboarding
**Question**: "What infrastructure do we have?"

**Answer**: 
1. Go to Enterprise View
2. Show them each team
3. Explain resource categories
4. Review costs

### Scenario 2: Budget Review Meeting
**Question**: "How much does each team spend?"

**Answer**:
1. Open Enterprise View
2. Overall summary shows total
3. Team cards show per-team costs
4. Click teams for detailed breakdown

### Scenario 3: Database Consolidation
**Question**: "How many databases do we have and where?"

**Answer**:
1. Enterprise View summary shows total data add-ons
2. Click each team
3. Review "Data Add-ons" section
4. List all databases with locations

---

## 🔍 Key Differences: Dashboard vs Enterprise View

| Feature | Dashboard View | Enterprise View |
|---------|---------------|-----------------|
| **Organization** | By resource type | By team |
| **Focus** | Usage & quotas | Structure & costs |
| **Categorization** | 11 add-on categories | 2 categories (Data/Other) |
| **Charts** | Usage charts | No charts |
| **Best For** | Monitoring usage | Cost analysis |
| **Best For** | Alerts & thresholds | Team comparison |

---

## 🚀 Future Enhancements

Planned features:
- **Cost Trends**: Historical cost by team
- **Export**: Download team reports (CSV/PDF)
- **Filters**: Filter by cost, app count, etc.
- **Search**: Search across all teams
- **Compare**: Side-by-side team comparison
- **Alerts**: Per-team budget alerts

---

## 📞 Questions?

**How are teams detected?**
Automatically fetched from Heroku Platform API based on your account.

**Can I see apps that aren't in a team?**
Yes! They appear as "Personal Apps" with a 👤 icon.

**Why only 2 add-on categories in Enterprise View?**
For clarity in cost analysis. Data services (expensive) vs Other services.

**Can I switch views quickly?**
Yes! Use the toggle buttons in the header: 📊 Dashboard | 🏢 Enterprise

**Is this real-time?**
Yes, data is fetched fresh when you open Enterprise View. Click Refresh to update.

---

## 📚 Related Documentation

- **ADDON_CATEGORIES.md** - Detailed add-on categorization (11 categories)
- **MULTI_GROUP_SETUP.md** - Multi-account configuration
- **ARCHITECTURE.md** - System architecture
- **README.md** - General overview

---

**Version**: 2.0  
**Last Updated**: May 2026  
**Status**: Production Ready ✅
