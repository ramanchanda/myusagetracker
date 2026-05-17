/**
 * Email Templates Index
 * Centralized access to all email templates
 */

const thresholdAlertTemplate = require('./thresholdAlert');
const usageSummaryTemplate = require('./usageSummary');
const testNotificationTemplate = require('./testNotification');
const pdfReportTemplate = require('./pdfReport');
const licenseAuditTemplate = require('./licenseAudit');

module.exports = {
  thresholdAlert: thresholdAlertTemplate,
  usageSummary: usageSummaryTemplate,
  testNotification: testNotificationTemplate,
  pdfReport: pdfReportTemplate,
  licenseAudit: licenseAuditTemplate
};
