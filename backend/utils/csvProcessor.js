const { parse } = require('csv-parse/sync');

const DATE_KEYS = ['order date', 'date', 'orderdate', 'invoice date', 'sale date', 'transaction date'];
const SALES_KEYS = ['sales', 'amount', 'revenue', 'total', 'order amount', 'sale amount', 'total sales'];
const CATEGORY_KEYS = ['category', 'product category', 'segment'];
const REGION_KEYS = ['region', 'state', 'country', 'market'];

function findColumn(headers, candidates) {
  const lowerHeaders = headers.map((h) => h.trim().toLowerCase());
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate);
    if (idx !== -1) return headers[idx];
  }
  // fallback: partial match
  for (const candidate of candidates) {
    const idx = lowerHeaders.findIndex((h) => h.includes(candidate));
    if (idx !== -1) return headers[idx];
  }
  return null;
}

function parseDate(value) {
  // Handles ISO (YYYY-MM-DD), US (MM/DD/YYYY), and DD/MM/YYYY-ish inputs
  if (!value) return null;
  const iso = Date.parse(value);
  if (!isNaN(iso)) return new Date(iso);
  const parts = value.split(/[/-]/);
  if (parts.length === 3) {
    const [a, b, c] = parts.map((p) => parseInt(p, 10));
    const year = c > 31 ? c : a > 31 ? a : c;
    const guess = new Date(year, (a > 12 ? b : a) - 1, a > 12 ? a : b);
    if (!isNaN(guess.getTime())) return guess;
  }
  return null;
}

function processCsv(csvText) {
  const records = parse(csvText, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (!records.length) throw new Error('CSV file is empty or invalid');

  const headers = Object.keys(records[0]);
  const dateCol = findColumn(headers, DATE_KEYS);
  const salesCol = findColumn(headers, SALES_KEYS);
  const categoryCol = findColumn(headers, CATEGORY_KEYS);
  const regionCol = findColumn(headers, REGION_KEYS);

  if (!dateCol || !salesCol) {
    throw new Error(
      `Could not auto-detect required columns. Found headers: [${headers.join(', ')}]. ` +
        `Expected a date column (e.g. "Order Date") and a numeric sales column (e.g. "Sales").`
    );
  }

  const cleaned = [];
  for (const row of records) {
    const date = parseDate(row[dateCol]);
    const salesRaw = row[salesCol];
    const sales = parseFloat(String(salesRaw).replace(/[^0-9.-]/g, ''));
    if (!date || isNaN(sales)) continue;
    cleaned.push({
      date: date.toISOString().slice(0, 10),
      sales,
      category: categoryCol ? row[categoryCol] : null,
      region: regionCol ? row[regionCol] : null,
    });
  }

  if (!cleaned.length) {
    throw new Error('No valid rows could be parsed from the CSV after cleaning.');
  }

  return {
    rows: cleaned,
    detectedColumns: { date: dateCol, sales: salesCol, category: categoryCol, region: regionCol },
    categories: categoryCol ? [...new Set(cleaned.map((r) => r.category).filter(Boolean))].sort() : [],
    regions: regionCol ? [...new Set(cleaned.map((r) => r.region).filter(Boolean))].sort() : [],
  };
}

function aggregateDaily(rows, { category = null, region = null } = {}) {
  const filtered = rows.filter(
    (r) => (!category || category === 'All' || r.category === category) && (!region || region === 'All' || r.region === region)
  );

  const byDate = new Map();
  for (const row of filtered) {
    byDate.set(row.date, (byDate.get(row.date) || 0) + row.sales);
  }

  const dates = [...byDate.keys()].sort();
  if (!dates.length) return [];

  // Fill gaps with 0 so the series has no missing days (important for seasonality math)
  const filled = [];
  const start = new Date(dates[0]);
  const end = new Date(dates[dates.length - 1]);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    filled.push({ date: key, sales: Math.round((byDate.get(key) || 0) * 100) / 100 });
  }
  return filled;
}

module.exports = { processCsv, aggregateDaily };
