import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import EnterpriseView from './components/EnterpriseView';
import MonthSelector from './components/MonthSelector';
import './App.css';

function App() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Month selection - default to current month
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());

  const fetchEnterpriseHealth = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      await axios.get('/api/enterprise/structure', {
        params: { month: selectedMonth }
      });
      setLastUpdate(new Date());
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch enterprise usage data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchEnterpriseHealth();
    const interval = setInterval(fetchEnterpriseHealth, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchEnterpriseHealth]);

  const handleRefresh = () => {
    fetchEnterpriseHealth();
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Enterprise Teams Usage</h1>
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchEnterpriseHealth} className="retry-btn">Retry</button>
        </div>
      )}

      {lastUpdate && (
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      )}

      <MonthSelector
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
      />
      <EnterpriseView selectedMonth={selectedMonth} />
    </div>
  );
}

export default App;
