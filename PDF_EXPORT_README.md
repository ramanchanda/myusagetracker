# PDF Export Service Documentation

## Overview

The PDF Export Service generates comprehensive, beautiful PDF reports containing all usage data from:
- Summary of past 12 months
- Monthly Report
- Daily - Datewise Report

## Features

### Beautiful Design
- **Professional Layout**: Clean, modern design with purple theme matching the app
- **Color-Coded Cards**: Summary statistics displayed in attractive cards
- **Data Tables**: Well-formatted tables with alternating row colors
- **Charts**: Visual representations of usage trends (bar charts, line charts)
- **Multi-Page Support**: Automatic page breaks and pagination
- **Headers & Footers**: Consistent branding on every page

### Report Contents

#### 1. Cover Page
- Report generation timestamp
- Enterprise account information
- Report period

#### 2. Summary of Past 12 Months
- **Overall Summary Cards**:
  - Total Dyno Units
  - Total Connect Rows
  - Average Monthly Dyno
  - Peak Month Dyno
- **Trend Analysis**:
  - Dyno trend direction
  - Connect trend direction
  - Growth rate
- **12-Month Trend Chart**: Bar chart showing dyno units over time
- **Resource Breakdown Table**: Detailed breakdown by resource type

#### 3. Monthly Report
- **Monthly Summary Cards**:
  - Total Teams
  - Total Apps
  - Total Dyno Units
  - Total Connect Rows
- **Teams Usage Table**: Top 15 teams with their usage metrics

#### 4. Daily Report
- **Daily Summary Cards**:
  - Total Days in period
  - Average Daily Dyno
  - Peak Day Dyno
- **Daily Breakdown Table**: Up to 30 most recent records

#### 5. Summary Page
- Report completion message
- Support information

## API Endpoints

### POST /api/pdf/export

Generate a PDF report with custom parameters.

