import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import EnterpriseView from './components/EnterpriseView';
import NotificationConfig from './components/NotificationConfig';
import PrintableDashboard from './components/PrintableDashboard';
import EnterpriseReport from './components/reports/EnterpriseReport';
import './App.css';

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const location = useLocation();

  // Month selection - default to current month
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [reportView, setReportView] = useState('summary12');

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
    if (location.pathname === '/') {
      fetchEnterpriseHealth();
      const interval = setInterval(fetchEnterpriseHealth, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchEnterpriseHealth, location.pathname]);

  const handleRefresh = () => {
    fetchEnterpriseHealth();
  };

  const isHomePage = location.pathname === '/';
  const isNotificationsPage = location.pathname === '/notifications';

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <Link to="/" className="header-logo-link">
            <h1>Heroku Enterprise Teams Usage</h1>
          </Link>
        </div>
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <Link to={isNotificationsPage ? "/" : "/notifications"} className="btn btn-notification">
            {isNotificationsPage ? '🏠 Back to Dashboard' : '📧 Notification Settings'}
          </Link>
        </div>
      </header>

      {error && isHomePage && (
        <div className="error-banner">
          <strong>Error:</strong> {error}
          <button onClick={fetchEnterpriseHealth} className="retry-btn">Retry</button>
        </div>
      )}

      {lastUpdate && isHomePage && (
        <div className="last-update">
          Last updated: {lastUpdate.toLocaleString()}
        </div>
      )}

      <Routes>
        <Route
          path="/"
          element={
            <EnterpriseView
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              reportView={reportView}
              onReportViewChange={setReportView}
            />
          }
        />
        <Route path="/notifications" element={<NotificationConfig />} />
        <Route path="/report/print/:accountEmail" element={<PrintableDashboard />} />
        <Route path="/report/template/monthly/:accountEmail" element={<EnterpriseReport />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
