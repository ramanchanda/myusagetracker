/**
 * Usage Summary Email Template
 * Used for daily, weekly, and monthly usage reports
 */

const baseTemplate = require('./baseTemplate');

function usageSummaryTemplate(data) {
  const {
    period = 'daily',
    resources,
    totalCost,
    enterpriseAccount,
    dashboardUrl,
    reportPeriod
  } = data;

  const periodConfig = {
    daily: { icon: '📊', title: 'Daily Usage Summary' },
    weekly: { icon: '📈', title: 'Weekly Usage Summary' },
    monthly: { icon: '📉', title: 'Monthly Usage Summary' }
  };

  const config = periodConfig[period] || periodConfig.daily;

  const resourceRows = Object.entries(resources || {}).map(([key, resource]) => {
    const percentage = resource.percentage || 0;
    const statusColor = percentage > 90 ? '#d9534f' : percentage > 80 ? '#f0ad4e' : '#5cb85c';

    return `
      <div style="margin-bottom: 25px; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #6f42c1;">
        <h3 style="margin: 0 0 15px 0; color: #333333; font-size: 18px;">${resource.label || key}</h3>
        <table class="stats-table" style="margin: 0;">
          <tr>
            <td>Current Usage:</td>
            <td>${(resource.current || 0).toLocaleString()}</td>
          </tr>
          ${resource.limit ? `
          <tr>
            <td>Limit:</td>
            <td>${resource.limit.toLocaleString()}</td>
          </tr>
          <tr>
            <td>Usage Percentage:</td>
            <td style="color: ${statusColor};">${percentage.toFixed(1)}%</td>
          </tr>
          ` : ''}
          ${resource.cost ? `
          <tr>
            <td>Estimated Cost:</td>
            <td>$${resource.cost.toFixed(2)}</td>
          </tr>
          ` : ''}
        </table>
      </div>
    `;
  }).join('');

  const content = `
    <h2 style="color: #333333; margin-top: 0;">Usage Report</h2>

    ${enterpriseAccount ? `
      <p style="font-size: 14px; color: #666666; margin-bottom: 20px;">
        <strong>Enterprise Account:</strong> ${enterpriseAccount}
      </p>
    ` : ''}

    ${reportPeriod ? `
      <p style="font-size: 14px; color: #666666; margin-bottom: 20px;">
        <strong>Report Period:</strong> ${reportPeriod}
      </p>
    ` : ''}

    <p style="font-size: 16px; color: #333333; margin-bottom: 30px;">
      Here's your ${period} Heroku resource usage summary.
    </p>

    ${resourceRows}

    ${totalCost ? `
      <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); border-radius: 6px; text-align: center;">
        <h3 style="margin: 0 0 10px 0; color: #1976d2; font-size: 16px;">Total Usage Cost</h3>
        <p style="margin: 0; font-size: 32px; font-weight: bold; color: #0d47a1;">$${totalCost.toFixed(2)}</p>
      </div>
    ` : ''}

    ${dashboardUrl ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${dashboardUrl}" class="button">
          View Detailed Report →
        </a>
      </div>
    ` : ''}
  `;

  return baseTemplate({
    title: `${config.icon} ${config.title}`,
    headerColor: 'linear-gradient(135deg, #6f42c1 0%, #5a31a3 100%)',
    headerIcon: config.icon,
    content
  });
}

module.exports = usageSummaryTemplate;
