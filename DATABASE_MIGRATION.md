# Database Migration Guide - Notification History

## Overview

Current implementation uses JSON file storage. For production scale, migrate to PostgreSQL.

---

## PostgreSQL Schema

### notification_history Table

```sql
CREATE TABLE notification_history (
  id SERIAL PRIMARY KEY,
  event_id VARCHAR(255) UNIQUE NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20),
  resource_type VARCHAR(50),
  recipients TEXT[] NOT NULL,
  subject TEXT,
  provider VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  message_id VARCHAR(255),
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for common queries
CREATE INDEX idx_notification_type ON notification_history(event_type);
CREATE INDEX idx_notification_status ON notification_history(status);
CREATE INDEX idx_notification_resource ON notification_history(resource_type);
CREATE INDEX idx_notification_created ON notification_history(created_at DESC);
CREATE INDEX idx_notification_metadata ON notification_history USING gin(metadata);

-- Index for time-range queries
CREATE INDEX idx_notification_time_range ON notification_history(created_at, status);
```

### alert_state Table (for persistence across restarts)

```sql
CREATE TABLE alert_state (
  resource_type VARCHAR(50) PRIMARY KEY,
  last_severity VARCHAR(20),
  last_alert_time TIMESTAMP WITH TIME ZONE,
  last_value NUMERIC,
  consecutive_alerts INTEGER DEFAULT 0,
  last_anomaly_alert TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### usage_history Table (for anomaly detection)

```sql
CREATE TABLE usage_history (
  id SERIAL PRIMARY KEY,
  resource_type VARCHAR(50) NOT NULL,
  value NUMERIC NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for queries
CREATE INDEX idx_usage_history_resource_time ON usage_history(resource_type, timestamp DESC);

-- Cleanup old data automatically
CREATE INDEX idx_usage_history_cleanup ON usage_history(timestamp);
```

---

## Setup Instructions

### 1. Add Heroku Postgres

```bash
# Add PostgreSQL addon (choose plan based on needs)
heroku addons:create heroku-postgresql:mini  # $5/month
# or
heroku addons:create heroku-postgresql:basic  # $9/month
# or
heroku addons:create heroku-postgresql:standard-0  # $50/month

# Check DATABASE_URL is set
heroku config:get DATABASE_URL
```

### 2. Install PostgreSQL Client (pg)

```bash
npm install --save pg
```

### 3. Run Migration

```bash
# Local (connect to Heroku DB)
node scripts/migrate-database.js

# Or via Heroku
heroku run node scripts/migrate-database.js
```

### 4. Migrate Existing JSON Data

```bash
# Migrate JSON history to PostgreSQL
node scripts/migrate-json-to-postgres.js
```

---

## Database Service Implementation

**File:** `server/services/notificationHistoryDB.js`

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false
});

async function addEvent(event) {
  const query = `
    INSERT INTO notification_history (
      event_id, event_type, severity, resource_type,
      recipients, subject, provider, status,
      message_id, error_message, metadata, sent_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    RETURNING *
  `;
  
  const eventId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const values = [
    eventId,
    event.type,
    event.severity,
    event.resourceType,
    event.recipients,
    event.subject,
    event.provider,
    event.status || 'queued',
    event.messageId,
    event.error,
    JSON.stringify(event.metadata || {}),
    event.status === 'sent' ? new Date() : null
  ];
  
  const result = await pool.query(query, values);
  return result.rows[0];
}

async function getHistory(options = {}) {
  let query = 'SELECT * FROM notification_history WHERE 1=1';
  const values = [];
  let paramIndex = 1;
  
  if (options.type) {
    query += ` AND event_type = $${paramIndex++}`;
    values.push(options.type);
  }
  
  if (options.status) {
    query += ` AND status = $${paramIndex++}`;
    values.push(options.status);
  }
  
  if (options.resourceType) {
    query += ` AND resource_type = $${paramIndex++}`;
    values.push(options.resourceType);
  }
  
  if (options.since) {
    query += ` AND created_at >= $${paramIndex++}`;
    values.push(options.since);
  }
  
  if (options.until) {
    query += ` AND created_at <= $${paramIndex++}`;
    values.push(options.until);
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (options.limit) {
    query += ` LIMIT $${paramIndex++}`;
    values.push(options.limit);
  }
  
  const result = await pool.query(query, values);
  return result.rows;
}

module.exports = {
  addEvent,
  getHistory,
  updateEventStatus,
  getStatistics,
  // ... other methods
};
```

---

## Gradual Migration Strategy

### Phase 1: Dual Write
- Write to both JSON and PostgreSQL
- Read from JSON (existing code)
- Verify PostgreSQL data

### Phase 2: Dual Read
- Write to both
- Read from PostgreSQL (verify results match)
- Keep JSON as backup

### Phase 3: PostgreSQL Only
- Write to PostgreSQL only
- Remove JSON code
- Archive old JSON files

---

## Configuration

### Environment Variable

```bash
# Check if DATABASE_URL exists
heroku config:get DATABASE_URL

# Use PostgreSQL if available, fallback to JSON
USE_DATABASE=true  # Set automatically if DATABASE_URL exists
```

### Automatic Detection

```javascript
// In notificationHistory.js
const useDatabase = !!process.env.DATABASE_URL;

if (useDatabase) {
  module.exports = require('./notificationHistoryDB');
} else {
  module.exports = require('./notificationHistoryJSON');
}
```

---

## Benefits of PostgreSQL

### Scalability
- Handle millions of records
- Efficient indexing
- Concurrent access

### Reliability
- ACID transactions
- Automatic backups (Heroku)
- Point-in-time recovery

### Advanced Queries
```sql
-- Success rate by provider
SELECT 
  provider,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'sent') as sent,
  ROUND(COUNT(*) FILTER (WHERE status = 'sent')::numeric / COUNT(*) * 100, 2) as success_rate
FROM notification_history
WHERE created_at > NOW() - INTERVAL '7 days'
GROUP BY provider;

-- Alerts by hour of day
SELECT 
  EXTRACT(HOUR FROM created_at) as hour,
  COUNT(*) as count
FROM notification_history
WHERE event_type = 'threshold-alert'
GROUP BY hour
ORDER BY hour;

-- Failed notifications for retry
SELECT * FROM notification_history
WHERE status = 'failed'
  AND created_at > NOW() - INTERVAL '1 day'
ORDER BY created_at;
```

### Analytics
- Built-in aggregation functions
- Time-series analysis
- Complex filters with JSONB

---

## Monitoring

### Check Connection

```javascript
async function checkDatabaseHealth() {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('Database connected:', result.rows[0]);
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
```

### Maintenance

```sql
-- Cleanup old history (keep last 90 days)
DELETE FROM notification_history
WHERE created_at < NOW() - INTERVAL '90 days';

-- Cleanup old usage history (keep last 7 days)
DELETE FROM usage_history
WHERE timestamp < NOW() - INTERVAL '7 days';

-- Vacuum and analyze
VACUUM ANALYZE notification_history;
VACUUM ANALYZE usage_history;
```

---

## Cost

### Heroku Postgres Plans

| Plan | Storage | RAM | Price | Use Case |
|------|---------|-----|-------|----------|
| Mini | 1 GB | 512 MB | $5/mo | Development |
| Basic | 10 GB | 1 GB | $9/mo | Small production |
| Standard-0 | 64 GB | 4 GB | $50/mo | Production |

### Estimated Usage

- ~100 bytes per notification record
- 1000 notifications/day = ~100 KB/day = ~3 MB/month
- 1 GB supports ~10 million notifications
- **Mini plan sufficient for most use cases**

---

## Implementation Status

**Current:** JSON file storage (works well for <10K events)

**Recommended migration when:**
- Notification volume > 1000/day
- Need advanced analytics
- Multiple dyno instances (JSON doesn't scale)
- Need persistent alert state across restarts

**Migration effort:** ~2-4 hours

---

## Testing

```bash
# Test database connection
heroku run node -e "
  const { Pool } = require('pg');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT NOW()', (err, res) => {
    console.log(err ? err : res.rows[0]);
    pool.end();
  });
"

# Check table exists
heroku pg:psql -c "SELECT COUNT(*) FROM notification_history;"

# View recent events
heroku pg:psql -c "SELECT id, event_type, status, created_at FROM notification_history ORDER BY created_at DESC LIMIT 10;"
```

---

**Status:** Optional enhancement - JSON storage working well for current scale

**Implement when:** Volume increases or need advanced analytics
