import { diagnosticLogger } from './diagnosticLogger.js';

/**
 * Fetches monthly adjusted closing prices from Alpha Vantage API
 * and calculates monthly total returns, normalized to match the date range of primary strategy data.
 *
 * Return methodology:
 * - Uses Alpha Vantage TIME_SERIES_MONTHLY_ADJUSTED (adjusted for splits and dividends).
 * - When a month has a reported dividend and adjusted close equals raw close (common for
 *   some mutual funds), the dividend is added so the series matches Morningstar-style total return.
 * - Period returns may still differ slightly from Morningstar due to data source and month-end
 *   date conventions (e.g. last trading day vs. official NAV date).
 */
export const fetchSecondaryPortfolioReturns = async (tickers, weights, primaryReturnsDateRange) => {
  const TICKER_API_KEY = (process.env.TICKER_API_KEY || '').trim();
  
  // Log key fingerprint only (first 4 + last 4 chars) to confirm which key is in use
  const keyFingerprint = TICKER_API_KEY && TICKER_API_KEY.length >= 8
    ? `${TICKER_API_KEY.slice(0, 4)}...${TICKER_API_KEY.slice(-4)}`
    : '(not set)';
  diagnosticLogger.info('fetchSecondaryPortfolioReturns called', {
    tickerCount: tickers.length,
    tickers: tickers.map(t => t.ticker),
    hasApiKey: !!TICKER_API_KEY,
    apiKeyLength: TICKER_API_KEY?.length || 0,
    apiKeyFingerprint: keyFingerprint
  });

  if (!TICKER_API_KEY) {
    diagnosticLogger.error('TICKER_API_KEY not configured', {
      envVars: Object.keys(process.env).filter(k => k.includes('TICKER') || k.includes('API'))
    });
    throw new Error('TICKER_API_KEY environment variable not set');
  }

  if (!tickers || tickers.length === 0) {
    throw new Error('No tickers provided');
  }

  if (!primaryReturnsDateRange || !primaryReturnsDateRange.startDate || !primaryReturnsDateRange.endDate) {
    throw new Error('Primary returns date range is required for normalization');
  }

  // Validate weights sum to 100%
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  if (Math.abs(totalWeight - 100) > 0.01) {
    throw new Error(`Ticker weights must sum to 100% (current: ${totalWeight.toFixed(2)}%)`);
  }

  // Alpha Vantage rate limit: avoid "Burst pattern detected" by spacing requests (ms between each ticker)
  const delayMs = Math.max(1000, parseInt(process.env.ALPHAVANTAGE_DELAY_MS || '2000', 10));
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const fetchOneTicker = async (tickerObj) => {
    const ticker = tickerObj.ticker.toUpperCase().trim();
    diagnosticLogger.info(`Fetching data for ticker: ${ticker}`);

    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}&apikey=${TICKER_API_KEY}&datatype=json`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data['Error Message']) {
      diagnosticLogger.error(`Alpha Vantage error for ${ticker}`, { error: data['Error Message'] });
      throw new Error(`Alpha Vantage API error for ${ticker}: ${data['Error Message']}`);
    }

    const rateLimitNote = data['Note'] || data['Information'] || (typeof data['Error Message'] === 'string' && data['Error Message'].includes('Burst') ? data['Error Message'] : null);
    if (rateLimitNote && /burst|rate limit|too many|spread out/i.test(rateLimitNote)) {
      diagnosticLogger.warn(`Alpha Vantage rate limit for ${ticker}`, { note: rateLimitNote });
      throw new Error(`Alpha Vantage: ${rateLimitNote}`);
    }
    if (data['Note']) {
      diagnosticLogger.warn(`Alpha Vantage note for ${ticker}`, { note: data['Note'] });
      throw new Error(`Alpha Vantage API: ${data['Note']}`);
    }

    // Support both exact key and case/whitespace variants (API can differ by key or plan)
    let timeSeries = data['Monthly Adjusted Time Series'];
    if (!timeSeries && typeof data === 'object') {
      const key = Object.keys(data).find(k => /monthly\s*adjusted\s*time\s*series/i.test(k));
      if (key) timeSeries = data[key];
    }
    if (!timeSeries || typeof timeSeries !== 'object') {
      const dataKeys = Object.keys(data || {});
      const preview = dataKeys.reduce((acc, k) => {
        const v = data[k];
        acc[k] = typeof v === 'object' && v !== null ? `[object, ${Object.keys(v).length} keys]` : String(v).slice(0, 80);
        return acc;
      }, {});
      diagnosticLogger.error(`No time series data for ${ticker}`, { dataKeys, responsePreview: preview });
      const err = new Error(`No time series data found for ticker ${ticker}. API may return a different format for this key.`);
      err.responsePreview = preview;
      err.dataKeys = dataKeys;
      throw err;
    }

    const firstEntry = Object.values(timeSeries)[0];
    const adjustedCloseKey = (firstEntry && typeof firstEntry === 'object')
      ? (Object.keys(firstEntry).find(k => /adjusted\s*close/i.test(k)) || '5. adjusted close')
      : '5. adjusted close';
    const closeKey = (firstEntry && typeof firstEntry === 'object')
      ? (Object.keys(firstEntry).find(k => /^4\.\s*close$/i.test(k)) || '4. close')
      : '4. close';
    const dividendKey = (firstEntry && typeof firstEntry === 'object')
      ? (Object.keys(firstEntry).find(k => /dividend/i.test(k)))
      : '7. dividend amount';

    const monthlyData = Object.entries(timeSeries)
      .map(([date, values]) => {
        const adjClose = parseFloat(values[adjustedCloseKey] ?? values['5. adjusted close']);
        const close = parseFloat(values[closeKey] ?? values['4. close']);
        const div = parseFloat(values[dividendKey] ?? values['7. dividend amount'] ?? 0) || 0;
        return {
          date,
          adjustedClose: adjClose,
          close,
          dividendAmount: div
        };
      })
      .filter(item => !isNaN(item.adjustedClose))
      .sort((a, b) => a.date.localeCompare(b.date));

    if (monthlyData.length === 0) {
      throw new Error(`No valid price data found for ticker ${ticker}`);
    }

    diagnosticLogger.info(`Fetched ${monthlyData.length} months of data for ${ticker}`, {
      firstDate: monthlyData[0].date,
      lastDate: monthlyData[monthlyData.length - 1].date
    });

    // Monthly total return: (adjusted_close_curr / adjusted_close_prev) - 1.
    // Source-specific rule for funds where AV's recent data may not fully reflect dividends:
    // - For the last 12 months of the series, always add the current month's dividend when present
    //   so 1-year trailing return matches official sources.
    // - For older months, add dividend only when adjusted close equals raw close (no double-count),
    //   so 3/5/10 year returns stay correct.
    const RECENT_MONTHS_ADD_DIVIDEND = 12;
    const returns = [];
    for (let i = 1; i < monthlyData.length; i++) {
      const prev = monthlyData[i - 1];
      const curr = monthlyData[i];
      const prevPrice = prev.adjustedClose;
      let currValue = curr.adjustedClose;
      const div = curr.dividendAmount || 0;
      const isRecentMonth = (monthlyData.length - 1 - i) < RECENT_MONTHS_ADD_DIVIDEND;
      const adjustedEqualsClose = Math.abs(curr.adjustedClose - curr.close) < 1e-6;
      if (div > 0 && (isRecentMonth || adjustedEqualsClose)) {
        currValue = curr.adjustedClose + div;
      }
      const monthlyReturn = (currValue - prevPrice) / prevPrice;
      const date = curr.date.slice(0, 7);
      returns.push({ date, value: monthlyReturn });
    }

    return { ticker, returns, rawData: monthlyData };
  };

  try {
    const tickerResults = [];
    for (let i = 0; i < tickers.length; i++) {
      const tickerObj = tickers[i];
      if (i > 0) {
        await sleep(delayMs);
      }
      try {
        const result = await fetchOneTicker(tickerObj);
        tickerResults.push(result);
      } catch (error) {
        diagnosticLogger.error(`Error fetching data for ${tickerObj.ticker}`, {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    }
    diagnosticLogger.info('All ticker data fetched', {
      tickerCount: tickerResults.length
    });

    // Normalize date ranges: align all ticker returns to match primary strategy's date range
    const primaryStart = primaryReturnsDateRange.startDate; // "YYYY-MM"
    const primaryEnd = primaryReturnsDateRange.endDate; // "YYYY-MM"

    // Find the intersection of all date ranges
    let commonStart = primaryStart;
    let commonEnd = primaryEnd;

    tickerResults.forEach(result => {
      if (result.returns.length > 0) {
        const tickerStart = result.returns[0].date;
        const tickerEnd = result.returns[result.returns.length - 1].date;
        
        if (tickerStart > commonStart) commonStart = tickerStart;
        if (tickerEnd < commonEnd) commonEnd = tickerEnd;
      }
    });

    // If common range is invalid, use primary range and pad with zeros or trim
    if (commonStart > commonEnd) {
      diagnosticLogger.warn('Invalid common date range, using primary range', {
        commonStart,
        commonEnd,
        primaryStart,
        primaryEnd
      });
      commonStart = primaryStart;
      commonEnd = primaryEnd;
    }

    diagnosticLogger.info('Normalizing date ranges', {
      primaryStart,
      primaryEnd,
      commonStart,
      commonEnd
    });

    // Normalize each ticker's returns to the common date range
    const normalizedTickerReturns = tickerResults.map((result, index) => {
      const tickerWeight = weights[index] / 100; // Convert percentage to decimal
      const ticker = result.ticker;
      
      // Filter returns to common date range
      let filteredReturns = result.returns.filter(r => r.date >= commonStart && r.date <= commonEnd);
      
      // If we need to pad (ticker doesn't have data for all dates), pad with zeros
      // Generate all months in the range
      const allMonths = [];
      let currentDate = new Date(commonStart + '-01');
      const endDate = new Date(commonEnd + '-01');
      
      while (currentDate <= endDate) {
        const monthStr = currentDate.toISOString().slice(0, 7);
        allMonths.push(monthStr);
        currentDate.setMonth(currentDate.getMonth() + 1);
      }

      // Create a map of existing returns
      const returnMap = new Map(filteredReturns.map(r => [r.date, r.value]));
      
      // Fill in missing months with 0 return (or use previous month's return if available)
      const normalizedReturns = allMonths.map(date => {
        if (returnMap.has(date)) {
          return { date, value: returnMap.get(date) };
        } else {
          // Use 0 return for missing data (conservative approach)
          diagnosticLogger.warn(`Missing data for ${ticker} on ${date}, using 0 return`);
          return { date, value: 0 };
        }
      });

      return { ticker, weight: tickerWeight, returns: normalizedReturns };
    });

    // Calculate weighted composite return stream
    const compositeReturns = [];
    const firstTickerReturns = normalizedTickerReturns[0].returns;
    
    for (let i = 0; i < firstTickerReturns.length; i++) {
      const date = firstTickerReturns[i].date;
      let weightedReturn = 0;
      
      normalizedTickerReturns.forEach(({ weight, returns }) => {
        const tickerReturn = returns[i];
        if (tickerReturn && tickerReturn.date === date) {
          weightedReturn += tickerReturn.value * weight;
        }
      });
      
      compositeReturns.push({ date, value: weightedReturn });
    }

    diagnosticLogger.info('Secondary portfolio returns calculated', {
      returnCount: compositeReturns.length,
      firstDate: compositeReturns[0]?.date,
      lastDate: compositeReturns[compositeReturns.length - 1]?.date
    });

    return compositeReturns;
  } catch (error) {
    diagnosticLogger.error('Error in fetchSecondaryPortfolioReturns', {
      error: error.message,
      stack: error.stack,
      tickers: tickers.map(t => t.ticker)
    });
    throw error;
  }
};
