/**
 * Forecasting engine — pure JS implementations of classic time-series
 * forecasting methods, applied to a daily-aggregated sales series.
 *
 * Input series: number[] (chronological, no gaps)
 * All functions return: { fitted: number[], forecast: number[] }
 */

function movingAverage(series, horizon, window = 7) {
  const fitted = [];
  for (let i = 0; i < series.length; i++) {
    const start = Math.max(0, i - window + 1);
    const slice = series.slice(start, i + 1);
    fitted.push(avg(slice));
  }
  const lastWindow = series.slice(-window);
  const flatValue = avg(lastWindow);
  const forecast = new Array(horizon).fill(flatValue);
  return { fitted, forecast };
}

function simpleExponentialSmoothing(series, horizon, alpha = 0.3) {
  const fitted = [series[0]];
  for (let i = 1; i < series.length; i++) {
    fitted.push(alpha * series[i - 1] + (1 - alpha) * fitted[i - 1]);
  }
  const level = alpha * series[series.length - 1] + (1 - alpha) * fitted[fitted.length - 1];
  const forecast = new Array(horizon).fill(level);
  return { fitted, forecast };
}

// Holt's linear trend method (double exponential smoothing)
function holtLinear(series, horizon, alpha = 0.3, beta = 0.1) {
  let level = series[0];
  let trend = series[1] - series[0];
  const fitted = [level];

  for (let i = 1; i < series.length; i++) {
    const value = series[i];
    const prevLevel = level;
    level = alpha * value + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    fitted.push(prevLevel + trend);
  }

  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    forecast.push(level + h * trend);
  }
  return { fitted, forecast };
}

// Holt-Winters additive method (triple exponential smoothing) — trend + seasonality
function holtWinters(series, horizon, seasonLength = 7, alpha = 0.3, beta = 0.1, gamma = 0.2) {
  if (series.length < seasonLength * 2) {
    // Not enough data for seasonal decomposition — fall back to Holt's linear
    return holtLinear(series, horizon, alpha, beta);
  }

  const seasons = Math.floor(series.length / seasonLength);
  // Initial level & trend from first two full seasons
  const season1Avg = avg(series.slice(0, seasonLength));
  const season2Avg = avg(series.slice(seasonLength, seasonLength * 2));
  let level = season1Avg;
  let trend = (season2Avg - season1Avg) / seasonLength;

  // Initial seasonal indices (averaged across available full seasons)
  const seasonal = new Array(seasonLength).fill(0);
  for (let s = 0; s < Math.min(seasons, 4); s++) {
    const segment = series.slice(s * seasonLength, (s + 1) * seasonLength);
    const segAvg = avg(segment);
    for (let i = 0; i < seasonLength; i++) {
      seasonal[i] += (segment[i] - segAvg) / Math.min(seasons, 4);
    }
  }

  const fitted = [];
  for (let i = 0; i < series.length; i++) {
    const seasonIdx = i % seasonLength;
    const value = series[i];
    fitted.push(level + trend + seasonal[seasonIdx]);

    const prevLevel = level;
    level = alpha * (value - seasonal[seasonIdx]) + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
    seasonal[seasonIdx] = gamma * (value - level) + (1 - gamma) * seasonal[seasonIdx];
  }

  const forecast = [];
  for (let h = 1; h <= horizon; h++) {
    const seasonIdx = (series.length + h - 1) % seasonLength;
    forecast.push(level + h * trend + seasonal[seasonIdx]);
  }
  return { fitted, forecast };
}

// Ordinary least squares linear regression on index -> value, extrapolated
function linearRegression(series, horizon) {
  const n = series.length;
  const xMean = (n - 1) / 2;
  const yMean = avg(series);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (series[i] - yMean);
    den += (i - xMean) ** 2;
  }
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;

  const fitted = [];
  for (let i = 0; i < n; i++) fitted.push(intercept + slope * i);

  const forecast = [];
  for (let h = 1; h <= horizon; h++) forecast.push(intercept + slope * (n - 1 + h));

  return { fitted, forecast };
}

function avg(arr) {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function metrics(actual, fitted) {
  const n = Math.min(actual.length, fitted.length);
  let sumAbsErr = 0;
  let sumSqErr = 0;
  let sumAbsPctErr = 0;
  let count = 0;
  for (let i = 0; i < n; i++) {
    const err = actual[i] - fitted[i];
    sumAbsErr += Math.abs(err);
    sumSqErr += err * err;
    if (actual[i] !== 0) {
      sumAbsPctErr += Math.abs(err / actual[i]);
      count++;
    }
  }
  return {
    mae: n ? sumAbsErr / n : 0,
    rmse: n ? Math.sqrt(sumSqErr / n) : 0,
    mape: count ? (sumAbsPctErr / count) * 100 : 0,
  };
}

const METHODS = {
  moving_average: (series, horizon, opts) => movingAverage(series, horizon, opts.window || 7),
  ses: (series, horizon, opts) => simpleExponentialSmoothing(series, horizon, opts.alpha ?? 0.3),
  holt_linear: (series, horizon, opts) => holtLinear(series, horizon, opts.alpha ?? 0.3, opts.beta ?? 0.1),
  holt_winters: (series, horizon, opts) =>
    holtWinters(series, horizon, opts.seasonLength || 7, opts.alpha ?? 0.3, opts.beta ?? 0.1, opts.gamma ?? 0.2),
  linear_regression: (series, horizon) => linearRegression(series, horizon),
};

function runForecast(series, method, horizon, opts = {}) {
  const fn = METHODS[method];
  if (!fn) throw new Error(`Unknown forecasting method: ${method}`);
  const { fitted, forecast } = fn(series, horizon, opts);
  const errorMetrics = metrics(series, fitted);
  return { fitted, forecast, metrics: errorMetrics };
}

module.exports = { runForecast, METHODS: Object.keys(METHODS) };
