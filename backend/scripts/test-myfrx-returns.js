/**
 * Test MYFRX 1/3/5/10 year returns using tickerService (new logic + Alpha Vantage).
 * Run from backend folder:
 *   node scripts/test-myfrx-returns.js
 *   node scripts/test-myfrx-returns.js YOUR_ALPHA_VANTAGE_KEY
 * Uses: argv key > TICKER_API_KEY env/.env > EMBEDDED_ALPHA_VANTAGE_KEY below.
 */

import 'dotenv/config';
import { fetchSecondaryPortfolioReturns } from '../tickerService.js';

// Optional: paste your Alpha Vantage API key here to run without env (avoid committing real keys)
const EMBEDDED_ALPHA_VANTAGE_KEY = '';

const apiKey = process.argv[2] || process.env.TICKER_API_KEY || EMBEDDED_ALPHA_VANTAGE_KEY;
if (apiKey) process.env.TICKER_API_KEY = apiKey;

function calculateAnnualizedReturn(returns, years, asOfEndMonth) {
  const months = years * 12;
  let subset = returns;
  if (asOfEndMonth) {
    const idx = returns.findIndex(r => r.date === asOfEndMonth);
    if (idx < 0) return null;
    subset = returns.slice(0, idx + 1);
  }
  if (subset.length < months) return null;
  const relevantReturns = subset.slice(-months);
  const product = relevantReturns.reduce((acc, r) => acc * (1 + r.value), 1);
  return Math.pow(product, 12 / months) - 1;
}

function run() {
  const end = new Date();
  const endDate = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}`;
  const start = new Date(end);
  start.setFullYear(start.getFullYear() - 15);
  const startDate = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`;

  const tickers = [{ ticker: 'MYFRX', weight: 100 }];
  const weights = [100];
  const primaryReturnsDateRange = { startDate, endDate };

  // Official trailing returns are typically as of quarter end (e.g. 12/31/2025)
  const asOfQuarterEnd = '2025-12';

  console.log('MYFRX returns test (new logic + Alpha Vantage)');
  console.log('Date range:', startDate, 'to', endDate);
  console.log('');

  fetchSecondaryPortfolioReturns(tickers, weights, primaryReturnsDateRange)
    .then((returns) => {
      if (!returns || returns.length === 0) {
        console.log('No returns returned.');
        return;
      }
      console.log('Monthly returns count:', returns.length);
      console.log('First month:', returns[0].date, 'Last month:', returns[returns.length - 1].date);
      console.log('Trailing returns as of quarter end:', asOfQuarterEnd);
      console.log('');

      const oneY = calculateAnnualizedReturn(returns, 1, asOfQuarterEnd);
      const threeY = calculateAnnualizedReturn(returns, 3, asOfQuarterEnd);
      const fiveY = calculateAnnualizedReturn(returns, 5, asOfQuarterEnd);
      const tenY = calculateAnnualizedReturn(returns, 10, asOfQuarterEnd);

      console.log('Annualized returns (as of ' + asOfQuarterEnd + ', no double-count):');
      console.log('  1 Year: ', oneY != null ? `${(oneY * 100).toFixed(2)}%` : 'N/A', '(official 4.67%)');
      console.log('  3 Year: ', threeY != null ? `${(threeY * 100).toFixed(2)}%` : 'N/A', '(official 6.27%)');
      console.log('  5 Year: ', fiveY != null ? `${(fiveY * 100).toFixed(2)}%` : 'N/A', '(official 4.16%)');
      console.log('  10 Year:', tenY != null ? `${(tenY * 100).toFixed(2)}%` : 'N/A', '(official 2.93%)');
    })
    .catch((err) => {
      console.error('Error:', err.message);
      process.exitCode = 1;
    });
}

run();
