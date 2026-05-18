/**
 * Enterprise License Audit Email Template
 * Heroku-branded professional notification for license compliance
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

  // Collect overage resources (>100%)
  let overageResources = [];
  resources.forEach(resource => {
    const util = parseFloat(resource.utilization);
    if (util > 100) {
      overageResources.push({
        name: resource.resourceType,
        percentage: resource.utilization
      });
    }
  });

  // Determine account status based on highest utilization
  const allUtilizations = resources.map(r => parseFloat(r.utilization));
  const maxUtilization = Math.max(...allUtilizations);
  let accountStatus, statusColor, statusBg;

  if (maxUtilization > 100) {
    accountStatus = 'LICENSE OVERAGE';
    statusColor = '#7f1d1d';
    statusBg = '#7f1d1d';
  } else if (maxUtilization >= 95) {
    accountStatus = 'LICENSE CRITICAL';
    statusColor = '#dc2626';
    statusBg = '#dc2626';
  } else if (maxUtilization >= 80) {
    accountStatus = 'LICENSE WARNING';
    statusColor = '#f59e0b';
    statusBg = '#f59e0b';
  } else {
    accountStatus = 'LICENSE HEALTHY';
    statusColor = '#10b981';
    statusBg = '#10b981';
  }

  // Build resource table rows with modern styling
  const resourceRows = resources.map(resource => {
    const utilization = parseFloat(resource.utilization);
    let statusIcon, statusText, statusTextColor, utilizationColor;

    if (utilization > 100) {
      statusIcon = '🔴';
      statusText = 'Overage';
      statusTextColor = '#7f1d1d';
      utilizationColor = '#7f1d1d';
    } else if (utilization >= 95) {
      statusIcon = '⚠️';
      statusText = 'Critical';
      statusTextColor = '#dc2626';
      utilizationColor = '#dc2626';
    } else if (utilization >= 80) {
      statusIcon = '⚠️';
      statusText = 'Warning';
      statusTextColor = '#f59e0b';
      utilizationColor = '#f59e0b';
    } else {
      statusIcon = '✓';
      statusText = 'Normal';
      statusTextColor = '#10b981';
      utilizationColor = '#475569';
    }

    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 14px 12px; font-weight: 500; color: #0f172a; font-size: 14px;">${resource.resourceType}</td>
        <td style="padding: 14px 12px; text-align: right; font-family: 'Courier New', monospace; color: #475569; font-size: 14px;">${resource.currentUsage.toLocaleString()}</td>
        <td style="padding: 14px 12px; text-align: right; font-family: 'Courier New', monospace; color: #475569; font-size: 14px;">${resource.licensedCapacity.toLocaleString()}</td>
        <td style="padding: 14px 12px; text-align: right; font-weight: 700; color: ${utilizationColor}; font-size: 16px;">${resource.utilization}%</td>
        <td style="padding: 14px 12px; text-align: center; color: ${statusTextColor}; font-weight: 600; font-size: 13px;">${statusIcon} ${statusText}</td>
      </tr>
    `;
  }).join('');

  const content = `
    <!-- Header Banner -->
    <div style="background: linear-gradient(135deg, #430098 0%, #6762a6 100%); padding: 32px 24px; text-align: center; border-radius: 10px 10px 0 0; margin: -30px -30px 24px -30px;">
      <div style="font-size: 48px; margin-bottom: 12px;">🔔</div>
      <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">Enterprise License Audit Report</h1>
    </div>

    <!-- Account Info Card -->
    <div style="background: #f8fafc; padding: 20px; border-radius: 10px; border-left: 4px solid #6762a6; margin-bottom: 24px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
        <div style="flex: 1; min-width: 200px;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Account</div>
          <div style="font-size: 16px; color: #0f172a; font-weight: 600;">${accountName}</div>
        </div>
        <div style="flex: 1; min-width: 200px;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">Report Generated</div>
          <div style="font-size: 14px; color: #475569; font-weight: 500;">${timestamp}</div>
        </div>
      </div>
    </div>

    <!-- Status Badge -->
    ${maxUtilization > 100 || maxUtilization >= 80 ? `
    <div style="background: ${maxUtilization > 100 ? '#7f1d1d' : maxUtilization >= 95 ? '#dc2626' : '#f59e0b'}; color: white; padding: 16px 20px; border-radius: 10px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px;">
      <div style="font-size: 28px; line-height: 1;">${maxUtilization > 100 ? '🔴' : '⚠️'}</div>
      <div style="flex: 1;">
        <div style="font-weight: 700; font-size: 16px; margin-bottom: 4px;">${accountStatus}</div>
        ${overageResources.length > 0 ? `
          <div style="font-size: 13px; opacity: 0.95; font-weight: 500;">
            ${overageResources.map(r => `${r.name}: ${r.percentage}%`).join(' • ')}
          </div>
        ` : `
          <div style="font-size: 13px; opacity: 0.95;">
            ${maxUtilization > 100 ? 'Resources operating beyond licensed capacity' : maxUtilization >= 95 ? 'Resources at critical utilization levels' : 'Resources approaching capacity limits'}
          </div>
        `}
      </div>
    </div>
    ` : ''}

    <!-- Audit Summary -->
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
      <h2 style="margin: 0 0 20px 0; font-size: 14px; color: #0f172a; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 2px solid #e2e8f0; padding-bottom: 12px;">AUDIT SUMMARY</h2>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Enterprise Accounts Scanned</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 18px;">${accountsScanned || 0}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Accounts with Monitoring Enabled</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #0f172a; font-size: 18px;">${accountsMonitored || 0}</td>
        </tr>
        ${accountsRestricted > 0 ? `
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Accounts with Access Restrictions</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #f59e0b; font-size: 18px;">${accountsRestricted}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 2px solid #e2e8f0;">
          <td style="padding: 14px 0 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Warning Conditions (80-94%)</td>
          <td style="padding: 14px 0 10px 0; text-align: right; font-weight: 700; color: #f59e0b; font-size: 18px;">${warnings.length}</td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #64748b; font-size: 14px; font-weight: 500;">Critical Conditions (≥95%)</td>
          <td style="padding: 10px 0; text-align: right; font-weight: 700; color: #dc2626; font-size: 18px;">${criticals.length}</td>
        </tr>
      </table>
    </div>

    <!-- License Utilization Table -->
    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; overflow: hidden; margin-bottom: 24px;">
      <div style="background: linear-gradient(135deg, #430098 0%, #6762a6 100%); padding: 16px 20px;">
        <h2 style="margin: 0; color: white; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">LICENSE UTILIZATION ANALYSIS</h2>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <th style="padding: 12px; text-align: left; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">RESOURCE TYPE</th>
            <th style="padding: 12px; text-align: right; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">CURRENT USAGE</th>
            <th style="padding: 12px; text-align: right; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">LICENSED CAPACITY</th>
            <th style="padding: 12px; text-align: right; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">UTILIZATION</th>
            <th style="padding: 12px; text-align: center; font-weight: 700; color: #475569; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${resourceRows}
        </tbody>
      </table>
    </div>

    <!-- Recommended Actions -->
    <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 10px; border-left: 4px solid #6762a6; margin-bottom: 24px;">
      <h3 style="margin: 0 0 12px 0; color: #430098; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">📋 RECOMMENDED ACTIONS</h3>
      <ul style="margin: 0; padding-left: 20px; color: #475569; font-size: 14px; line-height: 1.8;">
        ${hasOverage ? '<li style="color: #7f1d1d; font-weight: 600;"><strong>Critical:</strong> Resources exceeding 100% capacity require immediate remediation or license expansion</li>' : ''}
        ${hasCritical ? '<li style="color: #dc2626; font-weight: 600;"><strong>High Priority:</strong> Review resources at or above 95% utilization to prevent service disruptions</li>' : ''}
        ${warnings.length > 0 ? '<li style="color: #f59e0b; font-weight: 600;"><strong>Medium Priority:</strong> Monitor resources between 80-94% and plan for capacity scaling</li>' : ''}
        <li>Conduct quarterly license optimization reviews to right-size allocations across teams</li>
        <li>Implement capacity forecasting for projected growth over the next 90 days</li>
        <li>Verify license entitlements align with current organizational structure</li>
      </ul>
    </div>

    <!-- CTA Button -->
    ${dashboardUrl ? `
      <div style="text-align: center; margin: 32px 0;">
        <a href="${dashboardUrl}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #430098 0%, #6762a6 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 6px rgba(103, 98, 166, 0.25);">
          View Full License Dashboard →
        </a>
      </div>
    ` : ''}

    <!-- Configuration Footer -->
    <div style="margin-top: 24px; padding: 16px 20px; border-top: 2px solid #e2e8f0; background: #f8fafc; border-radius: 8px;">
      <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
        <strong style="color: #475569; font-size: 12px;">Monitoring Configuration:</strong><br>
        Warning Threshold: 80% • Critical Threshold: 95% • Overage Threshold: >100%<br>
        Audit Schedule: Automated scheduled checks and manual on-demand execution
      </div>
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
    headerIcon = '⚠️';
    title = `License Audit - ${criticals.length} Critical, ${warnings.length} Warning${warnings.length > 1 ? 's' : ''}`;
  } else if (warnings.length > 0) {
    headerColor = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
    headerIcon = '⚠️';
    title = `License Audit - ${warnings.length} Warning${warnings.length > 1 ? 's' : ''} Detected`;
  } else {
    headerColor = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
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
