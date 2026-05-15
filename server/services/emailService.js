/**
 * Centralized Email Service - Production Grade
 *
 * Features:
 * - Mailgun API (primary)
 * - SMTP fallback
 * - Retry logic
 * - Structured logging
 * - HTML template support
 * - PDF attachment support
 * - Email validation
 */

const formData = require('form-data');
const Mailgun = require('mailgun.js');

// Email configuration validation
function validateEmailConfig() {
  const errors = [];

  // Check Mailgun API configuration
  if (!process.env.MAILGUN_API_KEY) {
    errors.push('MAILGUN_API_KEY not configured');
  } else if (!process.env.MAILGUN_API_KEY.startsWith('key-')) {
    errors.push('MAILGUN_API_KEY appears invalid (should start with "key-")');
  }

  if (!process.env.MAILGUN_DOMAIN) {
    errors.push('MAILGUN_DOMAIN not configured');
  }

  // Check sender email configuration
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
  if (!fromEmail) {
    errors.push('NOTIFICATION_FROM_EMAIL not configured');
  } else if (!fromEmail.includes('@') || !fromEmail.includes('.')) {
    errors.push('NOTIFICATION_FROM_EMAIL appears invalid');
  }

  // Check SMTP fallback configuration
  const hasMailgunSMTP = process.env.MAILGUN_SMTP_SERVER &&
                          process.env.MAILGUN_SMTP_LOGIN &&
                          process.env.MAILGUN_SMTP_PASSWORD;

  const hasCustomSMTP = process.env.SMTP_HOST &&
                        process.env.SMTP_USER &&
                        process.env.SMTP_PASS;

  if (!hasMailgunSMTP && !hasCustomSMTP) {
    errors.push('No SMTP fallback configured (recommended for reliability)');
  }

  return {
    valid: errors.length === 0,
    errors,
    hasAPI: !!process.env.MAILGUN_API_KEY && !!process.env.MAILGUN_DOMAIN,
    hasSMTP: hasMailgunSMTP || hasCustomSMTP
  };
}

// Initialize Mailgun client
let mailgunClient = null;

function getMailgunClient() {
  if (mailgunClient) {
    return mailgunClient;
  }

  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    return null;
  }

  try {
    const mailgun = new Mailgun(formData);
    mailgunClient = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_API_URL || 'https://api.mailgun.net'
    });

    console.log('[Email Service] Mailgun API client initialized');
    return mailgunClient;
  } catch (error) {
    console.error('[Email Service] Failed to initialize Mailgun client:', error.message);
    return null;
  }
}

// Initialize SMTP transporter (lazy-loaded nodemailer)
let nodemailer = null;
let transporter = null;

function loadNodemailer() {
  if (nodemailer) {
    return nodemailer;
  }

  try {
    const nodeMailerModule = require('nodemailer');

    if (nodeMailerModule && nodeMailerModule.default && typeof nodeMailerModule.default.createTransporter === 'function') {
      nodemailer = nodeMailerModule.default;
    } else if (nodeMailerModule && typeof nodeMailerModule.createTransporter === 'function') {
      nodemailer = nodeMailerModule;
    }

    if (nodemailer) {
      console.log('[Email Service] nodemailer loaded successfully');
      return nodemailer;
    }
  } catch (error) {
    console.error('[Email Service] Failed to load nodemailer:', error.message);
  }

  return null;
}

