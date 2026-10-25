// Generates a synthetic sales dataset shaped like Kaggle's popular
// "Superstore Sales" dataset (Order Date, Category, Region, Sales, ...)
// so the app works out of the box. Real Kaggle CSVs can replace this file
// via the Upload panel in the UI.
const fs = require('fs');
const path = require('path');

const categories = ['Furniture', 'Office Supplies', 'Technology'];
const regions = ['North', 'South', 'East', 'West'];
const subCategoryMap = {
  Furniture: ['Chairs', 'Tables', 'Bookcases'],
  'Office Supplies': ['Binders', 'Paper', 'Storage'],
  Technology: ['Phones', 'Accessories', 'Machines'],
};

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rand = seededRandom(42);

function gaussianNoise(mean, sd) {
  const u1 = rand() || 1e-6;
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * sd;
}

const startDate = new Date('2023-01-01');
const endDate = new Date('2025-12-31');
const rows = [];
let orderId = 1000;

for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
  const dayOfYear = Math.floor((d - startDate) / 86400000);
  const dayOfWeek = d.getDay(); // 0 Sun - 6 Sat
  const month = d.getMonth();

  // Long-term upward trend
  const trend = 1 + dayOfYear * 0.0006;
  // Weekly seasonality: weekends lower for B2B-style office supplies, higher for tech deals
  const weeklyFactor = [0.75, 1.05, 1.08, 1.1, 1.12, 1.15, 0.85][dayOfWeek];
  // Yearly seasonality: Nov/Dec holiday spike, summer dip
  const yearlyFactor = 1 + 0.35 * Math.sin(((month + 9) / 12) * 2 * Math.PI) * (month >= 9 || month <= 0 ? 1.4 : 0.6);

  // Number of orders that day
  const baseOrders = 8 * trend * weeklyFactor * yearlyFactor;
  const numOrders = Math.max(1, Math.round(gaussianNoise(baseOrders, baseOrders * 0.2)));

  for (let i = 0; i < numOrders; i++) {
    const category = categories[Math.floor(rand() * categories.length)];
    const subCats = subCategoryMap[category];
    const subCategory = subCats[Math.floor(rand() * subCats.length)];
    const region = regions[Math.floor(rand() * regions.length)];

    let baseSale = category === 'Technology' ? 350 : category === 'Furniture' ? 220 : 60;
    const sales = Math.max(5, gaussianNoise(baseSale, baseSale * 0.5)) * (0.9 + 0.2 * rand());
    const quantity = 1 + Math.floor(rand() * 5);
    const discount = [0, 0, 0, 0.1, 0.15, 0.2][Math.floor(rand() * 6)];
    const profit = sales * (0.12 + rand() * 0.2 - discount * 0.5);

    rows.push({
      'Order ID': `ORD-${orderId++}`,
      'Order Date': d.toISOString().slice(0, 10),
      Category: category,
      'Sub-Category': subCategory,
      Region: region,
      Sales: sales.toFixed(2),
      Quantity: quantity,
      Discount: discount,
      Profit: profit.toFixed(2),
    });
  }
}

const header = Object.keys(rows[0]).join(',');
const csvLines = rows.map((r) => Object.values(r).join(','));
const csv = [header, ...csvLines].join('\n');

fs.writeFileSync(path.join(__dirname, 'sample_sales.csv'), csv);
console.log(`Generated ${rows.length} rows -> sample_sales.csv`);
