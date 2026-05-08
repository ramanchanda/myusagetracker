# Add-on Categorization & Resource Grouping

## Overview

The Heroku Usage Tracker now automatically categorizes add-ons by type and provides grouped views of all resources (Dynos, Connect, Add-ons) for better visibility and cost management.

---

## 🎯 Key Features

### 1. **Automatic Add-on Categorization**
All add-ons are automatically categorized into logical groups:

| Category | Icon | Examples |
|----------|------|----------|
| **Data & Databases** | 💾 | PostgreSQL, Redis, MongoDB, MySQL |
| **Heroku Connect** | 🔌 | Heroku Connect |
| **Monitoring & Logging** | 📊 | Papertrail, New Relic, Sentry, Logentries |
| **Email Services** | 📧 | SendGrid, Mailgun, Mailtogo |
| **Search** | 🔍 | Elasticsearch, Bonsai, Searchbox |
| **Queue & Workers** | 📬 | CloudAMQP, RabbitMQ, IronWorker |
| **Scheduler** | ⏰ | Heroku Scheduler |
| **Storage** | 🗄️ | Bucketeer, S3 |
| **Analytics** | 📈 | Segment, Keen |
| **Security & SSL** | 🔒 | SSL, Expedited Security |
| **Other Services** | 🔧 | Uncategorized add-ons |

### 2. **Resource Summary View**
Unified overview showing:
- ⚡ **Compute Resources** (Dynos & Connect)
- 💎 **Add-ons & Services** with category breakdown
- 📊 **Quick Stats** (Apps, Dynos, Add-ons, Total Cost)

### 3. **Two Add-on Views**

#### Categorized View (Default)
- **Category Cards**: Quick overview with count and cost per category
- **Filtered Display**: Click a category to see only those add-ons
- **Search & Sort**: Find add-ons by name, service, or app
- **Cost Breakdown**: Visual chart showing spend by category

#### List View (Classic)
- **Searchable Table**: Traditional table view
- **Sortable Columns**: Sort by name, app, cost
- **All Details**: Complete add-on information

---

## 📊 Supported Add-ons

### Data & Databases 💾

**PostgreSQL**
- heroku-postgresql
- postgres

**Redis**
- heroku-redis
- redis-cloud

**MongoDB**
- mongodb
- mlab

**MySQL**
- mysql
- cleardb

### Monitoring & Logging 📊

**Application Performance Monitoring**
- newrelic (New Relic APM)
- sentry (Error tracking)

**Logging**
- papertrail
- logentries
- splunk

### Email Services 📧

- sendgrid (Email delivery)
- mailgun (Email API)
- mailtogo (SMTP service)
- postmark (Transactional email)

### Search 🔍

- elasticsearch
- bonsai (Elasticsearch)
- searchbox (Elasticsearch)

### Queue & Workers 📬

- cloudamqp (RabbitMQ)
- ironworker (Background jobs)
- rabbitmq (Message queue)

### Other Categories

- **Scheduler** ⏰: heroku-scheduler
- **Storage** 🗄️: bucketeer, s3
- **Analytics** 📈: segment, keen
- **Security** 🔒: ssl, expedited-security

---

## 🎨 UI Components

### ResourceSummary Component
**Location**: Top of dashboard

**Features**:
- Overall health status indicator
- Compute resources progress bars (Dynos, Connect)
- Add-ons overview with total count and cost
- Top 3 categories by cost
- Quick stats cards

### CategorizedAddons Component
**Location**: Add-ons section (default view)

**Features**:
- Category filter cards with icons
- Search functionality
- Multi-sort options (cost, name, app, category)
- Add-on cards with all details
- Cost breakdown chart

**Toggle**: Switch between Categorized and List views

---

## 📈 Benefits

### For Management
- **Cost Visibility**: See spending by service type
- **Quick Insights**: Identify expensive categories at a glance
- **Budget Planning**: Understand cost distribution

### For DevOps
- **Easy Discovery**: Find specific add-ons quickly
- **Category Grouping**: Logical organization of services
- **Service Audit**: Review all services by type

### For Finance
- **Cost Breakdown**: Detailed by category
- **Trend Analysis**: Track category spending over time
- **Budget Allocation**: Assign costs to departments

---

## 🔧 Technical Implementation

### Backend (Node.js)

**File**: `server/services/herokuService.js`

**Function**: `categorizeAddon(addonServiceName)`
- Analyzes add-on service name
- Returns category, type, and icon
- Extensible for new add-on types

