/**
 * Enterprise License Configuration Service
 * Manages per-Enterprise Account license limits and thresholds
 */

const db = require('./databaseService');

/**
 * Initialize enterprise license config table
 */
async function initializeSchema() {
  const client = await db.getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS enterprise_license_config (
        id SERIAL PRIMARY KEY,
        account_id TEXT UNIQUE NOT NULL,
        account_name TEXT NOT NULL,
        dyno_units_limit NUMERIC DEFAULT 0,
        connect_rows_limit NUMERIC DEFAULT 0,
        data_addons_limit NUMERIC DEFAULT 0,
        general_addons_limit NUMERIC DEFAULT 0,
        private_spaces_limit NUMERIC DEFAULT 0,
        shield_spaces_limit NUMERIC DEFAULT 0,
        warning_percentage NUMERIC DEFAULT 80,
        critical_percentage NUMERIC DEFAULT 95,
        is_active BOOLEAN DEFAULT true,
        updated_by TEXT,
        updated_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_enterprise_license_account_id
        ON enterprise_license_config(account_id);

      CREATE INDEX IF NOT EXISTS idx_enterprise_license_active
        ON enterprise_license_config(is_active) WHERE is_active = true;
    `);
    console.log('[EnterpriseLicense] Schema initialized');
  } finally {
    client.release();
  }
}

/**
 * Get license config for a specific enterprise account
 * Falls back to environment variables if no DB config exists
 */
async function getLicenseConfig(accountId) {
  const client = await db.getPool().connect();
  try {
    const result = await client.query(
      'SELECT * FROM enterprise_license_config WHERE account_id = $1 AND is_active = true',
      [accountId]
    );

    if (result.rows.length > 0) {
      console.log(`[EnterpriseLicense] Using DB config for account: ${accountId}`);
      return result.rows[0];
    }

    // Fallback to environment variables (legacy compatibility)
    console.log(`[EnterpriseLicense] No DB config found for ${accountId}, using env var fallback`);
    return getEnvFallbackConfig(accountId);
  } finally {
    client.release();
  }
}

/**
 * Get license configs for all enterprise accounts
 */
async function getAllLicenseConfigs() {
  const client = await db.getPool().connect();
  try {
    const result = await client.query(
      'SELECT * FROM enterprise_license_config WHERE is_active = true ORDER BY account_name'
    );
    return result.rows;
  } finally {
    client.release();
  }
}

/**
 * Create or update license config for an enterprise account
 */
async function upsertLicenseConfig(config, updatedBy) {
  const client = await db.getPool().connect();
  try {
    const result = await client.query(`
      INSERT INTO enterprise_license_config (
        account_id, account_name,
        dyno_units_limit, connect_rows_limit,
        data_addons_limit, general_addons_limit,
        private_spaces_limit, shield_spaces_limit,
        warning_percentage, critical_percentage,
        updated_by, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
      ON CONFLICT (account_id)
      DO UPDATE SET
        account_name = EXCLUDED.account_name,
        dyno_units_limit = EXCLUDED.dyno_units_limit,
        connect_rows_limit = EXCLUDED.connect_rows_limit,
        data_addons_limit = EXCLUDED.data_addons_limit,
        general_addons_limit = EXCLUDED.general_addons_limit,
        private_spaces_limit = EXCLUDED.private_spaces_limit,
        shield_spaces_limit = EXCLUDED.shield_spaces_limit,
        warning_percentage = EXCLUDED.warning_percentage,
        critical_percentage = EXCLUDED.critical_percentage,
        updated_by = EXCLUDED.updated_by,
        updated_at = NOW()
      RETURNING *
    `, [
      config.account_id,
      config.account_name,
      config.dyno_units_limit || 0,
      config.connect_rows_limit || 0,
      config.data_addons_limit || 0,
      config.general_addons_limit || 0,
      config.private_spaces_limit || 0,
      config.shield_spaces_limit || 0,
      config.warning_percentage || 80,
      config.critical_percentage || 95,
      updatedBy
    ]);

    console.log(`[EnterpriseLicense] Saved config for account: ${config.account_id} by ${updatedBy}`);
    return result.rows[0];
  } finally {
    client.release();
  }
}

/**
 * Fallback to environment variable config (legacy compatibility)
 */
function getEnvFallbackConfig(accountId) {
  return {
    account_id: accountId,
    account_name: accountId,
    dyno_units_limit: parseFloat(process.env.LICENSE_DYNO_UNITS_LIMIT || 0),
    connect_rows_limit: parseFloat(process.env.LICENSE_CONNECT_ROWS_LIMIT || 0),
    data_addons_limit: parseFloat(process.env.LICENSE_DATA_ADDONS_LIMIT || 0),
    general_addons_limit: parseFloat(process.env.LICENSE_GENERAL_ADDONS_LIMIT || 0),
    private_spaces_limit: parseFloat(process.env.LICENSE_PRIVATE_SPACES_LIMIT || 0),
    shield_spaces_limit: parseFloat(process.env.LICENSE_SHIELD_SPACES_LIMIT || 0),
    warning_percentage: parseFloat(process.env.LICENSE_WARNING_THRESHOLD || 80),
    critical_percentage: parseFloat(process.env.LICENSE_CRITICAL_THRESHOLD || 95),
    is_active: true,
    source: 'env_fallback'
  };
}

/**
 * Get license config with computed utilization status
 */
async function getLicenseConfigWithStatus(accountId, currentUsage) {
  const config = await getLicenseConfig(accountId);

  const resources = [
    { type: 'dynoUnits', current: currentUsage.totalDynos, limit: config.dyno_units_limit },
    { type: 'connectRows', current: currentUsage.totalConnect, limit: config.connect_rows_limit },
    { type: 'dataAddons', current: currentUsage.totalDataAddons, limit: config.data_addons_limit },
    { type: 'generalAddons', current: currentUsage.totalOtherAddons, limit: config.general_addons_limit },
    { type: 'privateSpaces', current: currentUsage.totalPrivateSpaces, limit: config.private_spaces_limit },
    { type: 'shieldSpaces', current: currentUsage.totalShieldSpaces, limit: config.shield_spaces_limit }
  ];

  // Compute max utilization
  let maxUtil = 0;
  resources.forEach(r => {
    if (r.limit > 0) {
      const util = (r.current / r.limit) * 100;
      if (util > maxUtil) maxUtil = util;
    }
  });

  // Determine status
  let status = 'LICENSE OK';
  if (maxUtil > 100) status = 'OVERAGE';
  else if (maxUtil >= config.critical_percentage) status = 'CRITICAL';
  else if (maxUtil >= config.warning_percentage) status = 'WARNING';

  return {
    ...config,
    status,
    maxUtilization: maxUtil.toFixed(1)
  };
}

module.exports = {
  initializeSchema,
  getLicenseConfig,
  getAllLicenseConfigs,
  upsertLicenseConfig,
  getLicenseConfigWithStatus
};
