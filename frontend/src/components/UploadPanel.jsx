import React, { useRef, useState } from 'react';
import { uploadCsv, loadSample } from '../api';

export default function UploadPanel({ meta, onDatasetChange }) {
  const fileInputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await uploadCsv(file);
      onDatasetChange(result);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to process CSV file.');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  };

  const handleSample = async () => {
    setBusy(true);
    setError(null);
    try {
      const result = await loadSample();
      onDatasetChange(result);
    } catch (err) {
      setError('Failed to load sample dataset.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="panel">
      <p className="panel-label">01 — Ledger source</p>
      <div className="upload-row">
        <label className="file-drop">
          <input type="file" accept=".csv" ref={fileInputRef} onChange={handleFile} disabled={busy} />
          📄 Drop a Kaggle sales CSV here, or click to browse (expects a date + sales column)
        </label>
        <button className="btn secondary" onClick={handleSample} disabled={busy}>
          {busy ? 'Working…' : 'Use bundled sample'}
        </button>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {meta && (
        <div className="dataset-info">
          Loaded: <b>{meta.sourceName}</b> · {meta.rowCount?.toLocaleString()} rows ·{' '}
          {meta.dateRange && (
            <>
              {meta.dateRange.start} → {meta.dateRange.end}
            </>
          )}
          {meta.categories?.length > 0 && <> · categories: {meta.categories.join(', ')}</>}
        </div>
      )}
    </div>
  );
}
