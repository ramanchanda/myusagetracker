/**
 * License Audit Summary Email Template
 * Consolidated email showing all triggered resource conditions per Enterprise Account
 */

const baseTemplate = require('./baseTemplate');

function licenseAuditTemplate(data) {
  const {
    accountName,
    generatedAt,
    warnings = [],
    criticals = [],
    resources = [],
    accountsScanned,
    accountsMonitored,
    accountsRestricted,
    dashboardUrl
  } = data;

  const totalConditions = warnings.length + criticals.length;
  const hasCritical = criticals.length > 0;

  // Format timestamp
  const timestamp = new Date(generatedAt).toUTCString();

  // Build resource table rows
  const resourceRows = resources.map(resource => {
    const statusColor = resource.severity === 'critical' ? '#d9534f' : '#f0ad4e';
    const statusIcon = resource.severity === 'critical' ? '🚨' : '⚠️';
    const statusText = resource.severity === 'critical' ? 'Critical' : 'Warning';

    return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0;">${resource.resourceType}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${resource.currentUsage.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right;">${resource.licensedCapacity.toLocaleString()}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: right; font-weight: 600; color: ${statusColor};">${resource.utilization}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e0e0e0; text-align: center;">
          <span style="background: ${statusColor}; color: white; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 600;">
            ${statusIcon} ${statusText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const content = `
    <h2 style="color: #333333; margin-top: 0;">Enterprise License Audit Summary</h2>

    <p style="font-size: 14px; color: #666666; margin-bottom: 20px;">
      <strong>Account:</strong> ${accountName}<br>
      <strong>Generated:</strong> ${timestamp}
    </p>

    ${hasCritical ? `
      <div style="padding: 16px; background-color: #fee2e2; border-left: 4px solid #d9534f; border-radius: 6px; margin-bottom: 24px;">
        <p style="margin: 0; color: #991b1b; font-weight: 600; font-size: 15px;">
          🚨 ${criticals.length} Critical Condition${criticals.length > 1 ? 's' : ''} Detected - Immediate Action Required
        </p>
      </div>
    ` : ''}

    <div style="background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%); padding: 20px; border-radius: 8px; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; font-size: 16px; color: #475569;">Audit Overview</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Accounts Scanned:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">${accountsScanned || 0}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Accounts Monitored:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #0f172a;">${accountsMonitored || 0}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Restricted Accounts:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #d97706;">${accountsRestricted || 0}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px; border-top: 1px solid #cbd5e1; padding-top: 12px;">Warning Conditions:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #f0ad4e; border-top: 1px solid #cbd5e1; padding-top: 12px;">${warnings.length}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Critical Conditions:</td>
          <td style="padding: 8px 0; text-align: right; font-weight: 600; color: #d9534f;">${criticals.length}</td>
        </tr>
      </table>
    </div>

    <h3 style="color: #333333; font-size: 18px; margin-bottom: 16px;">Resource Utilization Details</h3>

    <table style="width: 100%; border-collapse: collapse; background: white; border: 1px solid #e0e0e0; border-radius: 6px; overflow: hidden;">
      <thead>
        <tr style="background: #f8fafc;">
          <th style="padding: 12px; text-align: left; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 13px;">Resource</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 13px;">Current Usage</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 13px;">Licensed Capacity</th>
          <th style="padding: 12px; text-align: right; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 13px;">Utilization</th>
          <th style="padding: 12px; text-align: center; border-bottom: 2px solid #e2e8f0; font-weight: 600; color: #475569; font-size: 13px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${resourceRows}
      </tbody>
    </table>

    <div style="padding: 20px; background-color: #e7f3ff; border-radius: 6px; border-left: 4px solid #0066cc; margin-top: 24px;">
      <h4 style="margin: 0 0 10px 0; color: #0066cc;">
        <strong>Recommended Actions</strong>
      </h4>
      <ul style="margin: 0; padding-left: 20px; color: #0066cc; font-size: 14px; line-height: 1.6;">
        ${hasCritical ? '<li><strong>Critical:</strong> Review resources exceeding 95% capacity immediately</li>' : ''}
        ${warnings.length > 0 ? '<li><strong>Warning:</strong> Monitor resources approaching license limits and plan capacity expansion</li>' : ''}
        <li>Review license allocations and optimize resource distribution across teams</li>
        <li>Consider license capacity planning for upcoming growth</li>
      </ul>
    </div>

    ${dashboardUrl ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${dashboardUrl}" class="button">
          View License Dashboard →
        </a>
      </div>
    ` : ''}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 13px; color: #666666; margin: 0;">
        <strong>License Monitoring Configuration:</strong><br>
        Warning Threshold: 80% • Critical Threshold: 95%<br>
        Audit triggered by scheduled check or manual execution
      </p>
    </div>
  `;

  const headerColor = hasCritical
    ? 'linear-gradient(135deg, #d9534f 0%, #c9302c 100%)'
    : 'linear-gradient(135deg, #f0ad4e 0%, #ec971f 100%)';
  const headerIcon = hasCritical ? '🚨' : '📋';
  const title = `${headerIcon} License Audit - ${criticals.length} Critical, ${warnings.length} Warning(s)`;

  return baseTemplate({
    title,
    headerColor,
    headerIcon,
    content
  });
}

module.exports = licenseAuditTemplate;
