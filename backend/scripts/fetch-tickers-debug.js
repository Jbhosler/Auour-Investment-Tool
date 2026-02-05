/**
 * Debug script: fetch Alpha Vantage TIME_SERIES_MONTHLY_ADJUSTED for specific tickers
 * to inspect the raw API response and diagnose "No time series data" issues.
 *
 * Usage (from backend folder):
 *   node scripts/fetch-tickers-debug.js YOUR_API_KEY
 *   node scripts/fetch-tickers-debug.js
 *     (uses TICKER_API_KEY from env or backend/.env)
 */

import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

const TICKERS = ['BALCX', 'GFACX', 'BFAFX'];
const FUNCTION = 'TIME_SERIES_MONTHLY_ADJUSTED';

async function fetchTicker(symbol, apiKey) {
  const url = `https://www.alphavantage.co/query?function=${FUNCTION}&symbol=${symbol}&apikey=${apiKey}&datatype=json`;
  const res = await fetch(url);
  if (!res.ok) {
    return { _error: `HTTP ${res.status} ${res.statusText}` };
  }
  return res.json();
}

function summarize(data) {
  const keys = Object.keys(data || {});
  const hasTimeSeries = !!data?.['Monthly Adjusted Time Series'];
  const timeSeriesKey = keys.find(k => /monthly\s*adjusted\s*time\s*series/i.test(k));
  const preview = {};
  for (const k of keys) {
    const v = data[k];
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const subKeys = Object.keys(v);
      preview[k] = subKeys.length > 3 ? `[object with ${subKeys.length} keys: ${subKeys.slice(0, 3).join(', ')}...]` : `[object: ${subKeys.join(', ')}]`;
    } else {
      preview[k] = typeof v === 'string' ? v.slice(0, 120) : String(v);
    }
  }
  return { keys, hasTimeSeries, timeSeriesKey, preview };
}

async function main() {
  const apiKey = process.argv[2] || process.env.TICKER_API_KEY;
  if (!apiKey) {
    console.error('Missing API key. Use: node scripts/fetch-tickers-debug.js YOUR_API_KEY');
    console.error('Or set TICKER_API_KEY in the environment or in backend/.env');
    process.exit(1);
  }

  console.log('Alpha Vantage debug – same request as backend (TIME_SERIES_MONTHLY_ADJUSTED)\n');
  console.log('Tickers:', TICKERS.join(', '));
  console.log('');

  const allResponses = {};

  for (let i = 0; i < TICKERS.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 500));
    const ticker = TICKERS[i];
    console.log('---');
    console.log('Ticker:', ticker);
    const data = await fetchTicker(ticker, apiKey);

    if (data._error) {
      console.log('Error:', data._error);
      allResponses[ticker] = data;
      console.log('');
      continue;
    }

    allResponses[ticker] = data;
    const { keys, hasTimeSeries, timeSeriesKey, preview } = summarize(data);
    console.log('Top-level keys:', keys.join(', '));
    console.log('Has "Monthly Adjusted Time Series":', hasTimeSeries);
    if (timeSeriesKey && !data['Monthly Adjusted Time Series']) {
      console.log('Matching key found:', timeSeriesKey);
    }
    console.log('Preview (top-level):', JSON.stringify(preview, null, 2));

    if (data['Error Message']) {
      console.log('API Error Message:', data['Error Message']);
    }
    if (data['Note']) {
      console.log('API Note:', data['Note']);
    }

    const ts = data['Monthly Adjusted Time Series'] || (timeSeriesKey && data[timeSeriesKey]);
    if (ts && typeof ts === 'object') {
      const dates = Object.keys(ts).sort().slice(0, 3);
      console.log('Sample dates (first 3):', dates);
      if (dates[0]) {
        console.log('Sample data point:', JSON.stringify(ts[dates[0]], null, 2));
      }
    }

    console.log('');
  }

  const outPath = join(__dirname, 'fetch-tickers-debug-output.json');
  fs.writeFileSync(outPath, JSON.stringify(allResponses, null, 2), 'utf8');
  console.log('---');
  console.log('Done. Full responses saved to', outPath);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
