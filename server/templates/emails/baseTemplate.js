/**
 * Base Email Template
 * Provides consistent branding and structure for all emails
 */

function baseTemplate({ title, headerColor, headerIcon, content, footer }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .email-header {
      background: ${headerColor || 'linear-gradient(135deg, #6f42c1 0%, #5a31a3 100%)'};
      color: #ffffff;
      padding: 30px;
      text-align: center;
    }
    .email-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .email-header .icon {
      font-size: 48px;
      margin-bottom: 10px;
    }
    .email-body {
      padding: 30px;
      color: #333333;
      line-height: 1.6;
    }
    .email-footer {
      padding: 20px;
      background-color: #f8f9fa;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      color: #666666;
      font-size: 12px;
    }
    .button {
      display: inline-block;
      padding: 12px 24px;
      background: linear-gradient(135deg, #6f42c1 0%, #5a31a3 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 10px 0;
    }
    .alert-box {
      padding: 20px;
      border-radius: 6px;
      margin: 20px 0;
    }
    .alert-warning {
      background-color: #fff3cd;
      border-left: 4px solid #f0ad4e;
      color: #856404;
    }
    .alert-critical {
      background-color: #f8d7da;
      border-left: 4px solid #d9534f;
      color: #721c24;
    }
    .alert-success {
      background-color: #d4edda;
      border-left: 4px solid #5cb85c;
      color: #155724;
    }
    .stats-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    .stats-table td {
      padding: 12px;
      border-bottom: 1px solid #e0e0e0;
    }
    .stats-table td:first-child {
      color: #666666;
      font-weight: 500;
    }
    .stats-table td:last-child {
      text-align: right;
      font-weight: 600;
      color: #333333;
    }
    .brand-footer {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      ${headerIcon ? `<div class="icon">${headerIcon}</div>` : ''}
      <h1>${title}</h1>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      ${footer || `
        <p>This is an automated notification from <strong>Heroku Usage Tracker</strong></p>
        <p style="color: #999999; font-size: 11px; margin-top: 10px;">
          ${new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'long' })}
        </p>
        <div class="brand-footer">
          <p style="color: #999999; margin: 5px 0;">
            Powered by <strong>Heroku Usage Tracker</strong>
          </p>
        </div>
      `}
    </div>
  </div>
</body>
</html>
  `;
}

module.exports = baseTemplate;
