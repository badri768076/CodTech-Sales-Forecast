"""
ARIMA forecasting microservice.

This is a real statistical/ML forecasting service (as opposed to the plain-JS
heuristics in the Express backend). It fits an ARIMA(p,d,q) model with
automatic order selection (grid search over AIC) using statsmodels, and
returns fitted values, a forecast, confidence intervals, and error metrics.

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8001
"""

import warnings
from typing import List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from statsmodels.tsa.arima.model import ARIMA

warnings.filterwarnings("ignore")

app = FastAPI(title="Sales Forecast ARIMA Service")


class ForecastRequest(BaseModel):
    series: List[float]
    horizon: int = 30
    max_p: int = 3
    max_d: int = 1
    max_q: int = 3
    # If the series is long, fitting ARIMA on the full history can be slow;
    # optionally fit only on the most recent N points.
    fit_window: Optional[int] = 365


class ForecastResponse(BaseModel):
    order: List[int]
    aic: float
    fitted: List[float]
    forecast: List[float]
    lower: List[float]
    upper: List[float]
    metrics: dict


def find_best_order(series: np.ndarray, max_p: int, max_d: int, max_q: int):
    """Grid search over (p, d, q) combinations, selecting the model with lowest AIC."""
    best_aic = np.inf
    best_order = None
    best_model = None

    for d in range(max_d + 1):
        for p in range(max_p + 1):
            for q in range(max_q + 1):
                if p == 0 and q == 0:
                    continue
                try:
                    model = ARIMA(series, order=(p, d, q)).fit()
                    if model.aic < best_aic:
                        best_aic = model.aic
                        best_order = (p, d, q)
                        best_model = model
                except Exception:
                    continue

    if best_model is None:
        # Fallback: simple (1,1,1) if grid search failed entirely
        best_order = (1, 1, 1)
        best_model = ARIMA(series, order=best_order).fit()
        best_aic = best_model.aic

    return best_order, best_aic, best_model


def compute_metrics(actual: np.ndarray, fitted: np.ndarray):
    n = min(len(actual), len(fitted))
    actual = actual[-n:]
    fitted = fitted[-n:]
    errors = actual - fitted
    mae = float(np.mean(np.abs(errors)))
    rmse = float(np.sqrt(np.mean(errors ** 2)))
    nonzero = actual != 0
    mape = float(np.mean(np.abs(errors[nonzero] / actual[nonzero])) * 100) if nonzero.any() else 0.0
    return {"mae": round(mae, 2), "rmse": round(rmse, 2), "mape": round(mape, 2)}


@app.get("/health")
def health():
    return {"status": "ok", "service": "arima-forecast"}


@app.post("/forecast", response_model=ForecastResponse)
def forecast(req: ForecastRequest):
    if len(req.series) < 10:
        raise HTTPException(status_code=400, detail="Need at least 10 data points to fit ARIMA.")

    full_series = np.array(req.series, dtype=float)
    window = req.fit_window or len(full_series)
    fit_series = full_series[-window:] if window < len(full_series) else full_series

    try:
        order, aic, model = find_best_order(fit_series, req.max_p, req.max_d, req.max_q)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"ARIMA fitting failed: {exc}")

    fitted_values = model.fittedvalues
    # ARIMA fitted values can have fewer points than input when d > 0; pad the
    # front with the actual values so the array lengths line up for the chart.
    pad = len(fit_series) - len(fitted_values)
    fitted_full = np.concatenate([fit_series[:pad], fitted_values]) if pad > 0 else np.array(fitted_values)

    forecast_result = model.get_forecast(steps=req.horizon)
    forecast_mean = forecast_result.predicted_mean
    conf_int = forecast_result.conf_int(alpha=0.2)  # 80% confidence interval

    metrics = compute_metrics(fit_series, fitted_full)

    return ForecastResponse(
        order=list(order),
        aic=round(float(aic), 2),
        fitted=[round(float(v), 2) for v in fitted_full],
        forecast=[round(max(0.0, float(v)), 2) for v in forecast_mean],
        lower=[round(max(0.0, float(v)), 2) for v in conf_int[:, 0]],
        upper=[round(max(0.0, float(v)), 2) for v in conf_int[:, 1]],
        metrics=metrics,
    )
