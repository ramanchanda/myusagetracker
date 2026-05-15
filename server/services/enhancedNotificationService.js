const formData = require('form-data');
const Mailgun = require('mailgun.js');
const configService = require('./configService');

// Load nodemailer - handle potential module loading issues
let nodemailer = null;
try {
  const nodeMailerModule = require('nodemailer');

  // Check if it's an ES module with default export
  if (nodeMailerModule && nodeMailerModule.default && typeof nodeMailerModule.default.createTransporter === 'function') {
    nodemailer = nodeMailerModule.default;
    console.log('[Email Service] nodemailer loaded via .default export');
  }
  // Check if it's a direct CommonJS export
  else if (nodeMailerModule && typeof nodeMailerModule.createTransporter === 'function') {
    nodemailer = nodeMailerModule;
    console.log('[Email Service] nodemailer loaded via direct export');
  }
  // Last resort: try to find createTransporter anywhere in the module
  else if (nodeMailerModule) {
    console.log('[Email Service] nodemailer module structure:', Object.keys(nodeMailerModule));
    // Try to find createTransport (without 'er')
    if (typeof nodeMailerModule.createTransport === 'function') {
      console.log('[Email Service] Found createTransport (without er)');
      nodemailer = nodeMailerModule;
    }
  }
} catch (error) {
  console.error('[Email Service] Error loading nodemailer:', error.message);
  console.error('[Email Service] Stack:', error.stack);
}

// Final validation
if (!nodemailer) {
  console.error('[Email Service] CRITICAL: nodemailer could not be loaded!');
} else if (typeof nodemailer.createTransporter !== 'function') {
  console.error('[Email Service] CRITICAL: nodemailer loaded but createTransporter is not available!');
  console.error('[Email Service] Available methods:', Object.keys(nodemailer).filter(k => typeof nodemailer[k] === 'function'));
} else {
  console.log('[Email Service] ✓ nodemailer loaded successfully with createTransporter');
}

let transporter = null;
let mailgunClient = null;

// Initialize Mailgun API client
function initMailgunClient() {
  if (mailgunClient) {
    return mailgunClient;
  }

  // Check for Mailgun API key and domain
  if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    console.log('Initializing Mailgun API client...');
    const mailgun = new Mailgun(formData);
    mailgunClient = mailgun.client({
      username: 'api',
      key: process.env.MAILGUN_API_KEY,
      url: process.env.MAILGUN_API_URL || 'https://api.mailgun.net'
    });
    return mailgunClient;
  }

  return null;
}