function getSMTPTransporter() {
  if (transporter) {
    return transporter;
  }

  const nm = loadNodemailer();
  if (!nm) {
    return null;
  }

  try {
    // Try Mailgun SMTP first
    if (process.env.MAILGUN_SMTP_SERVER) {
      transporter = nm.createTransporter({
        host: process.env.MAILGUN_SMTP_SERVER,
        port: parseInt(process.env.MAILGUN_SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.MAILGUN_SMTP_LOGIN,
          pass: process.env.MAILGUN_SMTP_PASSWORD
        }
      });
      console.log('[Email Service] Mailgun SMTP transporter initialized');
    }
    // Try custom SMTP
    else if (process.env.SMTP_HOST) {
      transporter = nm.createTransporter({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
      console.log('[Email Service] Custom SMTP transporter initialized');
    }

    return transporter;
  } catch (error) {
    console.error('[Email Service] Failed to initialize SMTP transporter:', error.message);
    return null;
  }
}

/**
 * Send email with automatic provider selection and fallback
 *
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email(s) - string or array
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML body
 * @param {string} options.text - Plain text body (optional)
 * @param {Array} options.attachments - Attachments (optional)
 * @param {number} options.retries - Number of retries (default: 2)
 * @returns {Promise<Object>} Send result
 */
async function sendEmail(options) {
  const {
    to,
    subject,
    html,
    text,
    attachments = [],
    retries = 2
  } = options;

  // Validate inputs
  if (!to || !subject || !html) {
    throw new Error('Missing required fields: to, subject, html');
  }

  const recipients = Array.isArray(to) ? to : [to];
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || `postmaster@${process.env.MAILGUN_DOMAIN}`;
  const fromName = process.env.NOTIFICATION_FROM_NAME || 'Heroku Usage Tracker';
  const from = `${fromName} <${fromEmail}>`;

  const logData = {
    recipients: recipients.join(', '),
    subject,
    timestamp: new Date().toISOString()
  };

  let lastError = null;

  // Try Mailgun API first (preferred)
  for (let attempt = 0; attempt <= retries; attempt++) {
    const client = getMailgunClient();

    if (client && process.env.MAILGUN_DOMAIN) {
      try {
        console.log('[Email Service] Attempting Mailgun API...', {
          ...logData,
          provider: 'mailgun-api',
          attempt: attempt + 1
        });

        const messageData = {
          from,
          to: recipients,
          subject,
          html,
          text: text || undefined,
          attachment: attachments.length > 0 ? attachments : undefined
        };

        const result = await client.messages.create(process.env.MAILGUN_DOMAIN, messageData);

        console.log('[Email Service] ✓ Success', {
          ...logData,
          provider: 'mailgun-api',
          messageId: result.id,
          success: true
        });

        return {
          success: true,
          provider: 'mailgun-api',
          messageId: result.id,
          recipients
        };
      } catch (error) {
        lastError = error;
        console.error('[Email Service] Mailgun API failed', {
          ...logData,
          provider: 'mailgun-api',
          attempt: attempt + 1,
          error: error.message,
          details: error.details || error.response?.body || 'No additional details'
        });

        // Don't retry on authentication errors
        if (error.status === 401 || error.status === 403) {
          break;
        }

        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    } else {
      break; // No Mailgun API available
    }
  }

  // Fallback to SMTP
  for (let attempt = 0; attempt <= retries; attempt++) {
    const smtp = getSMTPTransporter();

    if (smtp) {
      try {
        console.log('[Email Service] Attempting SMTP fallback...', {
          ...logData,
          provider: 'smtp',
          attempt: attempt + 1
        });

        const mailOptions = {
          from,
          to: recipients.join(', '),
          subject,
          html,
          text: text || undefined,
          attachments: attachments.length > 0 ? attachments : undefined
        };

        const result = await smtp.sendMail(mailOptions);

        console.log('[Email Service] ✓ Success', {
          ...logData,
          provider: 'smtp',
          messageId: result.messageId,
          success: true
        });

        return {
          success: true,
          provider: 'smtp',
          messageId: result.messageId,
          recipients
        };
      } catch (error) {
        lastError = error;
        console.error('[Email Service] SMTP failed', {
          ...logData,
          provider: 'smtp',
          attempt: attempt + 1,
          error: error.message
        });

        // Wait before retry
        if (attempt < retries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
        }
      }
    } else {
      break; // No SMTP available
    }
  }

  // All attempts failed
  console.error('[Email Service] ✗ All providers failed', {
    ...logData,
    success: false,
    finalError: lastError?.message
  });

  throw new Error(`Failed to send email after all retries: ${lastError?.message}`);
}

/**
 * Test email configuration
 */
async function testEmailConfiguration() {
  const validation = validateEmailConfig();

  if (!validation.valid) {
    return {
      success: false,
      errors: validation.errors,
      recommendations: [
        'Set MAILGUN_API_KEY and MAILGUN_DOMAIN for primary delivery',
        'Set NOTIFICATION_FROM_EMAIL to a verified sender address',
        'Configure SMTP settings as fallback for reliability'
      ]
    };
  }

  // Test Mailgun API
  if (validation.hasAPI) {
    try {
      const client = getMailgunClient();
      const domain = await client.domains.get(process.env.MAILGUN_DOMAIN);
      return {
        success: true,
        method: 'mailgun-api',
        domain: domain.name,
        state: domain.state,
        warnings: domain.state !== 'active' ? ['Domain is not in active state'] : []
      };
    } catch (error) {
      console.error('[Email Service] Mailgun API test failed:', error.message);
    }
  }

  // Test SMTP
  if (validation.hasSMTP) {
    try {
      const smtp = getSMTPTransporter();
      if (smtp) {
        await smtp.verify();
        return {
          success: true,
          method: 'smtp',
          warnings: ['Using SMTP fallback - Mailgun API recommended for better deliverability']
        };
      }
    } catch (error) {
      console.error('[Email Service] SMTP test failed:', error.message);
    }
  }

  return {
    success: false,
    errors: ['Email configuration test failed'],
    details: validation
  };
}

/**
 * Get email service status
 */
function getServiceStatus() {
  const validation = validateEmailConfig();
  const hasMailgunAPI = !!getMailgunClient();
  const hasSMTP = !!getSMTPTransporter();

  return {
    configured: validation.valid,
    providers: {
      mailgunAPI: hasMailgunAPI,
      smtp: hasSMTP
    },
    validation,
    recommendations: [
      'Verify your domain in Mailgun dashboard',
      'Configure SPF, DKIM, and DMARC records',
      'Use a custom verified domain instead of sandbox domain',
      'Set up SMTP as fallback for reliability'
    ]
  };
}

module.exports = {
  sendEmail,
  testEmailConfiguration,
  validateEmailConfig,
  getServiceStatus
};
