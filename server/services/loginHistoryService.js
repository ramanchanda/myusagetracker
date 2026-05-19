/**
 * Login History Service
 * Tracks and manages successful login attempts for security auditing
 */

const db = require('./databaseService');
const crypto = require('crypto');

/**
 * Parse browser name from user agent string
 * @param {string} userAgent - Full user agent string
 * @returns {string} Browser name (e.g., "Chrome", "Firefox", "Safari")
 */
function parseBrowserName(userAgent) {
  if (!userAgent) return 'Unknown';

  // Check in order of specificity
  if (userAgent.includes('Edg/')) return 'Edge';
  if (userAgent.includes('OPR/') || userAgent.includes('Opera/')) return 'Opera';
  if (userAgent.includes('Chrome/')) return 'Chrome';
  if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox/')) return 'Firefox';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident/')) return 'Internet Explorer';

  return 'Other';
}

/**
 * Generate system identifier from IP and User Agent
 * @param {string} ipAddress - Client IP address
 * @param {string} userAgent - User agent string
 * @returns {string} Hashed system identifier (first 12 chars)
 */
function generateSystemId(ipAddress, userAgent) {
  const combined = `${ipAddress}|${userAgent}`;
  const hash = crypto.createHash('sha256').update(combined).digest('hex');
  return hash.substring(0, 12); // Short system ID
}

/**
 * Hash IP address for privacy (GDPR compliance)
 * @param {string} ipAddress - Client IP address
 * @returns {string} Hashed IP (first 12 chars)
 */
function hashIpAddress(ipAddress) {
  const hash = crypto.createHash('sha256').update(ipAddress).digest('hex');
  return hash.substring(0, 12); // Short hash for privacy
}

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
 * Log a successful login attempt
 * @param {Object} params - Login attempt details
 * @param {string} params.username - Username
 * @param {string} params.role - User role
 * @param {string} params.ipAddress - IP address of request
 * @param {string} params.userAgent - User agent string
 */
async function logLoginAttempt({ username, role, ipAddress, userAgent }) {
  try {
    const browser = parseBrowserName(userAgent);
    const systemId = generateSystemId(ipAddress, userAgent);
    const ipHash = hashIpAddress(ipAddress);

    // Store hashed IP for privacy, full user agent for debugging
    await db.query(`
      INSERT INTO login_history (username, role, ip_address, user_agent, browser, system_id)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [username, role, ipHash, userAgent, browser, systemId]); // Storing full user agent

    console.log(`[LoginHistory] Logged successful login for: ${username} from ${browser} (${systemId})`);
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
 * @returns {Promise<Array>} Login history records (successful logins only)
 */
async function getLoginHistory({ limit = 100, offset = 0, username } = {}) {
  try {
    let query = 'SELECT * FROM login_history WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (username) {
      query += ` AND username = $${paramCount++}`;
      params.push(username);
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
 * @returns {Promise<Object>} Statistics about logins (successful only)
 */
async function getLoginStats() {
  try {
    const result = await db.query(`
      SELECT
        COUNT(*) as total_logins,
        COUNT(DISTINCT username) as unique_users,
        COUNT(DISTINCT ip_address) as unique_ips,
        COUNT(DISTINCT system_id) as unique_systems,
        MAX(login_time) as last_login
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

/**
 * Delete all login history for a specific user (GDPR: Right to Deletion)
 * @param {string} username - Username to delete history for
 * @returns {Promise<Object>} Deletion result
 */
async function deleteUserHistory(username) {
  try {
    const result = await db.query(`
      DELETE FROM login_history
      WHERE username = $1
    `, [username]);

    console.log(`[LoginHistory] Deleted ${result.rowCount} records for user: ${username}`);
    return { success: true, deletedCount: result.rowCount };
  } catch (error) {
    console.error('[LoginHistory] Error deleting user history:', error);
    throw error;
  }
}

module.exports = {
  initializeSchema,
  logLoginAttempt,
  getLoginHistory,
  getLoginStats,
  cleanupOldHistory,
  deleteUserHistory
};
