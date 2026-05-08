import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/usage/summary');
      setUsageData(response.data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to fetch usage data');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsageData();
    const interval = setInterval(fetchUsageData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    fetchUsageData();
  };

  const handleTestNotification = async () => {
    try {
      await axios.post('/api/test-notification');
      alert('Test notification sent! Check your email.');
    } catch (err) {
      alert(`Failed to send test notification: ${err.message}`);
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>🚀 Heroku Usage Tracker</h1>
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn btn-primary" disabled={loading}>
            {loading ? '⏳ Loading...' : '🔄 Refresh'}
          </button>
          <button onClick={handleTestNotification} className="btn btn-secondary">
            📧 Test Notification
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchUsageData} className="retry-btn">Retry</button>
        </div>
      )}

      {lastUpdate && (
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      )}

      {loading && !usageData ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading usage data...</p>
        </div>
      ) : usageData ? (
        <Dashboard data={usageData} />
      ) : null}
    </div>
  );
}

export default App;