**Request Body:**
```json
{
  "enterpriseEmail": "account@example.com",
  "monthForMonthly": "2024-01",
  "startDateForDaily": "2024-01-01",
  "endDateForDaily": "2024-01-31"
}
```

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="Heroku_Usage_Report_...pdf"`

### GET /api/pdf/export/:enterpriseEmail

Generate a PDF report via GET request (easier for browser downloads).

**URL Parameters:**
- `enterpriseEmail` (required): The enterprise account email/identifier

**Query Parameters:**
- `monthForMonthly` (optional): Month for monthly report (format: YYYY-MM)
- `startDateForDaily` (optional): Start date for daily report (format: YYYY-MM-DD)
- `endDateForDaily` (optional): End date for daily report (format: YYYY-MM-DD)

**Example:**
```
GET /api/pdf/export/myaccount@example.com?monthForMonthly=2024-01&startDateForDaily=2024-01-01&endDateForDaily=2024-01-31
```

## UI Integration

### Export Button

A green "📥 Export PDF Report" button is added to the report options bar. It:
- Automatically uses the currently selected enterprise account
- Uses the current month selection for monthly report
- Uses the selected date range for daily report (if entered)
- Shows loading state while generating
- Automatically downloads the PDF when ready

### User Experience

1. User selects enterprise account and report options
2. User clicks "📥 Export PDF Report"
3. Button shows "📄 Generating PDF..." while processing
4. PDF is automatically downloaded to user's browser
5. Filename format: `Heroku_Usage_Report_<account>_<timestamp>.pdf`

## Technical Implementation

### Libraries Used

- **PDFKit**: Core PDF generation library
- **Chart.js**: Chart generation
- **canvas**: Server-side canvas for Chart.js rendering

### Color Palette

```javascript
{
  primary: '#6f42c1',      // Purple
  secondary: '#5a31a3',    // Dark purple
  accent: '#c4b5fd',       // Light purple
  warning: '#f59e0b',      // Orange
  danger: '#ef4444',       // Red
  success: '#10b981',      // Green
  text: '#0f172a',         // Dark text
  textLight: '#64748b',    // Light text
  background: '#f8f5ff',   // Light purple bg
  border: '#e9defd'        // Purple border
}
```

### Report Generation Flow

1. **Data Collection**: Fetch all three report types in parallel
2. **Document Creation**: Initialize PDFDocument with A4 size
3. **Content Rendering**: 
   - Add cover page
   - Render 12-month summary with cards and charts
   - Render monthly report with teams table
   - Render daily report with breakdown
   - Add summary page
4. **Streaming**: Stream PDF directly to HTTP response
5. **Download**: Browser automatically downloads the file

## Heroku Deployment

### Buildpack Requirements

The app requires the following for PDF generation with charts:

```bash
heroku buildpacks:add --index 1 https://github.com/heroku/heroku-buildpack-apt
```

Create `Aptfile` in project root:
```
libcairo2-dev
libjpeg-dev
libpango1.0-dev
libgif-dev
build-essential
g++
```

These dependencies are needed for the `canvas` package to compile on Heroku.

### Environment Variables

No additional environment variables needed. Uses existing Heroku API credentials.

### Memory Considerations

- PDF generation is memory-intensive
- Recommended: Use at least Standard-1X dynos
- Large reports (100+ teams) may require more memory

## Error Handling

### Common Errors

**1. Missing Enterprise Account**
- Error: "enterpriseEmail is required"
- Solution: Ensure enterprise account is selected

**2. API Rate Limiting**
- Error: "Too many requests"
- Solution: Wait a minute and try again

**3. Memory Issues (Heroku)**
- Error: "R14 - Memory quota exceeded"
- Solution: Upgrade dyno type or optimize report data

**4. Canvas Compilation Error**
- Error: "Cannot find module 'canvas'"
- Solution: Install system dependencies (see Heroku Deployment section)

## Customization

### Modifying Colors

Edit `COLORS` object in `/server/services/pdfExportService.js`:

```javascript
const COLORS = {
  primary: '#your-color',
  // ... other colors
};
```

### Adding More Charts

Add chart generation in `generateReport()` method:

```javascript
await this.addChart('line', {
  labels: [...],
  datasets: [...]
}, options);
```

### Customizing Tables

Modify column widths in `addTable()` calls:

```javascript
this.addTable(headers, rows, {
  columnWidths: [200, 150, 100, 100]
});
```

## Performance

- **Small Reports** (1-10 teams): ~2-3 seconds
- **Medium Reports** (10-50 teams): ~4-6 seconds
- **Large Reports** (50+ teams): ~8-12 seconds

Charts add approximately 1-2 seconds per chart to generation time.

## Limitations

- Maximum 31 days for daily reports (API limitation)
- Teams table limited to 15 teams (to keep PDF size manageable)
- Daily breakdown limited to 30 records
- Charts are rendered as static images (not interactive)

## Future Enhancements

Potential improvements:
- [ ] Add more chart types (pie charts, area charts)
- [ ] Include app-level breakdown
- [ ] Add cost projections
- [ ] Email PDF directly to recipients
- [ ] Scheduled PDF generation and delivery
- [ ] Comparison charts (month-over-month)
- [ ] Executive summary page with key insights
- [ ] Custom branding/logo support

## Support

For issues or questions:
1. Check Heroku logs: `heroku logs --tail -a myusagetracker`
2. Verify system dependencies are installed
3. Ensure sufficient dyno memory
4. Review error messages in browser console

## Example Usage

### From UI
1. Navigate to Enterprise View
2. Select account and configure date ranges
3. Click "📥 Export PDF Report"
4. PDF downloads automatically

### From API (cURL)
```bash
curl -X GET \
  "https://myusagetracker-0684662c08ff.herokuapp.com/api/pdf/export/myaccount@example.com?monthForMonthly=2024-01" \
  -o report.pdf
```

### From JavaScript
```javascript
const response = await axios.get(
  `/api/pdf/export/${enterpriseEmail}`,
  {
    params: {
      monthForMonthly: '2024-01',
      startDateForDaily: '2024-01-01',
      endDateForDaily: '2024-01-31'
    },
    responseType: 'blob'
  }
);

const blob = new Blob([response.data], { type: 'application/pdf' });
const url = window.URL.createObjectURL(blob);
// ... handle download
```
