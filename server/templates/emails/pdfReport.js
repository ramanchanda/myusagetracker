/**
 * PDF Report Delivery Email Template
 */

const baseTemplate = require('./baseTemplate');

function pdfReportTemplate(data) {
  const {
    reportType = 'Monthly Usage Report',
    reportPeriod,
    enterpriseAccount,
    summary,
    dashboardUrl
  } = data;

  const content = `
    <h2 style="color: #333333; margin-top: 0;">Your Report is Ready</h2>

    ${enterpriseAccount ? `
      <p style="font-size: 14px; color: #666666; margin-bottom: 20px;">
        <strong>Enterprise Account:</strong> ${enterpriseAccount}
      </p>
    ` : ''}

    <p style="font-size: 16px; color: #333333;">
      Your <strong>${reportType}</strong> has been generated and is attached to this email.
    </p>

    ${reportPeriod ? `
      <div style="padding: 15px; background-color: #f8f9fa; border-radius: 6px; margin: 20px 0;">
        <p style="margin: 0; color: #666666;">
          <strong>Report Period:</strong> ${reportPeriod}
        </p>
      </div>
    ` : ''}

    ${summary ? `
      <div style="margin-top: 25px;">
        <h3 style="color: #333333; font-size: 18px; margin-bottom: 15px;">Report Summary</h3>
        <div style="padding: 20px; background-color: #f8f9fa; border-radius: 6px; border-left: 4px solid #6f42c1;">
          ${summary}
        </div>
      </div>
    ` : ''}

    <div class="alert-box alert-success">
      <p style="margin: 0; font-size: 14px;">
        <strong>📎 Attachment:</strong> Your detailed PDF report is attached to this email
      </p>
    </div>

    ${dashboardUrl ? `
      <div style="text-align: center; margin-top: 30px;">
        <a href="${dashboardUrl}" class="button">
          View Interactive Dashboard →
        </a>
      </div>
    ` : ''}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
      <p style="font-size: 13px; color: #666666; margin: 0;">
        <strong>Need help?</strong><br>
        Contact your administrator or visit the dashboard for more details.
      </p>
    </div>
  `;

  return baseTemplate({
    title: '📄 Report Ready',
    headerColor: 'linear-gradient(135deg, #6f42c1 0%, #5a31a3 100%)',
    headerIcon: '📄',
    content
  });
}

module.exports = pdfReportTemplate;
