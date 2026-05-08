import React from 'react';
import UsageCard from './UsageCard';
import AddonsList from './AddonsList';
import UsageChart from './UsageChart';
import './Dashboard.css';

function Dashboard({ data }) {
  const { dynos, addons, connect } = data;

  const dynoPercentage = parseFloat(dynos.usagePercentage);
  const connectPercentage = parseFloat(connect.usagePercentage);

  const chartData = [
    {
      name: 'Dyno Hours',
      used: dynos.used,
      remaining: dynos.remaining,
      limit: dynos.limit,
      percentage: dynoPercentage
    },
    {
      name: 'Connect Hours',
      used: connect.connectUsed,
      remaining: connect.remaining,
      limit: connect.connectLimit,
      percentage: connectPercentage
    }
  ];

  return (
    <div className="dashboard">
      <div className="cards-container">
        <UsageCard
          title="Dyno Hours"
          used={dynos.used}
          limit={dynos.limit}
          remaining={dynos.remaining}
          percentage={dynoPercentage}
          icon="⚡"
        />

        <UsageCard
          title="Connect Hours"
          used={connect.connectUsed}
          limit={connect.connectLimit}
          remaining={connect.remaining}
          percentage={connectPercentage}
          icon="🔌"
        />

        <div className="card addons-summary-card">
          <div className="card-header">
            <h2>💎 Add-ons Summary</h2>
          </div>
          <div className="card-body">
            <div className="stat-row">
              <span className="stat-label">Total Add-ons:</span>
              <span className="stat-value">{addons.totalAddons}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Monthly Cost:</span>
              <span className="stat-value cost">${addons.totalMonthlyCost}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Active Apps:</span>
              <span className="stat-value">{dynos.totalApps}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="charts-section">
        <UsageChart data={chartData} />
      </div>

      <div className="addons-section">
        <AddonsList addons={addons.addons} />
      </div>
    </div>
  );
}

export default Dashboard;
