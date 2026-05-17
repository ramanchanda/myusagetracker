/**
 * Notification History Service (PostgreSQL)
 *
 * Persistent notification event history backed by PostgreSQL.
 * Stores delivery status, provider used, timestamps, and metadata.
 * Survives dyno restarts, deployments, and crashes.
 */

const db = require('./databaseService');

const LOG_PREFIX = '[Notification History DB]';

/**
 * Create notification record in database
 * Called BEFORE email delivery attempt
 *
 * @param {Object} event - Notification event
 * @returns {Object} Created record with id
 */
async function createNotificationRecord(event) {
  try {
    const {
      accountId,
      accountName,
      type,
      severity,
      subject,
      recipients = [],
      provider,
      status = 'queued',
      resourceSummary = {},
      criticalCount = 0,
      warningCount = 0,
      metadata = {}
    } = event;

    const recipient = Array.isArray(recipients) ? recipients.join(', ') : recipients;

    const query = `
      INSERT INTO notification_history (
        account_id,
        account_name,
        notification_type,
        severity,
        subject,
        recipient,
        provider,
        status,
        resource_summary,
        critical_count,
        warning_count,
        metadata,
        triggered_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      RETURNING id, created_at
    `;

    const values = [
      accountId,
      accountName,
      type,
      severity,
      subject,
      recipient,
      provider,
      status,
      JSON.stringify(resourceSummary),
      criticalCount,
      warningCount,
      JSON.stringify(metadata)
    ];

    const result = await db.query(query, values);
    const record = result.rows[0];

    console.log(`${LOG_PREFIX} Created notification record ID: ${record.id} for ${accountName || 'unknown'}`);

    return {
      id: record.id,
      createdAt: record.created_at
    };

  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to create notification record:`, error.message);
    console.error(`${LOG_PREFIX} Query values:`, JSON.stringify(values, null, 2));
    console.error(`${LOG_PREFIX} Error stack:`, error.stack);
    // Don't throw - allow notification delivery to continue even if DB fails
    return null;
  }
}

/**
 * Update notification delivery status
 * Called AFTER email delivery attempt
 */
async function updateNotificationStatus(id, updates) {
  try {
    const {
      status,
      provider,
      messageId,
      error,
      deliveredAt
    } = updates;

    const query = `
      UPDATE notification_history
      SET
        status = COALESCE($2, status),
        provider = COALESCE($3, provider),
        metadata = jsonb_set(
          COALESCE(metadata, '{}'::jsonb),
          '{messageId}',
          to_jsonb($4::text)
        ),
        metadata = CASE WHEN $5 IS NOT NULL THEN
          jsonb_set(metadata, '{error}', to_jsonb($5::text))
        ELSE metadata END,
        delivered_at = COALESCE($6, delivered_at),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    const values = [
      id,
      status,
      provider,
      messageId,
      error,
      deliveredAt
    ];

    const result = await db.query(query, values);

    if (result.rowCount > 0) {
      console.log(`${LOG_PREFIX} Updated notification record ID: ${id} to status: ${status}`);
    }

  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to update notification status:`, error.message);
    // Don't throw - log error but don't crash
  }
}

/**
 * Add notification event (backward compatible interface)
 * Creates record and updates if messageId provided
 */
async function addEvent(event) {
  try {
    console.log(`${LOG_PREFIX} Inserting notification`, {
      accountName: event.accountName,
      type: event.type,
      severity: event.severity,
      subject: event.subject?.substring(0, 50),
      status: event.status || 'sent'
    });

    const record = await createNotificationRecord({
      accountId: event.accountId,
      accountName: event.accountName,
      type: event.type,
      severity: event.severity,
      subject: event.subject,
      recipients: event.recipients,
      provider: event.provider,
      status: event.status || 'sent',
      resourceSummary: event.resourceSummary || {},
      criticalCount: event.criticalCount || event.metadata?.criticalCount || 0,
      warningCount: event.warningCount || event.metadata?.warningCount || 0,
      metadata: event.metadata || {}
    });

    if (!record) {
      console.error(`${LOG_PREFIX} Insert failed - createNotificationRecord returned null`);
      return null;
    }

    console.log(`${LOG_PREFIX} Notification persisted successfully (ID: ${record.id})`);

    if (record && event.messageId) {
      await updateNotificationStatus(record.id, {
        status: event.status || 'sent',
        messageId: event.messageId,
        error: event.error,
        deliveredAt: new Date()
      });
    }

    return record;

  } catch (error) {
    console.error(`${LOG_PREFIX} Insert failed:`, error.message);
    console.error(`${LOG_PREFIX} Stack trace:`, error.stack);
    return null;
  }
}

/**
 * Get recent notification history with pagination
 */
async function getHistory(options = {}) {
  try {
    const {
      limit = 50,
      offset = 0,
      status,
      type,
      accountId,
      startDate,
      endDate
    } = options;

    let whereConditions = [];
    let values = [];
    let valueIndex = 1;

    if (status) {
      whereConditions.push(`status = $${valueIndex++}`);
      values.push(status);
    }

    if (type) {
      whereConditions.push(`notification_type = $${valueIndex++}`);
      values.push(type);
    }

    if (accountId) {
      whereConditions.push(`account_id = $${valueIndex++}`);
      values.push(accountId);
    }

    if (startDate) {
      whereConditions.push(`created_at >= $${valueIndex++}`);
      values.push(startDate);
    }

    if (endDate) {
      whereConditions.push(`created_at <= $${valueIndex++}`);
      values.push(endDate);
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    const query = `
      SELECT
        id,
        account_id,
        account_name,
        notification_type as type,
        severity,
        subject,
        recipient,
        provider,
        status,
        resource_summary,
        critical_count,
        warning_count,
        metadata,
        triggered_at,
        delivered_at,
        created_at as timestamp
      FROM notification_history
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${valueIndex++} OFFSET $${valueIndex++}
    `;

    values.push(limit, offset);

    const result = await db.query(query, values);

    // Parse JSON fields
    const history = result.rows.map(row => ({
      ...row,
      resource_summary: typeof row.resource_summary === 'string'
        ? JSON.parse(row.resource_summary)
        : row.resource_summary,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata
    }));

    console.log(`${LOG_PREFIX} Retrieved ${history.length} notification records`);

    return history;

  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get history:`, error.message);
    return [];
  }
}

