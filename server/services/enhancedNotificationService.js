const nodemailer = require('nodemailer');
const configService = require('./configService');

let transporter = null;

// Initialize transporter with Mailgun, MailtoGo or custom SMTP
function initTransporter() {
  if (transporter) {
    return transporter;
  }

  // Check for Mailgun addon first (Heroku sets these env vars)
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
  const trans = initTransporter();

  if (!trans) {
    throw new Error('Email transporter not configured. Please configure MailtoGo or SMTP settings.');
  }

  try {
    await trans.verify();
    return { success: true, message: 'Email configuration is valid' };
  } catch (error) {
    console.error('Email configuration test failed:', error);
    throw new Error(`Email configuration test failed: ${error.message}`);
  }
}

// Send email with configuration from database
async function sendEmail(subject, htmlContent, recipients = null) {
  const trans = initTransporter();

  if (!trans) {
    console.log('Email notifications not configured. Skipping email send.');
    return { sent: false, reason: 'Email not configured' };
  }

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

  const mailOptions = {
    from: `"${emailConfig.fromName || 'Heroku Usage Monitor'}" <${emailConfig.fromEmail || process.env.MAILGUN_SMTP_LOGIN || process.env.MAILTOGO_SMTP_USER || process.env.SMTP_USER}>`,
    to: recipientList.join(', '),
    subject: subject,
    html: htmlContent
  };

  try {
    const info = await trans.sendMail(mailOptions);
    console.log(`Email sent: ${subject} to ${recipientList.join(', ')}`);
    return { sent: true, info, recipients: recipientList };
  } catch (error) {
    console.error('Error sending email:', error.message);
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
