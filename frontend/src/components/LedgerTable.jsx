import React from 'react';

export default function LedgerTable({ forecast, metrics, modelInfo }) {
  if (!forecast?.length) return null;
  const hasCi = forecast.some((f) => f.lower != null && f.upper != null);

  return (
    <div className="panel">
      <p className="panel-label">03 — Forecast ledger</p>
      <table className="ledger-table">
        <thead>
          <tr>
            <th className="ledger-idx">#</th>
            <th>Date</th>
            <th>Projected sales</th>
            {hasCi && <th>80% range</th>}
          </tr>
        </thead>
        <tbody>
          {forecast.map((f, i) => (
            <tr key={f.date}>
              <td className="ledger-idx">{i + 1}</td>
              <td>{f.date}</td>
              <td className="ledger-value">${f.value.toLocaleString()}</td>
              {hasCi && (
                <td style={{ color: 'var(--ink-faint)' }}>
                  {f.lower != null ? `$${f.lower.toLocaleString()} – $${f.upper.toLocaleString()}` : '—'}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>

      {metrics && (
        <div className="metrics-row">
          <span>
            MAE: <b>${metrics.mae.toLocaleString()}</b>
          </span>
          <span>
            RMSE: <b>${metrics.rmse.toLocaleString()}</b>
          </span>
          <span>
            MAPE: <b>{metrics.mape}%</b>
          </span>
          {modelInfo?.order && (
            <span>
              ARIMA order (p,d,q): <b>({modelInfo.order.join(', ')})</b> · AIC: <b>{modelInfo.aic}</b>
            </span>
          )}
          <span style={{ color: '#8b9aa6' }}>— fit error on historical data, lower is better</span>
        </div>
      )}
    </div>
  );
}
