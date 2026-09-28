/**
 * Fetches strategy characteristics from Alpha Vantage (OVERVIEW + GLOBAL_QUOTE)
 * for tickers with weights. Returns weighted averages per strategy.
 *
 * Characteristics: Trailing Dividend Yield, Forward Dividend Yield, P/E, Beta,
 * Sector, Market Cap, etc.
 */

const AV_BASE = 'https://www.alphavantage.co/query';
const AV_DELAY_MS = 900;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let _avQueue = Promise.resolve();
let _didLogKeyDiagnostics = false;

function getTickerApiKey() {
  const raw = process.env.TICKER_API_KEY ?? '';
  const key = raw.trim();
  if (!key) throw new Error('TICKER_API_KEY environment variable not set');
  if (raw !== key) {
    console.warn('[av] TICKER_API_KEY contained leading/trailing whitespace; trimmed before use.');
  }
  if (!_didLogKeyDiagnostics) {
    _didLogKeyDiagnostics = true;
    console.log(`[av] Using AlphaVantage key fingerprint: len=${key.length}, suffix=...${key.slice(-4)}`);
    if (!/^[A-Z0-9]{16}$/.test(key)) {
      console.warn('[av] AlphaVantage key format looks unusual (expected 16 uppercase alphanumeric chars).');
    }
  }
  return key;
}

async function avGet(params) {
  return (_avQueue = _avQueue.then(async () => {
    await sleep(AV_DELAY_MS);
    const url = new URL(AV_BASE);
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, String(v));
    }
    url.searchParams.set('apikey', getTickerApiKey());
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  }));
}

async function fetchOverview(ticker) {
  const data = await avGet({ function: 'OVERVIEW', symbol: ticker });
  if (data['Error Message']) throw new Error(data['Error Message']);
  if (data['Note'] && /rate limit|burst/i.test(data['Note'])) throw new Error(data['Note']);
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error('No overview data (may not support ETFs/mutual funds)');
  }
  return data;
}

async function fetchQuote(ticker) {
  const data = await avGet({ function: 'GLOBAL_QUOTE', symbol: ticker });
  if (data['Error Message']) throw new Error(data['Error Message']);
  const q = data['Global Quote'];
  if (!q) return null;
  const price = parseFloat(q['05. price'] || q['08. previous close'] || 0);
  return { price };
}

async function fetchETFProfile(ticker) {
  const data = await avGet({ function: 'ETF_PROFILE', symbol: ticker });
  if (data['Error Message']) throw new Error(data['Error Message']);
  if (data['Note'] && /rate limit|burst/i.test(data['Note'])) throw new Error(data['Note']);
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    throw new Error('No ETF profile data');
  }
  return data;
}

function parseNum(val) {
  if (val === null || val === undefined || val === '') return null;
  const n = parseFloat(String(val));
  return isNaN(n) ? null : n;
}

function parsePct(val) {
  const n = parseNum(val);
  if (n === null) return null;
  return n <= 1 ? n * 100 : n;
}

/**
 * @param {Array<{ strategyName: string, tickers: Array<{ ticker: string, weight: number }> }>} strategies
 * @returns {Promise<Array<{ strategyName, characteristics, tickerDetails }>>}
 */
