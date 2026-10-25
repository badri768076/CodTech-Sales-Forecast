import React, { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const INK = '#1c2b39';
const INK_FAINT = '#8b9aa6';
const ACTUAL = '#2b6ca3';
const FORECAST = '#b5651d';

function formatDateShort(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

export default function ForecastChart({ historical, forecast, windowDays = 120 }) {
  const chartData = useMemo(() => {
    if (!historical?.length) return [];
    const recentHistorical = historical.slice(-windowDays);
    const rows = recentHistorical.map((h) => ({ date: h.date, actual: h.sales }));

    if (forecast?.length) {
      // Bridge point so the forecast line connects visually to the actual line
      const lastActual = recentHistorical[recentHistorical.length - 1];
      rows[rows.length - 1] = {
        ...rows[rows.length - 1],
        forecast: lastActual.sales,
        ciLow: lastActual.sales,
        ciBand: 0,
      };
      forecast.forEach((f) => {
        const hasCi = f.lower != null && f.upper != null;
        rows.push({
          date: f.date,
          forecast: f.value,
          ciLow: hasCi ? f.lower : undefined,
          ciBand: hasCi ? f.upper - f.lower : undefined,
        });
      });
    }
    return rows;
  }, [historical, forecast, windowDays]);

  const hasConfidenceInterval = forecast?.some((f) => f.lower != null && f.upper != null);

  const todayDate = historical?.length ? historical[historical.length - 1].date : null;

  if (!chartData.length) return <div className="empty-state">No data to plot yet.</div>;

  return (
    <div>
      <div className="chart-legend">
        <span>
          <span className="legend-swatch" style={{ background: ACTUAL }} /> Actual sales
        </span>
        <span>
          <span className="legend-swatch" style={{ background: FORECAST, opacity: 0.8 }} /> Forecast
        </span>
        {hasConfidenceInterval && (
          <span>
            <span className="legend-swatch" style={{ background: FORECAST, opacity: 0.18 }} /> 80% confidence band
          </span>
        )}
        <span style={{ color: INK_FAINT }}>┊ Today — {todayDate}</span>
      </div>
      <ResponsiveContainer width="100%" height={340}>
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#ddd6c4" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateShort}
            tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fill: INK_FAINT }}
            minTickGap={40}
            axisLine={{ stroke: '#c9c0a8' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontFamily: 'IBM Plex Mono', fontSize: 11, fill: INK_FAINT }}
            tickFormatter={(v) => `$${Math.round(v / 100) / 10}k`}
            axisLine={false}
            tickLine={false}
            width={52}
          />
          <Tooltip
            contentStyle={{
              fontFamily: 'IBM Plex Mono',
              fontSize: 12,
              border: '1px solid #1c2b39',
              borderRadius: 3,
              background: '#fbf9f4',
            }}
            labelFormatter={(d) => formatDateShort(d)}
            formatter={(value, name) => {
              if (name === 'ciLow' || name === 'ciBand') return [null, null];
              return [`$${value.toLocaleString()}`, name === 'actual' ? 'Actual' : 'Forecast'];
            }}
          />
          {todayDate && (
            <ReferenceLine
              x={todayDate}
              stroke={INK}
              strokeDasharray="3 3"
              label={{ value: 'TODAY', position: 'insideTopRight', fontSize: 10, fill: INK, fontFamily: 'IBM Plex Mono' }}
            />
          )}
          {hasConfidenceInterval && (
            <>
              <Area
                type="monotone"
                dataKey="ciLow"
                stackId="ci"
                stroke="none"
                fill="transparent"
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
              />
              <Area
                type="monotone"
                dataKey="ciBand"
                stackId="ci"
                stroke="none"
                fill={FORECAST}
                fillOpacity={0.15}
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
              />
            </>
          )}
          <Line type="monotone" dataKey="actual" stroke={ACTUAL} strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line
            type="monotone"
            dataKey="forecast"
            stroke={FORECAST}
            strokeWidth={2}
            strokeDasharray="5 3"
            dot={false}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
