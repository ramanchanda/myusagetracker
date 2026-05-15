/**
 * Test Notification Email Template
 */

const baseTemplate = require('./baseTemplate');

function testNotificationTemplate(data = {}) {
  const { testDetails } = data;

  const content = `
    <h2 style="color: #333333; margin-top: 0;">Test Notification</h2>

    <p style="font-size: 16px; color: #333333; line-height: 1.6;">
      This is a test notification from your <strong>Heroku Usage Monitoring System</strong>.
    </p>

    <p style="font-size: 16px; color: #333333; line-height: 1.6;">
      If you're receiving this email, your notification system is configured correctly! 🎉
    </p>

    <div class="alert-box alert-success">
      <h3 style="margin-top: 0; font-size: 16px;">Configuration Status</h3>
      <p style="margin: 5px 0;">✓ Email service is operational</p>
      <p style="margin: 5px 0;">✓ Email provider connection successful</p>
      <p style="margin: 5px 0;">✓ Recipients are configured correctly</p>
      <p style="margin: 5px 0;">✓ Template system is working</p>
    </div>

    ${testDetails ? `
      <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 6px;">
        <h4 style="margin: 0 0 10px 0; color: #666666; font-size: 14px;">Test Details</h4>
        <p style="margin: 0; font-size: 13px; color: #666666; font-family: monospace;">
          ${testDetails}
        </p>
      </div>
    ` : ''}

    <div style="margin-top: 30px; padding: 20px; background-color: #e7f3ff; border-radius: 6px; border-left: 4px solid #0066cc;">
      <h4 style="margin: 0 0 10px 0; color: #0066cc;">
        <strong>Next Steps</strong>
      </h4>
      <p style="margin: 0; color: #0066cc; font-size: 14px;">
        Your notification system is ready to send usage alerts and reports. Configure your thresholds in the dashboard to start monitoring.
      </p>
    </div>
  `;

  return baseTemplate({
    title: '✅ Test Notification',
    headerColor: 'linear-gradient(135deg, #5cb85c 0%, #4cae4c 100%)',
    headerIcon: '✅',
    content
  });
}

module.exports = testNotificationTemplate;