**Enhanced Response**:
```javascript
{
  totalAddons: 10,
  addons: [...], // Each addon includes category info
  totalMonthlyCost: "125.00",
  addonsByCategory: {
    data: { count: 3, addons: [...], totalCost: 75 },
    monitoring: { count: 2, addons: [...], totalCost: 25 },
    // ...
  },
  categorySummary: [
    { category: 'data', count: 3, totalCost: '75.00' },
    // Sorted by cost
  ]
}
```

### Frontend (React)

**New Components**:
1. `ResourceSummary.js` - Grouped resource overview
2. `CategorizedAddons.js` - Category-based add-ons view

**Enhanced Components**:
1. `Dashboard.js` - Toggle between views
2. Multi-group support maintained

---

## 🎯 Usage Examples

### Example 1: Find All Database Add-ons
1. Open dashboard
2. Ensure "Categorized View" is selected
3. Click "Data & Databases" category card
4. See all PostgreSQL, Redis, MongoDB add-ons

### Example 2: Identify High-Cost Categories
1. Scroll to "Cost Breakdown by Category"
2. Visual chart shows percentage by category
3. Click category to filter and see individual add-ons

### Example 3: Search for Specific Service
1. Use search box in add-ons section
2. Type service name (e.g., "postgres")
3. Results filter in real-time
4. Sort by cost or name

---

## 📊 API Response Example

```json
{
  "dynos": {
    "totalApps": 5,
    "used": 450,
    "limit": 1000,
    "usagePercentage": "45.00",
    "dynos": [...]
  },
  "connect": {
    "connectUsed": 100,
    "connectLimit": 500,
    "usagePercentage": "20.00"
  },
  "addons": {
    "totalAddons": 8,
    "totalMonthlyCost": "125.00",
    "addons": [
      {
        "name": "postgresql-curly-12345",
        "addonService": "heroku-postgresql",
        "plan": "heroku-postgresql:standard-0",
        "price": { "cents": 5000 },
        "category": "data",
        "categoryType": "PostgreSQL Database",
        "categoryIcon": "🐘",
        "appName": "my-app"
      }
    ],
    "addonsByCategory": {
      "data": {
        "category": "data",
        "count": 3,
        "totalCost": 75.00,
        "addons": [...]
      }
    },
    "categorySummary": [
      {
        "category": "data",
        "count": 3,
        "totalCost": "75.00"
      }
    ]
  }
}
```

---

## 🔄 Backward Compatibility

All existing functionality is preserved:
- ✅ Original AddonsList component still available
- ✅ List view accessible via toggle
- ✅ All API endpoints return enhanced data
- ✅ Old clients continue to work (ignore new fields)

---

## 🚀 Future Enhancements

### Planned Features
1. **Custom Categories**: Define your own categories
2. **Category Budgets**: Set spending limits per category
3. **Trend Charts**: Historical spending by category
4. **Alerts by Category**: Threshold alerts per service type
5. **Export**: Download category reports (CSV/PDF)
6. **Tags**: Manual tagging system for add-ons
7. **Cost Forecasting**: Predict future costs by category

### Potential Categories to Add
- CDN & Edge (Fastly, Cloudflare)
- Backup & Recovery
- CI/CD Services
- Compliance & Audit
- Communication (Twilio, etc.)

---

## 💡 Pro Tips

### 1. Use Category Filter for Quick Audits
Click category → Review all services of that type → Identify unused

### 2. Sort by Cost in Category
Filter by category → Sort by cost → See most expensive first

### 3. Search Across Categories
Use search to find all instances of a service across apps

### 4. Monitor Top 3 Categories
Resource Summary shows top 3 by cost → Quick insight into spending

### 5. Cost Breakdown Chart
Use to present to finance/leadership → Visual spending distribution

---

## 📞 Questions?

**How is categorization determined?**
Based on add-on service name pattern matching. See `categorizeAddon()` function.

**Can I customize categories?**
Currently automatic, but custom categories are planned for future release.

**What if an add-on isn't categorized correctly?**
It will appear in "Other Services" category. Report for potential fix.

**Does this work with multi-group dashboards?**
Yes! Categorization works seamlessly with multi-group monitoring.

**Performance impact?**
Minimal - categorization happens during data fetching, no extra API calls.

---

## 📚 Related Documentation

- **ARCHITECTURE.md** - System architecture
- **MULTI_GROUP_SETUP.md** - Multi-account configuration
- **README.md** - General project overview

---

**Version**: 2.0  
**Last Updated**: May 2026  
**Status**: Production Ready ✅
