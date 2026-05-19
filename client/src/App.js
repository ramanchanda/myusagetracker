import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import EnterpriseView from './components/EnterpriseView';
import NotificationManagementCenter from './components/NotificationManagementCenter';
import LoginHistory from './components/LoginHistory';
import PrintableDashboard from './components/PrintableDashboard';
import EnterpriseReport from './components/reports/EnterpriseReport';
import './App.css';

function AppContent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
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
    // Fetch current user on mount
    const fetchUser = async () => {
      try {
        const response = await axios.get('/api/auth/user');
        setCurrentUser(response.data);
        console.log('[App] Current user:', response.data);
      } catch (error) {
        console.error('[App] Failed to fetch user:', error);
      }
    };
    fetchUser();
  }, []);

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
  const isSecurityPage = location.pathname === '/security';
  const isAdmin = currentUser && currentUser.role === 'admin';

  const handlePrint = () => {
    window.print();
  };

  const handleLogout = async () => {
    try {
      await axios.post('/api/auth/logout');
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if API call fails
      window.location.href = '/login';
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <Link to="/" className="header-logo-link">
            <h1>Heroku Enterprise Accounts Usage</h1>
          </Link>
        </div>
        <div className="header-actions">
          <button onClick={handleRefresh} className="btn btn-primary" disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={handlePrint} className="btn btn-secondary">
            🖨️ Print
          </button>
          {isAdmin && !isSecurityPage && (
            <Link to="/security" className="btn btn-secondary">
              🔒 Security
            </Link>
          )}
          {(isNotificationsPage || isSecurityPage) && (
            <Link to="/" className="btn btn-notification">
              🏠 Back to Dashboard
            </Link>
          )}
          {!isNotificationsPage && !isSecurityPage && (
            <Link to="/notifications" className="btn btn-notification">
              📧 Notification Settings
            </Link>
          )}
          <button onClick={handleLogout} className="btn btn-secondary" title="Logout">
            🚪 Logout
          </button>
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
        <Route path="/notifications" element={<NotificationManagementCenter />} />
        <Route path="/security" element={isAdmin ? <LoginHistory /> : <div>Access Denied</div>} />
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
