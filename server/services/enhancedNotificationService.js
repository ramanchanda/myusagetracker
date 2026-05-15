/**
 * Enhanced Notification Service
 * High-level notification functions using centralized email service
 */

const emailService = require('./emailService');
const configService = require('./configService');
const emailTemplates = require('../templates/emails');

/**
 * Test email configuration
 */
async function testEmailConfiguration() {
  return await emailService.testEmailConfiguration();
}

/**
 * Send test notification
 */
async function sendTestNotification() {
  const emailConfig = await configService.getEmailConfig();

  if (!emailConfig.enabled) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  if (!emailConfig.recipients || emailConfig.recipients.length === 0) {
    return { sent: false, reason: 'No recipients configured' };
  }

  const html = emailTemplates.testNotification({
    testDetails: `Provider: ${emailConfig.provider || 'auto'}\nRecipients: ${emailConfig.recipients.join(', ')}`
  });

  try {
    const result = await emailService.sendEmail({
      to: emailConfig.recipients,
      subject: '✅ Heroku Usage Monitor - Test Notification',
      html
    });

    return {
      sent: true,
      provider: result.provider,
      messageId: result.messageId,
      recipients: result.recipients
    };
  } catch (error) {
    console.error('[Enhanced Notification] Test email failed:', error.message);
    return {
      sent: false,
      reason: error.message
    };
  }
}

/**
 * Send threshold alert
 */
async function sendThresholdAlert(resourceType, currentValue, threshold, severity = 'warning') {
  const emailConfig = await configService.getEmailConfig();

  if (!emailConfig.enabled) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  if (!emailConfig.recipients || emailConfig.recipients.length === 0) {
    return { sent: false, reason: 'No recipients configured' };
  }

  const percentUsed = threshold.limit > 0 ? ((currentValue / threshold.limit) * 100).toFixed(1) : 0;
  const severityIcon = severity === 'critical' ? '🚨' : '⚠️';

  const html = emailTemplates.thresholdAlert({
    resourceType,
    currentValue,
    limit: threshold.limit,
    percentUsed,
    severity,
    enterpriseAccount: process.env.ENTERPRISE_ACCOUNT_NAME,
    dashboardUrl: process.env.DASHBOARD_URL
  });

  const subject = `${severityIcon} Heroku ${resourceType} Usage Alert - ${severity.toUpperCase()}`;

  try {
    const result = await emailService.sendEmail({
      to: emailConfig.recipients,
      subject,
      html
    });

    // Log to history
    await configService.addAlertToHistory({
      type: 'threshold',
      resourceType,
      currentValue,
      limit: threshold.limit,
      percentUsed: parseFloat(percentUsed),
      severity,
      recipients: result.recipients
    });

    return {
      sent: true,
      provider: result.provider,
      messageId: result.messageId,
      recipients: result.recipients
    };
  } catch (error) {
    console.error('[Enhanced Notification] Threshold alert failed:', error.message);
    throw error;
  }
}

/**
 * Send usage summary
 */
async function sendUsageSummary(summaryData, period = 'daily') {
  const emailConfig = await configService.getEmailConfig();

  if (!emailConfig.enabled) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  if (!emailConfig.recipients || emailConfig.recipients.length === 0) {
    return { sent: false, reason: 'No recipients configured' };
  }

  const periodIcons = {
    daily: '📊',
    weekly: '📈',
    monthly: '📉'
  };

  const html = emailTemplates.usageSummary({
    period,
    resources: summaryData.resources,
    totalCost: summaryData.totalCost,
    enterpriseAccount: process.env.ENTERPRISE_ACCOUNT_NAME,
    dashboardUrl: process.env.DASHBOARD_URL,
    reportPeriod: summaryData.reportPeriod
  });

  const subject = `${periodIcons[period] || '📊'} Heroku ${period.charAt(0).toUpperCase() + period.slice(1)} Usage Summary`;

  try {
    const result = await emailService.sendEmail({
      to: emailConfig.recipients,
      subject,
      html
    });

    // Log to history
    await configService.addAlertToHistory({
      type: 'summary',
      period,
      resourceCount: Object.keys(summaryData.resources || {}).length,
      totalCost: summaryData.totalCost,
      recipients: result.recipients
    });

    return {
      sent: true,
      provider: result.provider,
      messageId: result.messageId,
      recipients: result.recipients
    };
  } catch (error) {
    console.error('[Enhanced Notification] Usage summary failed:', error.message);
    throw error;
  }
}

/**
 * Send PDF report via email
 */
async function sendPDFReport(pdfBuffer, reportData) {
  const emailConfig = await configService.getEmailConfig();

  if (!emailConfig.enabled) {
    return { sent: false, reason: 'Email notifications disabled' };
  }

  if (!emailConfig.recipients || emailConfig.recipients.length === 0) {
    return { sent: false, reason: 'No recipients configured' };
  }

  const {
    reportType = 'Monthly Usage Report',
    reportPeriod,
    summary
  } = reportData;

  const html = emailTemplates.pdfReport({
    reportType,
    reportPeriod,
    enterpriseAccount: process.env.ENTERPRISE_ACCOUNT_NAME,
    summary,
    dashboardUrl: process.env.DASHBOARD_URL
  });

  const subject = `📄 ${reportType} - ${reportPeriod || 'Latest'}`;

  try {
    const result = await emailService.sendEmail({
      to: emailConfig.recipients,
      subject,
      html,
      attachments: [
        {
          filename: `Heroku_Usage_Report_${reportPeriod || 'Latest'}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    // Log to history
    await configService.addAlertToHistory({
      type: 'pdf-report',
      reportType,
      reportPeriod,
      recipients: result.recipients
    });

    return {
      sent: true,
      provider: result.provider,
      messageId: result.messageId,
      recipients: result.recipients
    };
  } catch (error) {
    console.error('[Enhanced Notification] PDF report delivery failed:', error.message);
    throw error;
  }
}

/**
 * Get notification service status
 */
async function getNotificationStatus() {
  const emailConfig = await configService.getEmailConfig();
  const serviceStatus = emailService.getServiceStatus();

  return {
    enabled: emailConfig.enabled,
    recipients: emailConfig.recipients,
    emailService: serviceStatus
  };
}

module.exports = {
  testEmailConfiguration,
  sendTestNotification,
  sendThresholdAlert,
  sendUsageSummary,
  sendPDFReport,
  getNotificationStatus
};
