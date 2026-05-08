const nodemailer = require('nodemailer');

let transporter = null;

function initTransporter() {
  if (!transporter && process.env.SMTP_HOST) {
    transporter = nodemailer.createTransport({
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

async function sendEmail(subject, htmlContent) {
  const trans = initTransporter();

  if (!trans) {
    console.log('Email notifications not configured. Skipping email send.');
    return;
  }

  const mailOptions = {
    from: `"Heroku Usage Monitor" <${process.env.SMTP_USER}>`,
    to: process.env.NOTIFICATION_EMAIL,
    subject: subject,
    html: htmlContent
  };

  try {
    await trans.sendMail(mailOptions);
    console.log(`Email sent: ${subject}`);
  } catch (error) {
    console.error('Error sending email:', error.message);
    throw error;
  }
}

async function sendOverageAlert(resourceType, usageData) {
  const subject = `⚠️ Heroku ${resourceType} Usage Alert`;

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #d9534f;">Heroku Usage Alert</h2>
        <p>Your <strong>${resourceType}</strong> usage has exceeded the threshold.</p>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Usage Details:</h3>
          <ul>
            <li><strong>Used:</strong> ${usageData.used}</li>
            <li><strong>Limit:</strong> ${usageData.limit}</li>
            <li><strong>Usage Percentage:</strong> ${usageData.usagePercentage}%</li>
            <li><strong>Remaining:</strong> ${usageData.remaining}</li>
          </ul>
        </div>

        <p style="color: #666;">
          This is an automated alert from your Heroku Usage Monitoring System.
        </p>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Timestamp: ${new Date().toISOString()}
        </p>
      </body>
    </html>
  `;

  await sendEmail(subject, htmlContent);
}

async function sendTestNotification() {
  const subject = '✅ Heroku Usage Monitor - Test Notification';
  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #5cb85c;">Test Notification</h2>
        <p>This is a test notification from your Heroku Usage Monitoring System.</p>
        <p>If you're receiving this, your notification system is configured correctly!</p>
        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Timestamp: ${new Date().toISOString()}
        </p>
      </body>
    </html>
  `;

  await sendEmail(subject, htmlContent);
}

async function sendDailySummary(summaryData) {
  const subject = '📊 Heroku Daily Usage Summary';

  const htmlContent = `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: #337ab7;">Daily Usage Summary</h2>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Dyno Usage</h3>
          <ul>
            <li>Used: ${summaryData.dynos.used} hours</li>
            <li>Limit: ${summaryData.dynos.limit} hours</li>
            <li>Usage: ${summaryData.dynos.usagePercentage}%</li>
          </ul>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Connect Usage</h3>
          <ul>
            <li>Used: ${summaryData.connect.connectUsed} hours</li>
            <li>Limit: ${summaryData.connect.connectLimit} hours</li>
            <li>Usage: ${summaryData.connect.usagePercentage}%</li>
          </ul>
        </div>

        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3>Add-ons</h3>
          <ul>
            <li>Total Add-ons: ${summaryData.addons.totalAddons}</li>
            <li>Monthly Cost: $${summaryData.addons.totalMonthlyCost}</li>
          </ul>
        </div>

        <p style="color: #666; font-size: 12px; margin-top: 30px;">
          Timestamp: ${new Date().toISOString()}
        </p>
      </body>
    </html>
  `;

  await sendEmail(subject, htmlContent);
}

module.exports = {
  sendOverageAlert,
  sendTestNotification,
  sendDailySummary
};