// Initialize transporter with Mailgun, MailtoGo or custom SMTP
function initTransporter() {
  if (transporter) {
    return transporter;
  }

  // Check if nodemailer is available
  if (!nodemailer || typeof nodemailer.createTransporter !== 'function') {
    console.error('[Email Service] Cannot initialize transporter: nodemailer not properly loaded');
    throw new Error('nodemailer module not available');
  }

  // Check for Mailgun addon (SMTP fallback if API not available)
  if (process.env.MAILGUN_SMTP_SERVER) {
    console.log('Initializing Mailgun SMTP transporter...');
    transporter = nodemailer.createTransporter({
      host: process.env.MAILGUN_SMTP_SERVER,
      port: parseInt(process.env.MAILGUN_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.MAILGUN_SMTP_LOGIN,
        pass: process.env.MAILGUN_SMTP_PASSWORD
      }
    });
  }
  // Check for MailtoGo addon (Heroku sets these env vars)
  else if (process.env.MAILTOGO_SMTP_HOST) {
    console.log('Initializing MailtoGo SMTP transporter...');
    transporter = nodemailer.createTransporter({
      host: process.env.MAILTOGO_SMTP_HOST,
      port: parseInt(process.env.MAILTOGO_SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.MAILTOGO_SMTP_USER,
        pass: process.env.MAILTOGO_SMTP_PASSWORD
      }
    });
  }
  // Fallback to custom SMTP settings
  else if (process.env.SMTP_HOST) {
    console.log('Initializing custom SMTP transporter...');
    transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  return transporter;
}

// Test email configuration
async function testEmailConfiguration() {
  // Test Mailgun API first
  const mgClient = initMailgunClient();
  if (mgClient && process.env.MAILGUN_DOMAIN) {
    try {
      // Test by getting domain info
      const domain = await mgClient.domains.get(process.env.MAILGUN_DOMAIN);
      return {
        success: true,
        message: 'Mailgun API configuration is valid',
        method: 'mailgun-api',
        domain: domain.name
      };
    } catch (error) {
      console.error('Mailgun API test failed:', error.message);
      console.log('Trying SMTP fallback...');
    }
  }

  // Test SMTP
  const trans = initTransporter();

  if (!trans) {
    throw new Error('Email not configured. Please set MAILGUN_API_KEY + MAILGUN_DOMAIN or configure SMTP settings.');
  }

  try {
    await trans.verify();
    return {
      success: true,
      message: 'SMTP configuration is valid',
      method: 'smtp'
    };
  } catch (error) {
    console.error('Email configuration test failed:', error);
    throw new Error(`Email configuration test failed: ${error.message}`);
  }
}

// Send email with configuration from database
async function sendEmail(subject, htmlContent, recipients = null) {
  const emailConfig = await configService.getEmailConfig();

  if (!emailConfig.enabled) {
    console.log('Email notifications are disabled. Skipping email send.');
    return { sent: false, reason: 'Email notifications disabled' };
  }

  const recipientList = recipients || emailConfig.recipients;

  if (!recipientList || recipientList.length === 0) {
    console.log('No recipients configured. Skipping email send.');
    return { sent: false, reason: 'No recipients configured' };
  }

  // Try Mailgun API first (preferred method)
  const mgClient = initMailgunClient();
  if (mgClient && process.env.MAILGUN_DOMAIN) {
    try {
      console.log('Sending email via Mailgun API...');

      const fromEmail = emailConfig.fromEmail || `postmaster@${process.env.MAILGUN_DOMAIN}`;
      const fromName = emailConfig.fromName || 'Heroku Usage Monitor';

      const messageData = {
        from: `${fromName} <${fromEmail}>`,
        to: recipientList,
        subject: subject,
        html: htmlContent
      };

      const result = await mgClient.messages.create(process.env.MAILGUN_DOMAIN, messageData);
      console.log(`Email sent via Mailgun API: ${subject} to ${recipientList.join(', ')}`);
      console.log('Mailgun response:', result);

      return { sent: true, info: result, recipients: recipientList, method: 'mailgun-api' };
    } catch (error) {
      console.error('Error sending via Mailgun API:', error.message);
      console.error('Mailgun error details:', error.details || error.response?.body || 'No additional details');
      console.log('Falling back to SMTP...');
    }
  }

  // Fallback to SMTP
  let trans;
  try {
    trans = initTransporter();
  } catch (error) {
    console.error('Error initializing SMTP transporter:', error.message);
    return { sent: false, reason: `SMTP initialization failed: ${error.message}` };
  }

  if (!trans) {
    console.log('Email notifications not configured. Skipping email send.');
    return { sent: false, reason: 'Email not configured' };
  }

  const mailOptions = {
    from: `"${emailConfig.fromName || 'Heroku Usage Monitor'}" <${emailConfig.fromEmail || process.env.MAILGUN_SMTP_LOGIN || process.env.MAILTOGO_SMTP_USER || process.env.SMTP_USER}>`,
    to: recipientList.join(', '),
    subject: subject,
    html: htmlContent
  };

  try {
    console.log('Sending email via SMTP...');
    const info = await trans.sendMail(mailOptions);
    console.log(`Email sent via SMTP: ${subject} to ${recipientList.join(', ')}`);
    return { sent: true, info, recipients: recipientList, method: 'smtp' };
  } catch (error) {
    console.error('Error sending email via SMTP:', error.message);
    throw error;
  }
}

// Send threshold alert
async function sendThresholdAlert(resourceType, currentValue, threshold, severity = 'warning') {
  const percentUsed = threshold.limit > 0 ? ((currentValue / threshold.limit) * 100).toFixed(1) : 0;
  const severityColor = severity === 'critical' ? '#d9534f' : '#f0ad4e';
  const severityIcon = severity === 'critical' ? '🚨' : '⚠️';

  const subject = `${severityIcon} Heroku ${resourceType} Usage Alert - ${severity.toUpperCase()}`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background-color: ${severityColor}; color: white; padding: 20px; text-align: center;">
            <h2 style="margin: 0; font-size: 24px;">${severityIcon} Usage Alert</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px;">${resourceType}</p>
          </div>

          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
              Your <strong>${resourceType}</strong> usage has reached <strong>${percentUsed}%</strong> of the configured threshold.
            </p>

            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 6px; border-left: 4px solid ${severityColor};">
              <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">Usage Details</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #666;">Current Usage:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${currentValue.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Configured Limit:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${threshold.limit.toLocaleString()}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Percentage Used:</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${severityColor};">${percentUsed}%</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Warning Threshold:</td>
                  <td style="padding: 8px 0; text-align: right; color: #666;">${threshold.warningPercentage}%</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #666;">Critical Threshold:</td>
                  <td style="padding: 8px 0; text-align: right; color: #666;">${threshold.criticalPercentage}%</td>
                </tr>
              </table>
            </div>

            <div style="margin-top: 25px; padding: 15px; background-color: #e7f3ff; border-radius: 6px;">
              <p style="margin: 0; color: #0066cc; font-size: 14px;">
                <strong>Recommended Action:</strong> ${severity === 'critical'
                  ? 'Immediate action required. Consider increasing your resource limits or optimizing usage.'
                  : 'Monitor your usage closely and consider planning for additional capacity.'}
              </p>
            </div>
          </div>

          <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              This is an automated alert from Heroku Usage Monitor
            </p>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">
              ${new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await sendEmail(subject, htmlContent);

  // Log to history
  if (result.sent) {
    await configService.addAlertToHistory({
      type: 'threshold',
      resourceType,
      currentValue,
      limit: threshold.limit,
      percentUsed: parseFloat(percentUsed),
      severity,
      recipients: result.recipients
    });
  }

  return result;
}

// Send usage summary
async function sendUsageSummary(summaryData, period = 'daily') {
  const periodIcons = {
    daily: '📊',
    weekly: '📈',
    monthly: '📉'
  };

  const subject = `${periodIcons[period] || '📊'} Heroku ${period.charAt(0).toUpperCase() + period.slice(1)} Usage Summary`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 700px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background: linear-gradient(135deg, #6f42c1 0%, #5a31a3 100%); color: white; padding: 30px; text-align: center;">
            <h2 style="margin: 0; font-size: 28px;">${periodIcons[period]} Usage Summary</h2>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">${period.charAt(0).toUpperCase() + period.slice(1)} Report</p>
          </div>

          <div style="padding: 30px;">
            ${Object.entries(summaryData.resources || {}).map(([key, data]) => `
              <div style="margin-bottom: 25px; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #6f42c1;">
                <h3 style="margin: 0 0 15px 0; color: #333; font-size: 18px;">${data.label || key}</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Current Usage:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #333;">${(data.current || 0).toLocaleString()}</td>
                  </tr>
                  ${data.limit ? `
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Limit:</td>
                    <td style="padding: 8px 0; text-align: right; color: #666;">${data.limit.toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #666;">Usage:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: ${data.percentage > 90 ? '#d9534f' : data.percentage > 80 ? '#f0ad4e' : '#5cb85c'};">${data.percentage?.toFixed(1)}%</td>
                  </tr>
                  ` : ''}
                </table>
              </div>
            `).join('')}

            ${summaryData.totalCost ? `
            <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 6px; text-align: center;">
              <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 16px;">Total Usage Cost</h3>
              <p style="margin: 0; font-size: 32px; font-weight: bold; color: #0d47a1;">$${summaryData.totalCost.toFixed(2)}</p>
            </div>
            ` : ''}
          </div>

          <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              Automated ${period} summary from Heroku Usage Monitor
            </p>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">
              ${new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  const result = await sendEmail(subject, htmlContent);

  // Log to history
  if (result.sent) {
    await configService.addAlertToHistory({
      type: 'summary',
      period,
      resourceCount: Object.keys(summaryData.resources || {}).length,
      totalCost: summaryData.totalCost,
      recipients: result.recipients
    });
  }

  return result;
}

// Send test notification
async function sendTestNotification() {
  const subject = '✅ Heroku Usage Monitor - Test Notification';
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <div style="background-color: #5cb85c; color: white; padding: 30px; text-align: center;">
            <h2 style="margin: 0; font-size: 28px;">✅ Test Notification</h2>
          </div>

          <div style="padding: 30px;">
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              This is a test notification from your <strong>Heroku Usage Monitoring System</strong>.
            </p>
            <p style="font-size: 16px; color: #333; line-height: 1.6;">
              If you're receiving this email, your notification system is configured correctly! 🎉
            </p>

            <div style="margin: 25px 0; padding: 20px; background-color: #e7f3ff; border-radius: 6px; border-left: 4px solid #0066cc;">
              <p style="margin: 0; color: #0066cc; font-size: 14px;">
                <strong>✓</strong> Email configuration is working<br>
                <strong>✓</strong> SMTP connection is successful<br>
                <strong>✓</strong> Recipients are configured correctly
              </p>
            </div>
          </div>

          <div style="padding: 20px; background-color: #f8f9fa; border-top: 1px solid #e0e0e0; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 12px;">
              Heroku Usage Monitor - Test Notification
            </p>
            <p style="margin: 5px 0 0 0; color: #999; font-size: 11px;">
              ${new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}
            </p>
          </div>
        </div>
      </body>
    </html>
  `;

  return await sendEmail(subject, htmlContent);
}

module.exports = {
  testEmailConfiguration,
  sendEmail,
  sendThresholdAlert,
  sendUsageSummary,
  sendTestNotification
};
