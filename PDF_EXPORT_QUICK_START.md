# PDF Export - Quick Start Guide

## ✅ Successfully Deployed!

Your PDF export service is now live at: https://myusagetracker-0684662c08ff.herokuapp.com/

## 🎯 How to Use

### From the Web UI (Easiest Method)

1. **Navigate to the app**: Open https://myusagetracker-0684662c08ff.herokuapp.com/

2. **Select your enterprise account** using the dropdown at the top

3. **Configure your report options**:
   - For **Monthly Report**: Select the month using the month selector
   - For **Daily Report**: Enter start and end dates (max 31 days apart)

4. **Click the green "📥 Export PDF Report" button** in the report options bar

5. **Wait for generation**: The button will show "📄 Generating PDF..." (takes 3-10 seconds)

6. **Download**: Your PDF will automatically download with a filename like:
   ```
   Heroku_Usage_Report_myaccount_example_com_1234567890.pdf
   ```

### What's Included in the PDF?

The PDF report contains **all three report types**:

#### 1. **Summary of Past 12 Months**
- Overall summary with total usage statistics
- Trend analysis (growth rates, directions)
- 12-month bar chart showing dyno unit trends
- Resource breakdown table

#### 2. **Monthly Report** 
- Monthly summary cards (teams, apps, usage)
- Teams usage table with top 15 teams
- Dyno units and Connect rows per team

#### 3. **Daily Report**
- Daily summary statistics
- Average daily usage
- Peak day identification
- Detailed breakdown by date, team, and app

### Report Design Features

✨ **Beautiful & Professional**:
- Purple theme matching your app
- Clean typography and spacing
- Colored summary cards
- Well-formatted tables with alternating rows
- Charts and visualizations
- Page numbers and timestamps
- Automatic pagination

## 🔧 API Usage (Advanced)

### Method 1: GET Request (Browser-Friendly)

**URL Format:**
```
GET /api/pdf/export/:enterpriseEmail?monthForMonthly=YYYY-MM&startDateForDaily=YYYY-MM-DD&endDateForDaily=YYYY-MM-DD
```

**Example:**
```
https://myusagetracker-0684662c08ff.herokuapp.com/api/pdf/export/myaccount@example.com?monthForMonthly=2024-01&startDateForDaily=2024-01-01&endDateForDaily=2024-01-31
```

You can paste this URL directly in your browser to download the PDF!

### Method 2: POST Request (Programmatic)

**Endpoint:** `POST /api/pdf/export`

**Request Body:**
```json
{
  "enterpriseEmail": "myaccount@example.com",
  "monthForMonthly": "2024-01",
  "startDateForDaily": "2024-01-01",
  "endDateForDaily": "2024-01-31"
}
```

**cURL Example:**
```bash
curl -X POST \
  https://myusagetracker-0684662c08ff.herokuapp.com/api/pdf/export \
  -H "Content-Type: application/json" \
  -d '{
    "enterpriseEmail": "myaccount@example.com",
    "monthForMonthly": "2024-01",
    "startDateForDaily": "2024-01-01",
    "endDateForDaily": "2024-01-31"
  }' \
  -o report.pdf
```

**JavaScript/Axios Example:**
```javascript
const response = await axios.post('/api/pdf/export', {
  enterpriseEmail: 'myaccount@example.com',
  monthForMonthly: '2024-01',
  startDateForDaily: '2024-01-01',
  endDateForDaily: '2024-01-31'
}, {
  responseType: 'blob'
});

// Create download link
const blob = new Blob([response.data], { type: 'application/pdf' });
const url = window.URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'report.pdf';
link.click();
```

## ⚡ Performance

- **Small reports** (1-10 teams): ~2-3 seconds
- **Medium reports** (10-50 teams): ~4-6 seconds  
- **Large reports** (50+ teams): ~8-12 seconds

## 📋 Parameters Reference

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `enterpriseEmail` | string | Yes | Enterprise account email/identifier | `myaccount@example.com` |
| `monthForMonthly` | string | No | Month for monthly report (defaults to current) | `2024-01` |
| `startDateForDaily` | string | No | Start date for daily report (defaults to 30 days ago) | `2024-01-01` |
| `endDateForDaily` | string | No | End date for daily report (defaults to today) | `2024-01-31` |

## 🎨 Visual Elements in PDF

1. **Cover Page**
   - Report title and enterprise account
   - Generation timestamp
   - Report period

2. **Summary Cards** (Purple theme)
   - Total Dyno Units
   - Total Connect Rows
   - Average metrics
   - Peak usage

3. **Charts**
   - 12-month trend (bar chart)
   - Color-coded with purple accent

4. **Tables**
   - Resource breakdown
   - Teams usage
   - Daily breakdown
   - Alternating row colors for readability

5. **Headers & Footers**
   - Consistent branding
   - Page numbers
   - Timestamps

## ⚠️ Important Notes

1. **Date Range Limit**: Daily reports are limited to 31 days maximum (Heroku API limitation)

2. **Data Limits**: 
   - Teams table shows top 15 teams (keeps PDF size manageable)
   - Daily breakdown shows up to 30 records

3. **Generation Time**: Large reports may take 8-12 seconds. The button shows a loading state.

4. **Browser Compatibility**: Works in all modern browsers (Chrome, Firefox, Safari, Edge)

## 🐛 Troubleshooting

### PDF Download Not Starting?
- Check browser console for errors
- Ensure pop-ups are not blocked
- Verify enterprise account is selected

### PDF Generation Failed?
- Check Heroku logs: `heroku logs --tail -a myusagetracker`
- Verify the enterprise account has data
- Ensure date ranges are valid

### Slow Generation?
- This is normal for large accounts with many teams
- Wait up to 12 seconds for completion
- Consider upgrading dyno type for faster processing

## 📊 Use Cases

Perfect for:
- **Monthly reports** to management
- **Quarterly reviews** with historical data
- **Budget planning** with usage trends
- **Archival purposes** (PDF format)
- **Sharing** with non-technical stakeholders
- **Offline viewing** without access to the app

## 🎯 Next Steps

1. **Try it out**: Click "📥 Export PDF Report" and see the result
2. **Share with team**: Send PDFs to stakeholders
3. **Schedule exports**: Use the API with cron jobs for automated reports
4. **Customize**: See `PDF_EXPORT_README.md` for customization options

## 📚 Additional Documentation

- **Full Documentation**: See `PDF_EXPORT_README.md`
- **API Reference**: Complete endpoint details and examples
- **Customization Guide**: How to modify colors, charts, and layout
- **Heroku Setup**: Buildpack and dependency information

---

**Your PDF export service is ready to use!** 🎉

Simply select your account, configure dates, and click the green export button to generate beautiful, comprehensive usage reports.
