# Ledger.Forecast — Sales Forecasting App(Intern ID - CITS7455)

A full-stack sales forecasting application:

- **Frontend:** React + Vite (charts via Recharts)
- **Backend:** Node.js + Express.js REST API
- **Forecasting:** Moving Average, Simple Exponential Smoothing, Holt's Linear Trend,
  Holt-Winters (trend + weekly seasonality), and Linear Regression — all implemented
  in plain JavaScript, no external ML service needed.
- **Data:** Works with any Kaggle sales CSV out of the box, plus a bundled synthetic
  sample dataset shaped like the popular *Superstore Sales* dataset so it runs immediately.

---

## 1. Project structure

```
sales-forecast-app/
├── backend/
│   ├── server.js               Express API (upload, meta, stats, forecast)
│   ├── ml_service/              Python FastAPI microservice — ARIMA forecasting
│   │   ├── main.py               Auto-order ARIMA (AIC grid search) via statsmodels
│   │   └── requirements.txt
│   ├── utils/
│   │   ├── csvProcessor.js      CSV parsing + column auto-detection + daily aggregation
│   │   └── forecasting.js       The 5 in-process JS forecasting algorithms
│   ├── data/
│   │   ├── generate_sample.js   Script that generated the bundled dataset
│   │   └── sample_sales.csv     Bundled sample data (~11k rows, 2023–2025)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── api.js
│   │   ├── index.css
│   │   └── components/
│   │       ├── UploadPanel.jsx
│   │       ├── StatsCards.jsx
│   │       ├── ControlsPanel.jsx
│   │       ├── ForecastChart.jsx
│   │       └── LedgerTable.jsx
│   ├── index.html
│   ├── vite.config.js          Proxies /api → http://localhost:5000
│   └── package.json
└── README.md
```

## 2. Running it locally

This app has **three** processes: the Express API, the Python ARIMA microservice, and
the React frontend.

**1. ARIMA microservice (port 8001) — required for the "ARIMA" forecast method:**
```bash
cd backend/ml_service
pip install -r requirements.txt      # or: pip install -r requirements.txt --break-system-packages
uvicorn main:app --host 0.0.0.0 --port 8001
```

**2. Backend (port 5000), in a second terminal:**
```bash
cd backend
npm install
npm start          # or: npm run dev  (auto-restart on changes)
```

**3. Frontend (port 5173), in a third terminal:**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — the app loads the bundled sample dataset automatically.

> The ARIMA microservice is optional — every other forecasting method (Holt-Winters,
> exponential smoothing, etc.) works without it, since those run in-process in Express.
> If the ARIMA service isn't running, selecting "ARIMA" in the UI will show a clear
> error telling you how to start it, instead of failing silently.

## 3. Using a real Kaggle dataset

Good datasets to try from Kaggle:
- **"Superstore Sales Dataset"** (matches the bundled sample's shape exactly)
- **"Store Item Demand Forecasting Challenge"**
- **"Walmart Store Sales Forecasting"**
- **"Retail Sales Forecasting"**

Steps:
1. Download the dataset's CSV from Kaggle (you'll need a free Kaggle account and, for
   some datasets, to accept competition rules).
2. In the app, click the upload box under **"01 — Ledger source"** and pick the CSV.
3. The backend auto-detects a date column (`Order Date`, `Date`, `Invoice Date`, …) and a
   sales column (`Sales`, `Amount`, `Revenue`, `Total`, …). If it can't find them, it
   returns an error telling you what headers it saw — rename the relevant columns and
   re-upload if needed.
4. Optional `Category` and `Region`/`State` columns are also detected automatically and
   will appear as filters.

## 4. API reference

| Method | Endpoint         | Description                                      |
|--------|------------------|---------------------------------------------------|
| GET    | `/api/health`    | Health check + available forecast methods        |
| GET    | `/api/sample`    | (Re)load the bundled sample dataset               |
| POST   | `/api/upload`    | Upload a CSV (`multipart/form-data`, field `file`)|
| GET    | `/api/meta`      | Dataset metadata (row count, date range, filters) |
| GET    | `/api/data`      | Daily aggregated series (`?category=&region=`)    |
| GET    | `/api/stats`     | Summary stats (total, average, growth, best day)  |
| POST   | `/api/forecast`  | Run a forecast (see body below)                   |

**POST /api/forecast body:**
```json
{
  "method": "arima",
  "horizon": 30,
  "category": "Technology",
  "region": "West"
}
```
`method` is one of: `arima`, `moving_average`, `ses`, `holt_linear`, `holt_winters`, `linear_regression`.

For `arima`, Express proxies the request to the Python microservice
(`backend/ml_service`), which fits `statsmodels.tsa.arima.model.ARIMA`, auto-selecting
the `(p, d, q)` order via an AIC grid search (default search range: p ≤ 3, d ≤ 1, q ≤ 3).
The response includes the chosen order, AIC, and an 80% confidence interval per
forecasted day — genuinely fitted per request, not a lookup table.

## 5. Forecasting methods, briefly

- **ARIMA** *(statistical / ML-based)* — AutoRegressive Integrated Moving Average, fit via
  `statsmodels` in a dedicated Python microservice. The order `(p, d, q)` is selected
  automatically per request by grid-searching AIC. This is a genuinely fitted statistical
  model (parameters estimated from your data via maximum likelihood), not a fixed formula
  — the most defensible "ML-based forecasting" method in this project if that's a
  requirement for your submission. Note: ARIMA itself is a classical statistical model,
  not a neural network — if your coursework specifically requires deep learning, see the
  note at the bottom of this section.
- **Moving Average** — flat forecast at the recent N-day average. Simple baseline.
- **Simple Exponential Smoothing (SES)** — weights recent observations more heavily; good
  for data with no clear trend or seasonality.
- **Holt's Linear Trend** — SES plus a trend component; extrapolates a straight-line trend.
- **Holt-Winters** — trend + seasonal component (default weekly, `seasonLength=7`); the
  best general-purpose choice for daily retail data with weekday/weekend patterns.
- **Linear Regression** — ordinary least squares fit over time, extrapolated forward.

Each forecast response also includes **MAE**, **RMSE**, and **MAPE** computed on the
model's fit against historical data, so you can compare methods for your report. ARIMA
additionally returns the selected `(p, d, q)` order, AIC, and an 80% confidence interval.

> **On "ML-based forecasting":** ARIMA and the other methods here are classical time-series
> statistics, not neural networks — but ARIMA specifically involves parameter estimation
> via maximum likelihood on your actual data, which is why it's commonly taught and graded
> as an ML/AI forecasting technique in coursework. If your project brief specifically
> requires a neural approach (e.g. LSTM, as used in your TrAIde project), that would need
> an additional Python service with TensorFlow/PyTorch — let me know if you'd like that
> added alongside ARIMA rather than in place of it.

