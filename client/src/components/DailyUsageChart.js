import React from 'react';
import './DailyUsageChart.css';

function DailyUsageChart({ dailyData }) {
  if (!dailyData || !dailyData.days || dailyData.days.length === 0) {
    return (
      <div className="daily-usage-chart">
        <div className="no-data">No daily usage data available</div>
      </div>
    );
  }

  const maxCost = Math.max(...dailyData.days.map(d => d.totalCost));
  const { summary } = dailyData;

  return (
    <div className="daily-usage-chart">
      <div className="chart-header">
        <h3>📅 Daily Cost Tracking</h3>
        <div className="chart-summary">
          <div className="summary-stat">
            <span className="stat-label">Total</span>
            <span className="stat-value">${summary.totalCost}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Avg/Day</span>
            <span className="stat-value">${summary.avgDailyCost}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Max</span>
            <span className="stat-value">${summary.maxDailyCost}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Days</span>
            <span className="stat-value">{summary.totalDays}</span>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-bars">
          {dailyData.days.map((day, index) => {
            const heightPercent = maxCost > 0 ? (day.totalCost / maxCost) * 100 : 0;
            const date = new Date(day.date);
            const dayLabel = date.getDate();
            const isWeekend = date.getDay() === 0 || date.getDay() === 6;

            return (
              <div key={index} className="bar-container">
                <div className="bar-wrapper" title={`${day.date}: $${day.totalCost}`}>
                  <div
                    className={`bar ${isWeekend ? 'weekend' : ''}`}
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="bar-segments">
                      {day.dynoCost > 0 && (
                        <div
                          className="bar-segment dyno"
                          style={{
                            height: `${(day.dynoCost / day.totalCost) * 100}%`
                          }}
                          title={`Dynos: $${day.dynoCost}`}
                        />
                      )}
                      {day.dataCost > 0 && (
                        <div
                          className="bar-segment data"
                          style={{
                            height: `${(day.dataCost / day.totalCost) * 100}%`
                          }}
                          title={`Data: $${day.dataCost}`}
                        />
                      )}
                      {day.otherCost > 0 && (
                        <div
                          className="bar-segment other"
                          style={{
                            height: `${(day.otherCost / day.totalCost) * 100}%`
                          }}
                          title={`Other: $${day.otherCost}`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="bar-value">${day.totalCost.toFixed(0)}</div>
                </div>
                <div className={`bar-label ${isWeekend ? 'weekend' : ''}`}>{dayLabel}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="chart-legend">
        <div className="legend-item">
          <span className="legend-color dyno"></span>
          <span className="legend-label">Dynos</span>
        </div>
        <div className="legend-item">
          <span className="legend-color data"></span>
          <span className="legend-label">Data Add-ons</span>
        </div>
        <div className="legend-item">
          <span className="legend-color other"></span>
          <span className="legend-label">Other Add-ons</span>
        </div>
      </div>
    </div>
  );
}

export default DailyUsageChart;
