import React from 'react';

function formatCurrency(v) {
  if (v == null) return '—';
  return '$' + v.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export default function StatsCards({ stats }) {
  if (!stats) return null;
  const growthPositive = stats.growthRate >= 0;

  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-num">{formatCurrency(stats.totalSales)}</div>
        <div className="stat-label">Total sales, period</div>
      </div>
      <div className="stat-card">
        <div className="stat-num">{formatCurrency(stats.avgDailySales)}</div>
        <div className="stat-label">Avg. daily sales</div>
      </div>
      <div className="stat-card">
        <div className={`stat-num ${growthPositive ? 'positive' : 'negative'}`}>
          {growthPositive ? '+' : ''}
          {stats.growthRate}%
        </div>
        <div className="stat-label">Growth, 1st → 2nd half</div>
      </div>
      <div className="stat-card">
        <div className="stat-num">{formatCurrency(stats.bestDay?.sales)}</div>
        <div className="stat-label">Best Month · {stats.bestDay?.date}</div>
      </div>
    </div>
  );
}
