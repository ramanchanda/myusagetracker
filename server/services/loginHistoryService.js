/**
 * Login History Service
 * Tracks and manages login attempts for security auditing
 */

const db = require('./databaseService');

/**
 * Initialize login history table
 */
async function initializeSchema() {
  const schemaPath = require('path').join(__dirname, '../database/schema/login_history.sql');
  const fs = require('fs');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const client = await db.getClient();
  try {
    await client.query(schema);
    console.log('[LoginHistory] Schema initialized');
  } finally {
    client.release();
  }
}

/**
 * Log a login attempt
 * @param {Object} params - Login attempt details
 * @param {string} params.username - Username attempted
 * @param {string} params.role - User role (if successful)
 * @param {string} params.ipAddress - IP address of request
 * @param {string} params.userAgent - User agent string
 * @param {boolean} params.success - Whether login succeeded
 * @param {string} params.failureReason - Reason for failure (if unsuccessful)
 */
async function logLoginAttempt({ username, role, ipAddress, userAgent, success, failureReason }) {
  try {
    await db.query(`
      INSERT INTO login_history (username, role, ip_address, user_agent, success, failure_reason)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [username, role || null, ipAddress, userAgent, success, failureReason || null]);

    console.log(`[LoginHistory] Logged ${success ? 'successful' : 'failed'} login for: ${username}`);
  } catch (error) {
    console.error('[LoginHistory] Error logging attempt:', error);
    // Don't throw - login should still work even if logging fails
  }
}

/**
 * Get login history (admin only)
 * @param {Object} options - Query options
 * @param {number} options.limit - Max records to return (default 100)
 * @param {number} options.offset - Offset for pagination (default 0)
 * @param {string} options.username - Filter by username (optional)
 * @param {boolean} options.successOnly - Only successful logins (optional)
 * @returns {Promise<Array>} Login history records
 */
async function getLoginHistory({ limit = 100, offset = 0, username, successOnly } = {}) {
  try {
    let query = 'SELECT * FROM login_history WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (username) {
      query += ` AND username = $${paramCount++}`;
      params.push(username);
    }

    if (successOnly !== undefined) {
      query += ` AND success = $${paramCount++}`;
      params.push(successOnly);
    }

    query += ` ORDER BY login_time DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    params.push(limit, offset);

    const result = await db.query(query, params);
    return result.rows;
  } catch (error) {
    console.error('[LoginHistory] Error fetching history:', error);
    throw error;
  }
}

/**
 * Get login statistics
 * @returns {Promise<Object>} Statistics about logins
 */
async function getLoginStats() {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_attempts,
        COUNT(*) FILTER (WHERE success = true) as successful_logins,
        COUNT(*) FILTER (WHERE success = false) as failed_logins,
        COUNT(DISTINCT username) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        MAX(login_time) FILTER (WHERE success = true) as last_successful_login
      FROM login_history
      WHERE login_time > NOW() - INTERVAL '30 days'
    `);

    return result.rows[0];
  } catch (error) {
    console.error('[LoginHistory] Error fetching stats:', error);
    throw error;
  }
}

/**
 * Clean up old login history (keep last 90 days)
 */
async function cleanupOldHistory() {
  try {
    const result = await db.query(`
      DELETE FROM login_history
      WHERE login_time < NOW() - INTERVAL '90 days'
    `);

    console.log(`[LoginHistory] Cleaned up ${result.rowCount} old records`);
    return result.rowCount;
  } catch (error) {
    console.error('[LoginHistory] Error cleaning up:', error);
    throw error;
  }
}

module.exports = {
  initializeSchema,
  logLoginAttempt,
  getLoginHistory,
  getLoginStats,
  cleanupOldHistory
};
