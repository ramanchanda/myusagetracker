/**
 * Notification History Persistence
 *
 * JSON-based persistence for notification event history.
 * Stores delivery status, provider used, timestamps, and metadata.
 *
 * Future: Migrate to database (PostgreSQL, SQLite) for production scale
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('../config/notificationConfig');

const LOG_PREFIX = config.LOGGING.PREFIXES.HISTORY;
const HISTORY_FILE = path.join(__dirname, '../data/notification-history.json');
const MAX_HISTORY_SIZE = config.HISTORY_PERSISTENCE.MAX_EVENTS;

/**
 * Ensure data directory exists
 */
async function ensureDataDirectory() {
  const dataDir = path.dirname(HISTORY_FILE);
  try {
    await fs.mkdir(dataDir, { recursive: true });
  } catch (error) {
    // Directory exists
  }
}

/**
 * Load history from file
 */
async function loadHistory() {
  try {
    await ensureDataDirectory();
    const data = await fs.readFile(HISTORY_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is empty
    return [];
  }
}

/**
 * Save history to file
 */
async function saveHistory(history) {
  try {
    await ensureDataDirectory();

    // Keep only last MAX_HISTORY_SIZE events
    if (history.length > MAX_HISTORY_SIZE) {
      history = history.slice(-MAX_HISTORY_SIZE);
    }

    await fs.writeFile(HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to save:`, error.message);
  }
}

/**
 * Add notification event to history
 *
 * @param {Object} event - Notification event
 * @param {string} event.type - Event type (threshold-alert, summary, test, anomaly)
 * @param {string} event.severity - Severity (warning, critical, info)
 * @param {string} event.resourceType - Resource type (for threshold alerts)
 * @param {Array<string>} event.recipients - Email recipients
 * @param {string} event.subject - Email subject
 * @param {string} event.provider - Email provider (mailgun-api, smtp)
 * @param {string} event.status - Delivery status (queued, sent, failed)
 * @param {string} event.messageId - Provider message ID
 * @param {string} event.error - Error message (if failed)
 * @param {Object} event.metadata - Additional metadata
 */
async function addEvent(event) {
  try {
    const history = await loadHistory();

    const entry = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString(),
      type: event.type || 'unknown',
      severity: event.severity || 'info',
      resourceType: event.resourceType || null,
      recipients: event.recipients || [],
      subject: event.subject || null,
      provider: event.provider || null,
      status: event.status || 'queued',
      messageId: event.messageId || null,
      error: event.error || null,
      metadata: event.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    history.push(entry);
    await saveHistory(history);

    return entry;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to add event:`, error.message);
    throw error;
  }
}

/**
 * Update event status (for async processing)
 */
async function updateEventStatus(eventId, status, updates = {}) {
  try {
    const history = await loadHistory();
    const event = history.find(e => e.id === eventId);

    if (!event) {
      throw new Error(`Event ${eventId} not found`);
    }

    event.status = status;
    event.updatedAt = new Date().toISOString();

    // Update additional fields
    if (updates.provider) event.provider = updates.provider;
    if (updates.messageId) event.messageId = updates.messageId;
    if (updates.error) event.error = updates.error;
    if (updates.metadata) {
      event.metadata = { ...event.metadata, ...updates.metadata };
    }

    await saveHistory(history);

    return event;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to update event:`, error.message);
    throw error;
  }
}

/**
 * Get notification history with filters
 */
async function getHistory(options = {}) {
  try {
    let history = await loadHistory();

    // Filter by type
    if (options.type) {
      history = history.filter(e => e.type === options.type);
    }

    // Filter by status
    if (options.status) {
      history = history.filter(e => e.status === options.status);
    }

    // Filter by resource type
    if (options.resourceType) {
      history = history.filter(e => e.resourceType === options.resourceType);
    }

    // Filter by date range
    if (options.since) {
      const since = new Date(options.since);
      history = history.filter(e => new Date(e.timestamp) >= since);
    }

    if (options.until) {
      const until = new Date(options.until);
      history = history.filter(e => new Date(e.timestamp) <= until);
    }

    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Limit results
    if (options.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get history:`, error.message);
    return [];
  }
}

/**
 * Get event by ID
 */
async function getEvent(eventId) {
  try {
    const history = await loadHistory();
    return history.find(e => e.id === eventId) || null;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get event:`, error.message);
    return null;
  }
}

/**
 * Get statistics
 */
async function getStatistics(options = {}) {
  try {
    const history = await getHistory(options);

    const stats = {
      total: history.length,
      byStatus: {},
      byType: {},
      bySeverity: {},
      byProvider: {},
      successRate: 0,
      avgDeliveryTime: null
    };

    history.forEach(event => {
      // Count by status
      stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;

      // Count by type
      stats.byType[event.type] = (stats.byType[event.type] || 0) + 1;

      // Count by severity
      if (event.severity) {
        stats.bySeverity[event.severity] = (stats.bySeverity[event.severity] || 0) + 1;
      }

      // Count by provider
      if (event.provider) {
        stats.byProvider[event.provider] = (stats.byProvider[event.provider] || 0) + 1;
      }
    });

    // Calculate success rate
    const sent = stats.byStatus.sent || 0;
    const failed = stats.byStatus.failed || 0;
    const total = sent + failed;
    if (total > 0) {
      stats.successRate = ((sent / total) * 100).toFixed(2);
    }

    return stats;
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to get statistics:`, error.message);
    return null;
  }
}

/**
 * Clear old history (keep last N days)
 */
async function clearOldHistory(daysToKeep = 30) {
  try {
    const history = await loadHistory();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const filtered = history.filter(e => new Date(e.timestamp) >= cutoffDate);

    await saveHistory(filtered);

    const removed = history.length - filtered.length;
    console.log(`${LOG_PREFIX} Cleared ${removed} old events (kept last ${daysToKeep} days)`);

    return { removed, remaining: filtered.length };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to clear old history:`, error.message);
    throw error;
  }
}

/**
 * Delete all history
 */
async function clearAllHistory() {
  try {
    await saveHistory([]);
    console.log(`${LOG_PREFIX} All history cleared`);
    return { success: true };
  } catch (error) {
    console.error(`${LOG_PREFIX} Failed to clear all history:`, error.message);
    throw error;
  }
}

module.exports = {
  addEvent,
  updateEventStatus,
  getHistory,
  getEvent,
  getStatistics,
  clearOldHistory,
  clearAllHistory
};
