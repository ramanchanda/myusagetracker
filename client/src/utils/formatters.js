/**
 * Centralized formatting utilities for the Heroku Usage Tracker
 * Ensures consistent number formatting across the application
 */

/**
 * Format a number with maximum 2 decimal places
 * - Removes floating point precision errors (6.220000001 → 6.22)
 * - Removes trailing zeros (6.00 → 6, 6.50 → 6.5)
 * - Handles null/undefined gracefully
 *
 * @param {number|string|null|undefined} value - The value to format
 * @param {number} maxDecimals - Maximum decimal places (default: 2)
 * @returns {string} Formatted number string
 */
export function formatNumber(value, maxDecimals = 2) {
  if (value === null || value === undefined || value === '') {
    return '0';
  }

  const num = Number(value);

  if (isNaN(num)) {
    return '0';
  }

  // Use toFixed to handle floating point precision
  // Then parseFloat to remove trailing zeros
  return parseFloat(num.toFixed(maxDecimals)).toString();
}

/**
 * Format a currency value with $ prefix
 *
 * @param {number|string|null|undefined} value - The value to format
 * @param {number} maxDecimals - Maximum decimal places (default: 2)
 * @returns {string} Formatted currency string (e.g., "$123.45")
 */
export function formatCurrency(value, maxDecimals = 2) {
  const formatted = formatNumber(value, maxDecimals);
  return `$${formatted}`;
}

/**
 * Format a large number with comma separators
 *
 * @param {number|string|null|undefined} value - The value to format
 * @param {number} maxDecimals - Maximum decimal places (default: 2)
 * @returns {string} Formatted number with commas (e.g., "1,234.56")
 */
export function formatNumberWithCommas(value, maxDecimals = 2) {
  const formatted = formatNumber(value, maxDecimals);
  const [integer, decimal] = formatted.split('.');

  const integerWithCommas = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  return decimal !== undefined ? `${integerWithCommas}.${decimal}` : integerWithCommas;
}

/**
 * Format a usage value (cost or units)
 * - Uses comma separators for readability
 * - Ensures consistent decimal precision
 *
 * @param {number|string|null|undefined} value - The value to format
 * @param {number} maxDecimals - Maximum decimal places (default: 2)
 * @returns {string} Formatted usage value
 */
export function formatUsage(value, maxDecimals = 2) {
  return formatNumberWithCommas(value, maxDecimals);
}

/**
 * Format a percentage value
 *
 * @param {number|string|null|undefined} value - The value to format (as decimal, e.g., 0.75 for 75%)
 * @param {number} maxDecimals - Maximum decimal places (default: 1)
 * @returns {string} Formatted percentage string (e.g., "75%")
 */
export function formatPercentage(value, maxDecimals = 1) {
  if (value === null || value === undefined || value === '') {
    return '0%';
  }

  const num = Number(value);

  if (isNaN(num)) {
    return '0%';
  }

  const percentage = num * 100;
  const formatted = parseFloat(percentage.toFixed(maxDecimals));

  return `${formatted}%`;
}

/**
 * Format utilization ratio (used/limit)
 *
 * @param {number} used - Current usage
 * @param {number} limit - Maximum limit
 * @returns {string} Formatted ratio string (e.g., "75 / 100")
 */
export function formatUtilization(used, limit) {
  const formattedUsed = formatNumber(used);
  const formattedLimit = formatNumber(limit);

  return `${formattedUsed} / ${formattedLimit}`;
}

/**
 * Calculate and format utilization percentage
 *
 * @param {number} used - Current usage
 * @param {number} limit - Maximum limit
 * @returns {number} Percentage as decimal (can exceed 1.0 for overages)
 */
export function calculateUtilizationPercentage(used, limit) {
  if (!limit || limit === 0) {
    return 0;
  }

  return used / limit;
}

/**
 * Get utilization status based on percentage
 *
 * @param {number} percentage - Utilization as decimal (0-1 range)
 * @param {number} warningThreshold - Warning threshold (default: 0.8)
 * @param {number} criticalThreshold - Critical threshold (default: 0.95)
 * @returns {'normal'|'warning'|'critical'} Status category
 */
export function getUtilizationStatus(percentage, warningThreshold = 0.8, criticalThreshold = 0.95) {
  if (percentage >= criticalThreshold) {
    return 'critical';
  }
  if (percentage >= warningThreshold) {
    return 'warning';
  }
  return 'normal';
}
