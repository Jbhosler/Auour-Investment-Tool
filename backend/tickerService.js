import { diagnosticLogger } from './diagnosticLogger.js';

/**
 * Fetches monthly adjusted closing prices from Alpha Vantage API
 * and calculates monthly returns, normalized to match the date range of primary strategy data.
 */
export const fetchSecondaryPortfolioReturns = async (tickers, weights, primaryReturnsDateRange) => {
  const TICKER_API_KEY = process.env.TICKER_API_KEY;
  
  diagnosticLogger.info('fetchSecondaryPortfolioReturns called', {
    tickerCount: tickers.length,
    tickers: tickers.map(t => t.ticker),
    hasApiKey: !!TICKER_API_KEY,
    apiKeyLength: TICKER_API_KEY?.length || 0
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

  try {
    // Fetch data for each ticker
    const tickerDataPromises = tickers.map(async (tickerObj) => {
      const ticker = tickerObj.ticker.toUpperCase().trim();
      diagnosticLogger.info(`Fetching data for ticker: ${ticker}`);

      try {
        // Alpha Vantage TIME_SERIES_MONTHLY_ADJUSTED endpoint
        const url = `https://www.alphavantage.co/query?function=TIME_SERIES_MONTHLY_ADJUSTED&symbol=${ticker}&apikey=${TICKER_API_KEY}&datatype=json`;
        
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`Alpha Vantage API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        // Check for API errors
        if (data['Error Message']) {
          diagnosticLogger.error(`Alpha Vantage error for ${ticker}`, { error: data['Error Message'] });
          throw new Error(`Alpha Vantage API error for ${ticker}: ${data['Error Message']}`);
        }

        if (data['Note']) {
          diagnosticLogger.warn(`Alpha Vantage rate limit for ${ticker}`, { note: data['Note'] });
          throw new Error(`Alpha Vantage API rate limit exceeded. Please try again later.`);
        }

        const timeSeries = data['Monthly Adjusted Time Series'];
        if (!timeSeries) {
          diagnosticLogger.error(`No time series data for ${ticker}`, { dataKeys: Object.keys(data) });
          throw new Error(`No time series data found for ticker ${ticker}`);
        }

        // Convert to array of { date, adjustedClose } sorted by date (oldest first)
        const monthlyData = Object.entries(timeSeries)
          .map(([date, values]) => ({
            date: date, // Format: "YYYY-MM-DD"
            adjustedClose: parseFloat(values['5. adjusted close'])
          }))
          .filter(item => !isNaN(item.adjustedClose))
          .sort((a, b) => a.date.localeCompare(b.date));

        if (monthlyData.length === 0) {
          throw new Error(`No valid price data found for ticker ${ticker}`);
        }

        diagnosticLogger.info(`Fetched ${monthlyData.length} months of data for ${ticker}`, {
          firstDate: monthlyData[0].date,
          lastDate: monthlyData[monthlyData.length - 1].date
        });

        // Calculate monthly returns (month-over-month)
        const returns = [];
        for (let i = 1; i < monthlyData.length; i++) {
          const prevPrice = monthlyData[i - 1].adjustedClose;
          const currPrice = monthlyData[i].adjustedClose;
          const monthlyReturn = (currPrice - prevPrice) / prevPrice;
          
          // Use the date of the current month (when the return is realized)
          const date = monthlyData[i].date.slice(0, 7); // "YYYY-MM"
          returns.push({ date, value: monthlyReturn });
        }

        return { ticker, returns, rawData: monthlyData };
      } catch (error) {
        diagnosticLogger.error(`Error fetching data for ${ticker}`, {
          error: error.message,
          stack: error.stack
        });
        throw error;
      }
    });

    // Wait for all ticker data
    const tickerResults = await Promise.all(tickerDataPromises);
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
