/**
 * Shared Heroku API Client
 *
 * Centralized HTTP client for Heroku Platform API requests.
 * Provides consistent configuration, authentication, and error handling.
 *
 * Extracted from duplicate implementations across 7 service files
 * to improve maintainability and enable future enhancements
 * (rate limiting, retry logic, connection pooling).
 */

const axios = require('axios');

const HEROKU_API_BASE = 'https://api.heroku.com';

/**
 * Create authenticated Heroku API client
 *
 * @param {string} apiKey - Optional Heroku API token (defaults to env var)
 * @returns {AxiosInstance} Configured axios client
 * @throws {Error} If API key not configured
 */
function createHerokuClient(apiKey) {
  const resolvedApiKey = apiKey || process.env.HEROKU_API_KEY || process.env.HEROKU_API_TOKEN;

  if (!resolvedApiKey || resolvedApiKey === 'your_heroku_api_key_here') {
    throw new Error('HEROKU_API_KEY or HEROKU_API_TOKEN is not configured. Update your .env with a valid Heroku API token.');
  }

  return axios.create({
    baseURL: HEROKU_API_BASE,
    headers: {
      'Accept': 'application/vnd.heroku+json; version=3',
      'Authorization': `Bearer ${resolvedApiKey}`,
      'Content-Type': 'application/json'
    },
    timeout: 30000 // 30 second timeout for API requests
  });
}

module.exports = {
  createHerokuClient,
  HEROKU_API_BASE
};