export async function fetchStrategiesOverview(strategies) {
  getTickerApiKey();

  const results = [];

  for (const strat of strategies) {
    const tickerDetails = [];
    let weightedDivYield = 0;
    let weightedForwardDivYield = 0;
    let weightedPE = 0;
    let weightedBeta = 0;
    let totalWeight = 0;
    const sectors = {};
    let totalMarketCap = 0;

    const skipTickers = new Set(['CASH', 'CASH EQUIVALENTS']);
    for (let i = 0; i < strat.tickers.length; i++) {
      const { ticker, weight } = strat.tickers[i];
      const tickerUpper = ticker.toUpperCase().trim();
      if (skipTickers.has(tickerUpper)) {
        tickerDetails.push({ ticker, weight, error: 'Skipped (not a security)' });
        continue;
      }
      const w = weight / 100;
      totalWeight += w;

      let overview = null;
      let etfProfile = null;
      let quote = null;
      let usedETF = false;

      try {
        overview = await fetchOverview(tickerUpper);
      } catch {
        overview = null;
      }

      const overviewHasData = overview && (
        parsePct(overview.DividendYield) != null ||
        parseNum(overview.PERatio ?? overview.TrailingPE) != null ||
        overview.Sector
      );

      if (!overviewHasData) {
        try {
          etfProfile = await fetchETFProfile(tickerUpper);
          usedETF = true;
        } catch (etfErr) {
          etfProfile = null;
        }
      }

      if (!overviewHasData && !etfProfile) {
        tickerDetails.push({
          ticker,
          weight,
          error: overview ? 'No overview data (tried OVERVIEW + ETF_PROFILE)' : 'No data found'
        });
        continue;
      }

      try {
        quote = await fetchQuote(tickerUpper);
      } catch {
        quote = null;
      }

      let divYield, forwardDivYield, pe, beta, sector, marketCap;

      if (usedETF && etfProfile) {
        divYield = parsePct(etfProfile.dividend_yield);
        forwardDivYield = divYield;
        pe = null;
        beta = null;
        sector = etfProfile.sectors?.[0]?.sector || null;
        marketCap = parseNum(etfProfile.net_assets);
        if (etfProfile.sectors && Array.isArray(etfProfile.sectors)) {
          for (const s of etfProfile.sectors) {
            const sectorName = s.sector || s.Sector;
            const sectorWeight = parseNum(s.weight ?? s.Weight) || 0;
            if (sectorName && sectorWeight > 0) {
              sectors[sectorName] = (sectors[sectorName] || 0) + w * sectorWeight;
            }
          }
        }
      } else {
        divYield = parsePct(overview.DividendYield);
        const divPerShare = parseNum(overview.DividendPerShare);
        const price = quote?.price ?? parseNum(overview['50DayMovingAverage']) ?? parseNum(overview['200DayMovingAverage']);
        forwardDivYield = price && divPerShare ? (divPerShare / price) * 100 : divYield;
        pe = parseNum(overview.PERatio ?? overview.TrailingPE);
        beta = parseNum(overview.Beta);
        sector = overview.Sector || null;
        marketCap = parseNum(overview.MarketCapitalization);
        if (overview.Sector) sectors[overview.Sector] = (sectors[overview.Sector] || 0) + w;
      }

      const dataNull = divYield == null && pe == null && beta == null && sector == null && marketCap == null;

      tickerDetails.push({
        ticker,
        weight,
        dividendYield: divYield,
        forwardDividendYield: forwardDivYield ?? divYield,
        pe,
        beta,
        sector,
        marketCap,
        dataNull,
        source: usedETF ? 'ETF_PROFILE' : 'OVERVIEW'
      });

      if (divYield != null) weightedDivYield += divYield * w;
      if (forwardDivYield != null) weightedForwardDivYield += (forwardDivYield ?? divYield) * w;
      if (pe != null) weightedPE += pe * w;
      if (beta != null) weightedBeta += beta * w;
      if (marketCap != null) totalMarketCap += marketCap * w;
    }

    const sectorBreakdown = Object.entries(sectors)
      .sort((a, b) => b[1] - a[1])
      .map(([name, pct]) => ({ name, weight: Math.round(pct * 100) }));

    results.push({
      strategyName: strat.strategyName,
      characteristics: {
        trailingDividendYield: totalWeight > 0 ? weightedDivYield : null,
        forwardDividendYield: totalWeight > 0 ? weightedForwardDivYield : null,
        pe: totalWeight > 0 ? weightedPE : null,
        beta: totalWeight > 0 ? weightedBeta : null,
        sectorBreakdown,
        weightedMarketCap: totalMarketCap > 0 ? totalMarketCap : null
      },
      tickerDetails
    });
  }

  return results;
}
