import React from 'react';

const METHOD_OPTIONS = [
  { value: 'arima', label: 'ARIMA (statistical ML)' },
  { value: 'holt_winters', label: 'Holt-Winters (trend + seasonality)' },
  { value: 'holt_linear', label: "Holt's linear trend" },
  { value: 'ses', label: 'Exponential smoothing' },
  { value: 'moving_average', label: 'Moving average' },
  { value: 'linear_regression', label: 'Linear regression' },
];

export default function ControlsPanel({ params, onChange, categories, regions }) {
  const update = (key, value) => onChange({ ...params, [key]: value });

  return (
    <div className="panel">
      <p className="panel-label">02 — Forecast parameters</p>
      <div className="controls-grid">
        <div className="field">
          <label>Method</label>
          <select value={params.method} onChange={(e) => update('method', e.target.value)}>
            {METHOD_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Horizon (days)</label>
          <input
            type="number"
            min={1}
            max={180}
            value={params.horizon}
            onChange={(e) => update('horizon', Number(e.target.value))}
          />
        </div>

        {params.method === 'holt_winters' && (
          <div className="field">
            <label>Season length (days)</label>
            <input
              type="number"
              min={2}
              max={365}
              value={params.seasonLength}
              onChange={(e) => update('seasonLength', Number(e.target.value))}
            />
          </div>
        )}

        {categories?.length > 0 && (
          <div className="field">
            <label>Category</label>
            <select value={params.category || 'All'} onChange={(e) => update('category', e.target.value)}>
              <option value="All">All</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {regions?.length > 0 && (
          <div className="field">
            <label>Region</label>
            <select value={params.region || 'All'} onChange={(e) => update('region', e.target.value)}>
              <option value="All">All</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="field-note">
          {params.method === 'arima'
            ? 'ARIMA order (p,d,q) is auto-selected via AIC grid search by a Python statsmodels service — a real statistical forecasting model, not a fixed heuristic.'
            : "Holt-Winters captures weekly rhythm and long-term trend — best default for daily retail data."}
        </div>
      </div>
    </div>
  );
}
