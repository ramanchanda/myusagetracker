/**
 * Threshold Alert Email Template
 * Used for warning and critical usage alerts
 */

const baseTemplate = require('./baseTemplate');

function thresholdAlertTemplate(data) {
  const {
    resourceType,
    currentValue,
    limit,
    percentUsed,
    severity = 'warning',
    enterpriseAccount,
    dashboardUrl
  } = data;

  const severityConfig = {
    warning: {
      color: 'linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%)',
      icon: '⚠️',
      title: 'Usage Warning',
      alertClass: 'alert-warning'
    },
    critical: {
      color: 'linear-gradient(135deg, #d9534f 0%, #c9302c 100%)',
      icon: '🚨',
      title: 'Critical Usage Alert',
      alertClass: 'alert-critical'
    }
  };

  const config = severityConfig[severity] || severityConfig.warning;
  const recommendedAction = severity === 'critical'
    ? 'Immediate action required. Consider increasing your resource limits or optimizing usage to prevent service disruption.'
    : 'Monitor your usage closely and consider planning for additional capacity soon.';

  const content = `
    <h2 style="color: #333333; margin-top: 0;">Resource Usage Alert</h2>

    ${enterpriseAccount ? `
      <p style="font-size: 14px; color: #666666; margin-bottom: 20px;">
        <strong>Enterprise Account:</strong> ${enterpriseAccount}
      </p>
    ` : ''}

    <p style="font-size: 16px; color: #333333;">
      Your <strong>${resourceType}</strong> usage has reached <strong style="color: ${severity === 'critical' ? '#d9534f' : '#f0ad4e'};">${percentUsed}%</strong> of the configured threshold.
    </p>

    <div class="alert-box ${config.alertClass}">
      <h3 style="margin-top: 0; font-size: 18px;">Usage Details</h3>
      <table class="stats-table">
        <tr>
          <td>Current Usage:</td>
          <td>${currentValue.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Configured Limit:</td>
          <td>${limit.toLocaleString()}</td>
        </tr>
        <tr>
          <td>Percentage Used:</td>
          <td style="color: ${severity === 'critical' ? '#d9534f' : '#f0ad4e'};">${percentUsed}%</td>
        </tr>
      </table>
    </div>

    <div style="padding: 20px; background-color: #e7f3ff; border-radius: 6px; border-left: 4px solid #0066cc;">
      <h4 style="margin: 0 0 10px 0; color: #0066cc;">
        <strong>Recommended Action</strong>
      </h4>
      <p style="margin: 0; color: #0066cc; font-size: 14px;">
        ${recommendedAction}
      </p>
    </div>

    ${dashboardUrl ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${dashboardUrl}" class="button">
          View Dashboard →
        </a>
      </div>
    ` : ''}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 13px; color: #666666; margin: 0;">
        <strong>Threshold Configuration:</strong><br>
        Warning: 80% • Critical: 95% • Limit: 100%
      </p>
    </div>
  `;

  return baseTemplate({
    title: `${config.icon} ${resourceType} ${config.title}`,
    headerColor: config.color,
    headerIcon: config.icon,
    content
  });
}

module.exports = thresholdAlertTemplate;
