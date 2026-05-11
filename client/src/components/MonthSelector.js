import React from 'react';
import './MonthSelector.css';

function MonthSelector({ selectedMonth, onMonthChange }) {
  // Generate last 12 months
  const generateMonths = () => {
    const months = [];
    const today = new Date();

    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleString('default', { month: 'long', year: 'numeric' }),
        isCurrent: i === 0
      });
    }

    return months;
  };

  const months = generateMonths();

  return (
    <div className="month-selector">
      <div className="selector-header">
        <span className="calendar-icon">📅</span>
        <label htmlFor="month-select">Select Month:</label>
      </div>
      <select
        id="month-select"
        value={selectedMonth}
        onChange={(e) => onMonthChange(e.target.value)}
        className="month-dropdown"
      >
        {months.map((month) => (
          <option key={month.value} value={month.value}>
            {month.label} {month.isCurrent ? '(Current)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
}

export default MonthSelector;
