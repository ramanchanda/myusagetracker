/**
 * Database Service
 * PostgreSQL connection pool for persistent storage
 */

const { Pool } = require('pg');

const LOG_PREFIX = '[Database Service]';

// Create PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
  max: 10, // Maximum pool connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
});

// Handle pool errors
pool.on('error', (err) => {
  console.error(`${LOG_PREFIX} Unexpected pool error:`, err);
});

/**
 * Initialize database schema
 * Creates notification_history table if it doesn't exist
 */
async function initializeSchema() {
  const client = await pool.connect();
  try {
    console.log(`${LOG_PREFIX} Initializing database schema...`);

    // Create notification_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notification_history (
        id SERIAL PRIMARY KEY,
        account_id TEXT,
        account_name TEXT,
        notification_type TEXT NOT NULL,
        severity TEXT,
        subject TEXT,
        recipient TEXT,
        provider TEXT,
        status TEXT NOT NULL DEFAULT 'queued',
        resource_summary JSONB,
        critical_count INTEGER DEFAULT 0,
        warning_count INTEGER DEFAULT 0,
        metadata JSONB,
        triggered_at TIMESTAMP,
        delivered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Create indexes for common queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_history_created_at
      ON notification_history(created_at DESC)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_history_status
      ON notification_history(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_history_type
      ON notification_history(notification_type)
    `);

    console.log(`${LOG_PREFIX} Database schema initialized successfully`);
  } catch (error) {
    console.error(`${LOG_PREFIX} Schema initialization failed:`, error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Execute a query with error handling
 */
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`${LOG_PREFIX} Query executed in ${duration}ms`);
    return result;
  } catch (error) {
    console.error(`${LOG_PREFIX} Query error:`, error.message);
    console.error(`${LOG_PREFIX} Query:`, text);
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  return await pool.connect();
}

/**
 * Check database connection health
 */
async function healthCheck() {
  try {
    const result = await pool.query('SELECT NOW()');
    return {
      healthy: true,
      timestamp: result.rows[0].now
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Gracefully close the pool
 */
async function close() {
  console.log(`${LOG_PREFIX} Closing database pool...`);
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  initializeSchema,
  healthCheck,
  close
};
