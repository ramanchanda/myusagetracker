import React, { useState } from 'react';
import './CategorizedAddons.css';

function CategorizedAddons({ addonsData }) {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('cost');

  const { addons, categorySummary, addonsByCategory, totalMonthlyCost } = addonsData;

  // Get category display name
  const getCategoryName = (category) => {
    const names = {
      data: 'Data & Databases',
      connect: 'Heroku Connect',
      monitoring: 'Monitoring & Logging',
      email: 'Email Services',
      search: 'Search',
      queue: 'Queue & Workers',
      scheduler: 'Scheduler',
      storage: 'Storage',
      analytics: 'Analytics',
      security: 'Security & SSL',
      other: 'Other Services'
    };
    return names[category] || category;
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    const icons = {
      data: '💾',
      connect: '🔌',
      monitoring: '📊',
      email: '📧',
      search: '🔍',
      queue: '📬',
      scheduler: '⏰',
      storage: '🗄️',
      analytics: '📈',
      security: '🔒',
      other: '🔧'
    };
    return icons[category] || '📦';
  };

  // Filter addons
  const filteredAddons = addons.filter(addon => {
    const matchesCategory = selectedCategory === 'all' || addon.category === selectedCategory;
    const matchesSearch = addon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         addon.addonService.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         addon.appName.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Sort addons
  const sortedAddons = [...filteredAddons].sort((a, b) => {
    switch (sortBy) {
      case 'cost':
        return (b.price?.cents || 0) - (a.price?.cents || 0);
      case 'name':
        return a.name.localeCompare(b.name);
      case 'app':
        return a.appName.localeCompare(b.appName);
      case 'category':
        return a.category.localeCompare(b.category);
      default:
        return 0;
    }
  });

  return (
    <div className="categorized-addons">
      <div className="addons-header">
        <h2>💎 Add-ons by Category</h2>
        <div className="total-cost-badge">
          Total: ${totalMonthlyCost}/month
        </div>
      </div>

      {/* Category Summary Cards */}
      <div className="category-summary">
        <div
          className={`category-card all ${selectedCategory === 'all' ? 'active' : ''}`}
          onClick={() => setSelectedCategory('all')}
        >
          <div className="category-icon">📦</div>
          <div className="category-info">
            <div className="category-name">All Add-ons</div>
            <div className="category-stats">
              <span className="count">{addons.length}</span>
              <span className="cost">${totalMonthlyCost}</span>
            </div>
          </div>
        </div>

        {categorySummary.map((cat) => (
          <div
            key={cat.category}
            className={`category-card ${selectedCategory === cat.category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.category)}
          >
            <div className="category-icon">{getCategoryIcon(cat.category)}</div>
            <div className="category-info">
              <div className="category-name">{getCategoryName(cat.category)}</div>
              <div className="category-stats">
                <span className="count">{cat.count} add-ons</span>
                <span className="cost">${cat.totalCost}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="addons-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search add-ons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="sort-controls">
          <label>Sort by:</label>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="cost">Cost (High to Low)</option>
            <option value="name">Name (A-Z)</option>
            <option value="app">App Name</option>
            <option value="category">Category</option>
          </select>
        </div>
        <div className="results-count">
          Showing {sortedAddons.length} of {addons.length} add-ons
        </div>
      </div>

      {/* Add-ons List */}
      <div className="addons-list">
        {sortedAddons.length === 0 ? (
          <div className="no-results">
            <p>No add-ons found matching your criteria.</p>
          </div>
        ) : (
          <div className="addons-grid">
            {sortedAddons.map((addon, index) => (
              <div key={`${addon.name}-${index}`} className="addon-card">
                <div className="addon-header">
                  <span className="addon-icon">{addon.categoryIcon}</span>
                  <div className="addon-title">
                    <h4>{addon.name}</h4>
                    <span className="addon-app">App: {addon.appName}</span>
                  </div>
                  <span className={`addon-status ${addon.state}`}>
                    {addon.state}
                  </span>
                </div>
                <div className="addon-body">
                  <div className="addon-detail">
                    <span className="label">Service:</span>
                    <span className="value">{addon.categoryType}</span>
                  </div>
                  <div className="addon-detail">
                    <span className="label">Plan:</span>
                    <span className="value">{addon.plan}</span>
                  </div>
                  <div className="addon-detail">
                    <span className="label">Category:</span>
                    <span className="value">
                      {getCategoryIcon(addon.category)} {getCategoryName(addon.category)}
                    </span>
                  </div>
                  <div className="addon-cost">
                    <span className="cost-label">Monthly Cost:</span>
                    <span className="cost-value">
                      ${((addon.price?.cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category Breakdown */}
      {selectedCategory === 'all' && (
        <div className="category-breakdown">
          <h3>Cost Breakdown by Category</h3>
          <div className="breakdown-chart">
            {categorySummary.map((cat) => {
              const percentage = (parseFloat(cat.totalCost) / parseFloat(totalMonthlyCost) * 100).toFixed(1);
              return (
                <div key={cat.category} className="breakdown-item">
                  <div className="breakdown-label">
                    <span className="icon">{getCategoryIcon(cat.category)}</span>
                    <span className="name">{getCategoryName(cat.category)}</span>
                    <span className="count">({cat.count})</span>
                  </div>
                  <div className="breakdown-bar-container">
                    <div
                      className="breakdown-bar"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="breakdown-stats">
                    <span className="percentage">{percentage}%</span>
                    <span className="cost">${cat.totalCost}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default CategorizedAddons;
