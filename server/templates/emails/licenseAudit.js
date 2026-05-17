/**
 * Enterprise License Audit Email Template
 * Professional notification for license compliance and capacity management
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
  const hasOverage = resources.some(r => parseFloat(r.utilization) > 100);

  // Format timestamp professionally
  const timestamp = new Date(generatedAt).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  });

  // Determine severity level
  const getSeverityLabel = () => {
    if (hasOverage) return 'License Overage Detected';
    if (hasCritical) return 'Critical License Threshold Exceeded';
    if (warnings.length > 0) return 'License Capacity Warning';
    return 'License Compliance Review';
  };

  // Determine account status based on highest utilization
  const allUtilizations = resources.map(r => parseFloat(r.utilization));
  const maxUtilization = Math.max(...allUtilizations);
  let accountStatus, accountStatusBadge, overageResources = [];

  // Collect overage resources (>100%)
  resources.forEach(resource => {
    const util = parseFloat(resource.utilization);
    if (util > 100) {
      overageResources.push({
        name: resource.resourceType,
        percentage: resource.utilization
      });
    }
  });

  if (maxUtilization > 100) {
    accountStatus = 'LICENSE OVERAGE';
    accountStatusBadge = `
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background: #450a0a; color: #fef2f2; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 14px; border: 1.5px solid #991b1b;">
          ${accountStatus}
        </div>
        ${overageResources.length > 0 ? `
          <div style="margin-top: 8px; font-size: 13px; color: #991b1b; font-weight: 600;">
            ${overageResources.map(r => `${r.name}: >${r.percentage}%`).join(' • ')}
          </div>
        ` : ''}
      </div>
    `;
  } else if (maxUtilization >= 95) {
    accountStatus = 'LICENSE CRITICAL';
    accountStatusBadge = `
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background: #fee2e2; color: #991b1b; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 14px;">
          ${accountStatus}
        </div>
      </div>
    `;
  } else if (maxUtilization >= 80) {
    accountStatus = 'LICENSE WARNING';
    accountStatusBadge = `
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background: #fef3c7; color: #92400e; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 14px;">
          ${accountStatus}
        </div>
      </div>
    `;
  } else {
    accountStatus = 'LICENSE HEALTHY';
    accountStatusBadge = `
      <div style="margin-bottom: 20px;">
        <div style="display: inline-block; background: #d1fae5; color: #065f46; padding: 8px 16px; border-radius: 6px; font-weight: 700; font-size: 14px;">
          ${accountStatus}
        </div>
      </div>
    `;
  }

  // Build resource table rows with enhanced formatting
  const resourceRows = resources.map(resource => {
    const utilization = parseFloat(resource.utilization);
    let statusColor, statusBg, statusIcon, statusText;

    if (utilization > 100) {
      statusColor = '#7f1d1d';
      statusBg = '#fef2f2';
      statusIcon = '🔴';
      statusText = 'Overage';
    } else if (utilization >= 95) {
      statusColor = '#991b1b';
      statusBg = '#fee2e2';
      statusIcon = '🚨';
      statusText = 'Critical';
    } else if (utilization >= 80) {
      statusColor = '#92400e';
      statusBg = '#fef3c7';
      statusIcon = '⚠️';
      statusText = 'Warning';
    } else {
      statusColor = '#065f46';
      statusBg = '#d1fae5';
      statusIcon = '✓';
      statusText = 'Normal';
    }

    return `
      <tr>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; font-weight: 500; color: #111827;">${resource.resourceType}</td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: 'Courier New', monospace; color: #374151;">${resource.currentUsage.toLocaleString()}</td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-family: 'Courier New', monospace; color: #374151;">${resource.licensedCapacity.toLocaleString()}</td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: ${statusColor}; font-size: 15px;">${resource.utilization}%</td>
        <td style="padding: 14px 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
          <span style="background: ${statusBg}; color: ${statusColor}; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: 700; border: 1px solid ${statusColor}20;">
            ${statusIcon} ${statusText}
          </span>
        </td>
      </tr>
    `;
  }).join('');

  const content = `
    <!-- Executive Summary -->
    <div style="background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%); padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 32px;">
      <h2 style="color: #111827; margin: 0 0 8px 0; font-size: 20px; font-weight: 700;">Enterprise License Audit Report</h2>
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 20px 0; line-height: 1.5;">
        <strong style="color: #374151;">Account:</strong> ${accountName}<br>
        <strong style="color: #374151;">Report Generated:</strong> ${timestamp}
      </p>

      ${accountStatusBadge}

      ${hasOverage || hasCritical ? `
        <div style="padding: 16px 20px; background: ${hasOverage ? '#7f1d1d' : '#991b1b'}; border-radius: 6px; margin-top: 16px;">
          <p style="margin: 0; color: #ffffff; font-weight: 700; font-size: 16px; display: flex; align-items: center;">
            <span style="font-size: 24px; margin-right: 12px;">${hasOverage ? '🔴' : '🚨'}</span>
            ${hasOverage ? 'License Overage - Immediate Action Required' : `${criticals.length} Critical Threshold${criticals.length > 1 ? 's' : ''} Exceeded`}
          </p>
          <p style="margin: 8px 0 0 36px; color: #fecaca; font-size: 13px;">
            Resources are operating ${hasOverage ? 'beyond licensed capacity' : 'at critical utilization levels'}. Please review and take corrective action.
          </p>
        </div>
      ` : ''}
    </div>

    <!-- Audit Metrics -->
    <div style="background: #ffffff; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; margin-bottom: 32px;">
      <h3 style="margin: 0 0 18px 0; font-size: 16px; color: #111827; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px;">Audit Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Enterprise Accounts Scanned</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${accountsScanned || 0}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Accounts with Monitoring Enabled</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #111827; font-size: 16px;">${accountsMonitored || 0}</td>
        </tr>
        ${accountsRestricted > 0 ? `
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Accounts with Access Restrictions</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #d97706; font-size: 16px;">${accountsRestricted}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid #e5e7eb;">
          <td style="padding: 14px 0 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Warning Conditions (80-94%)</td>
          <td style="padding: 14px 0 10px 0; text-align: right; font-weight: 700; color: #f59e0b; font-size: 16px;">${warnings.length}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #6b7280; font-size: 14px; font-weight: 500;">Critical Conditions (≥95%)</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #dc2626; font-size: 16px;">${criticals.length}</td>
        </tr>
      </table>
    </div>

    <!-- Resource Utilization Table -->
    <h3 style="color: #111827; font-size: 18px; font-weight: 700; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">License Utilization Analysis</h3>

    <table style="width: 100%; border-collapse: collapse; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <thead>
        <tr style="background: linear-gradient(135deg, #111827 0%, #1f2937 100%);">
          <th style="padding: 14px 12px; text-align: left; border-bottom: 2px solid #374151; font-weight: 700; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Resource Type</th>
          <th style="padding: 14px 12px; text-align: right; border-bottom: 2px solid #374151; font-weight: 700; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Current Usage</th>
          <th style="padding: 14px 12px; text-align: right; border-bottom: 2px solid #374151; font-weight: 700; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Licensed Capacity</th>
          <th style="padding: 14px 12px; text-align: right; border-bottom: 2px solid #374151; font-weight: 700; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Utilization</th>
          <th style="padding: 14px 12px; text-align: center; border-bottom: 2px solid #374151; font-weight: 700; color: #ffffff; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
        </tr>
      </thead>
      <tbody>
        ${resourceRows}
      </tbody>
    </table>

    <!-- Action Items -->
    <div style="padding: 24px; background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); border-radius: 8px; border-left: 4px solid #2563eb; margin-top: 32px; border: 1px solid #93c5fd;">
      <h4 style="margin: 0 0 14px 0; color: #1e40af; font-size: 16px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
        📋 Recommended Actions
      </h4>
      <ul style="margin: 0; padding-left: 20px; color: #1e3a8a; font-size: 14px; line-height: 1.8;">
        ${hasOverage ? '<li><strong>Critical:</strong> Resources exceeding 100% capacity require immediate remediation or license expansion</li>' : ''}
        ${hasCritical ? '<li><strong>High Priority:</strong> Review resources at or above 95% utilization to prevent service disruptions</li>' : ''}
        ${warnings.length > 0 ? '<li><strong>Medium Priority:</strong> Monitor resources between 80-94% and plan for capacity scaling</li>' : ''}
        <li>Conduct quarterly license optimization reviews to right-size allocations across teams</li>
        <li>Implement capacity forecasting for projected growth over the next 90 days</li>
        <li>Verify license entitlements align with current organizational structure</li>
      </ul>
    </div>

    <!-- CTA Button -->
    ${dashboardUrl ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.25); text-transform: uppercase; letter-spacing: 0.5px;">
          View Full License Dashboard →
        </a>
      </div>
    ` : ''}

    <!-- Configuration Footer -->
    <div style="margin-top: 32px; padding: 20px 24px; border-top: 2px solid #e5e7eb; background: #f9fafb; border-radius: 6px;">
      <p style="font-size: 12px; color: #6b7280; margin: 0; line-height: 1.6;">
        <strong style="color: #374151;">Monitoring Configuration:</strong><br>
        Warning Threshold: 80% • Critical Threshold: 95% • Overage Threshold: >100%<br>
        Audit Schedule: Automated scheduled checks and manual on-demand execution<br>
        Notification Delivery: Rate-limited to prevent alert fatigue
      </p>
    </div>
  `;

  // Dynamic header based on severity
  let headerColor, headerIcon, title;

  if (hasOverage) {
    headerColor = 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 100%)';
    headerIcon = '🔴';
    title = `License Overage Alert - ${totalConditions} Issue${totalConditions > 1 ? 's' : ''} Detected`;
  } else if (hasCritical) {
    headerColor = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
    headerIcon = '🚨';
    title = `License Audit - ${criticals.length} Critical, ${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`;
  } else if (warnings.length > 0) {
    headerColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    headerIcon = '⚠️';
    title = `License Audit - ${warnings.length} Warning${warnings.length > 1 ? 's' : ''} Detected`;
  } else {
    headerColor = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
    headerIcon = '✅';
    title = 'License Audit - All Resources Within Limits';
  }

  return baseTemplate({
    title,
    headerColor,
    headerIcon,
    content
  });
}

module.exports = licenseAuditTemplate;
