/**
 * Notification Configuration Database Service
 * Manages notification settings in PostgreSQL
 */

const db = require('./databaseService');

/**
 * Initialize notification config table
 */
async function initializeSchema() {
  const schemaPath = require('path').join(__dirname, '../database/schema/notification_config.sql');
  const fs = require('fs');
  const schema = fs.readFileSync(schemaPath, 'utf8');

  const client = await db.getClient();
  try {
    await client.query(schema);
    console.log('[NotificationConfigDB] Schema initialized');
  } finally {
    client.release();
  }
}

/**
 * Get notification configuration
 * @param {string} configKey - Config key (default: 'main')
 * @returns {Promise<Object>} Configuration object
 */
async function getConfig(configKey = 'main') {
  try {
    const result = await db.query(
      'SELECT config_value, updated_at, updated_by FROM notification_config WHERE config_key = $1',
      [configKey]
    );

    if (result.rows.length > 0) {
      return {
        ...result.rows[0].config_value,
        _metadata: {
          updated_at: result.rows[0].updated_at,
          updated_by: result.rows[0].updated_by
        }
      };
    }

    // Return default config if not found
    return getDefaultConfig();
  } catch (error) {
    console.error('[NotificationConfigDB] Error fetching config:', error);
    throw error;
  }
}

/**
 * Save notification configuration
 * @param {Object} config - Configuration object
 * @param {string} updatedBy - Username/email of updater
 * @param {string} configKey - Config key (default: 'main')
 * @returns {Promise<Object>} Saved configuration
 */
async function saveConfig(config, updatedBy = 'system', configKey = 'main') {
  try {
    // Remove metadata before saving
    const cleanConfig = { ...config };
    delete cleanConfig._metadata;

    const result = await db.query(`
      INSERT INTO notification_config (config_key, config_value, updated_by, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (config_key)
      DO UPDATE SET
        config_value = EXCLUDED.config_value,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING config_value, updated_at, updated_by
    `, [configKey, JSON.stringify(cleanConfig), updatedBy]);

    console.log(`[NotificationConfigDB] Config saved by ${updatedBy}`);

    return {
      ...result.rows[0].config_value,
      _metadata: {
        updated_at: result.rows[0].updated_at,
        updated_by: result.rows[0].updated_by
      }
    };
  } catch (error) {
    console.error('[NotificationConfigDB] Error saving config:', error);
    throw error;
  }
}

/**
 * Get configuration history (useful for audit trail)
 * @param {string} configKey - Config key (default: 'main')
 * @returns {Promise<Array>} History of config changes
 */
async function getConfigHistory(configKey = 'main') {
  // For now, just return current config
  // In future, could add a separate history table
  try {
    const result = await db.query(
      'SELECT config_value, updated_at, updated_by FROM notification_config WHERE config_key = $1',
      [configKey]
    );

    return result.rows.map(row => ({
      config: row.config_value,
      updated_at: row.updated_at,
      updated_by: row.updated_by
    }));
  } catch (error) {
    console.error('[NotificationConfigDB] Error fetching history:', error);
    return [];
  }
}

/**
 * Default configuration structure
 * Note: License thresholds are stored in enterprise_license_config table, not here
 */
function getDefaultConfig() {
  return {
    schedulingEnabled: true, // Master toggle - controls clock dyno scaling
    emailConfig: {
      enabled: false,
      provider: "mailgun",
      recipients: [],
      fromName: "Heroku Usage Monitor",
      fromEmail: ""
    },
    triggerSchedule: {
      dailySummary: {
        enabled: false,
        time: "09:00",
        timezone: "UTC"
      },
      weeklySummary: {
        enabled: false,
        dayOfWeek: "Monday",
        time: "09:00",
        timezone: "UTC"
      },
      monthlySummary: {
        enabled: false,
        dayOfMonth: 1,
        time: "09:00",
        timezone: "UTC"
      },
      realtimeAlerts: {
        enabled: true,
        checkIntervalMinutes: 60
      }
    },
    cooldownPeriod: {
      enabled: true,
      durationMinutes: 60
    }
  };
}

module.exports = {
  initializeSchema,
  getConfig,
  saveConfig,
  getConfigHistory,
  getDefaultConfig
};