/**
 * Get notification statistics
 */
async function getStatistics(options = {}) {
  try {
    const { days = 30 } = options;

    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'sent') as sent,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE status = 'queued') as queued,
        ROUND(
          COUNT(*) FILTER (WHERE status = 'sent')::numeric /
          NULLIF(COUNT(*), 0) * 100,
          1
        ) as success_rate
      FROM notification_history
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `;

    const result = await db.query(query);
    const stats = result.rows[0];

    return {
      total: parseInt(stats.total),
      sent: parseInt(stats.sent),
      failed: parseInt(stats.failed),
      queued: parseInt(stats.queued),
      successRate: parseFloat(stats.success_rate) || 0
    };

  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get statistics:`, error.message);
    return {
      total: 0,
      sent: 0,
      failed: 0,
      queued: 0,
      successRate: 0
    };
  }
}

/**
 * Get single notification event by ID
 */
async function getEvent(id) {
  try {
    const query = `
      SELECT
        id,
        account_id,
        account_name,
        notification_type as type,
        severity,
        subject,
        recipient,
        provider,
        status,
        resource_summary,
        critical_count,
        warning_count,
        metadata,
        triggered_at,
        delivered_at,
        created_at as timestamp
      FROM notification_history
      WHERE id = $1
    `;

    const result = await db.query(query, [id]);

    if (result.rows.length === 0) {
      return null;
    }

    const event = result.rows[0];

    // Parse JSON fields
    return {
      ...event,
      resource_summary: typeof event.resource_summary === 'string'
        ? JSON.parse(event.resource_summary)
        : event.resource_summary,
      metadata: typeof event.metadata === 'string'
        ? JSON.parse(event.metadata)
        : event.metadata
    };

  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get event ${id}:`, error.message);
    return null;
  }
}

/**
 * Cleanup old notification records
 * Called by scheduled job
 */
async function clearOldHistory(days = 90) {
  try {
    const query = `
      DELETE FROM notification_history
      WHERE created_at < NOW() - INTERVAL '${days} days'
      RETURNING id
    `;

    const result = await db.query(query);
    const deletedCount = result.rowCount;

    console.log(`${LOG_PREFIX} Cleaned up ${deletedCount} old notification records (>${days} days)`);

    return {
      deleted: deletedCount,
      retentionDays: days
    };

  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to cleanup old history:`, error.message);
    return {
      deleted: 0,
      error: error.message
    };
  }
}

module.exports = {
  createNotificationRecord,
  updateNotificationStatus,
  addEvent,
  getHistory,
  getStatistics,
  getEvent,
  clearOldHistory
};
