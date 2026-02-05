/**
 * Fetch MYFRX from Alpha Vantage and print raw monthly data + computed returns
 * for comparison with user-provided adjusted close. Run from backend:
 *   node scripts/compare-myfrx-prices.js
 */

import 'dotenv/config';

const API_KEY = process.argv[2] || process.env.TICKER_API_KEY || 'NVW7DVTYPV80XPYH';
const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=MYFRX&apikey=${API_KEY}&datatype=json`;

async function main() {
  const res = await fetch(url);
  const data = await res.json();
  if (data['Error Message']) {
    console.error('API Error:', data['Error Message']);
    process.exit(1);
  }
  const ts = data['Monthly Adjusted Time Series'] || data[Object.keys(data).find(k => /monthly\s*adjusted/i.test(k))];
  if (!ts) {
    console.error('No time series. Keys:', Object.keys(data));
    process.exit(1);
  }

  const entries = Object.entries(ts)
    .map(([date, v]) => ({
      date,
      adjClose: parseFloat(v['5. adjusted close'] ?? v[Object.keys(v).find(k => /adjusted\s*close/i.test(k))]),
      close: parseFloat(v['4. close'] ?? v[Object.keys(v).find(k => /^4\.\s*close$/i.test(k))]),
      dividend: parseFloat(v['7. dividend amount'] ?? v[Object.keys(v).find(k => /dividend/i.test(k))] ?? 0) || 0
    }))
    .filter(r => !isNaN(r.adjClose))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Last ~15 months for comparison with user's data
  const recent = entries.slice(-15);
  console.log('Alpha Vantage MYFRX – last 15 months (month-end dates)\n');
  console.log('Date       | Adj Close | Close   | Div    | Mo return (adj close only)');
  console.log('-----------|-----------|--------|--------|---------------------------');

  let prevAdj = null;
  for (const r of recent) {
    const moReturn = prevAdj != null ? ((r.adjClose - prevAdj) / prevAdj * 100).toFixed(3) + '%' : '–';
    console.log(`${r.date} | ${r.adjClose.toFixed(2).padStart(9)} | ${r.close.toFixed(2).padStart(6)} | ${(r.dividend || 0).toFixed(3).padStart(6)} | ${moReturn}`);
    prevAdj = r.adjClose;
  }

  // Same return logic as tickerService: (curr/prev)-1, with dividend add-back when adj===close
  const returns = [];
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];
    let currValue = curr.adjClose;
    const div = curr.dividend || 0;
    const adjEqClose = Math.abs(curr.adjClose - curr.close) < 1e-6;
    if (div > 0 && adjEqClose) currValue = curr.adjClose + div;
    const monthlyReturn = (currValue - prev.adjClose) / prev.adjClose;
    returns.push({ date: curr.date.slice(0, 7), value: monthlyReturn });
  }

  const last12 = returns.slice(-12);
  const product = last12.reduce((acc, r) => acc * (1 + r.value), 1);
  const annualized = (Math.pow(product, 12 / 12) - 1) * 100;
  console.log('\nLast 12 months (by our labels):', last12.map(r => r.date).join(', '));
  console.log('Product(1+r):', product.toFixed(6));
  console.log('1-Year (current logic, adj close only or add div when adj=close):', annualized.toFixed(2) + '%');

  // Alternative: always add dividend to current month (total return if AV adj close is split-only)
  const returnsWithDiv = [];
  for (let i = 1; i < entries.length; i++) {
    const prev = entries[i - 1];
    const curr = entries[i];
    const currValue = curr.adjClose + (curr.dividend || 0);
    const monthlyReturn = (currValue - prev.adjClose) / prev.adjClose;
    returnsWithDiv.push({ date: curr.date.slice(0, 7), value: monthlyReturn });
  }
  const last12WithDiv = returnsWithDiv.slice(-12);
  const productWithDiv = last12WithDiv.reduce((acc, r) => acc * (1 + r.value), 1);
  const annualizedWithDiv = (productWithDiv - 1) * 100;
  console.log('1-Year (always add dividend to current month):', annualizedWithDiv.toFixed(2) + '%');

  // User's data: Dec 2024 adj 9.15 -> Jan 2026 adj 9.63. 14 months. Annualized = (9.63/9.15)^(12/14)-1
  const userStart = 9.15, userEnd = 9.63, userMonths = 14;
  const userAnnualized = (Math.pow(userEnd / userStart, 12 / userMonths) - 1) * 100;
  console.log('\nFrom your numbers (9.15 -> 9.63 over 14 months):');
  console.log('  Implied annualized:', userAnnualized.toFixed(2) + '%');
}

main().catch(err => { console.error(err); process.exit(1); });
