import React, { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';

interface TickerDetail {
  ticker: string;
  weight: number;
  dividendYield?: number | null;
  forwardDividendYield?: number | null;
  pe?: number | null;
  beta?: number | null;
  sector?: string | null;
  marketCap?: number | null;
  error?: string;
  dataNull?: boolean;
  source?: 'OVERVIEW' | 'ETF_PROFILE';
}

interface StrategyResult {
  strategyName: string;
  characteristics: {
    trailingDividendYield: number | null;
    forwardDividendYield: number | null;
    pe: number | null;
    beta: number | null;
    sectorBreakdown: { name: string; weight: number }[];
    weightedMarketCap: number | null;
  };
  tickerDetails: TickerDetail[];
}

const CSV_EXAMPLE = `Model Name,Ticker,Target Percent
Auour Global Equity,SPY,50
Auour Global Equity,VTI,50
Auour Multi Asset Income,SCHD,60
Auour Multi Asset Income,BND,40`;

function parseCsv(content: string): { strategyName: string; tickers: { ticker: string; weight: number }[] }[] {
  const lines = content.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const nameIdx = headers.findIndex(h => h.includes('strategy') || h.includes('model') || h === 'name');
  const tickerIdx = headers.findIndex(h => h.includes('ticker') || h.includes('symbol'));
  const weightIdx = headers.findIndex(h => h.includes('weight') || h.includes('percent') || h.includes('target') || h === '%');

  if (nameIdx < 0 || tickerIdx < 0 || weightIdx < 0) {
    throw new Error('CSV must have columns: Strategy/Model Name, Ticker, Weight/Target Percent');
  }

  const byStrategy = new Map<string, { ticker: string; weight: number }[]>();

  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
    const strategyName = parts[nameIdx] || 'Unnamed';
    const ticker = (parts[tickerIdx] || '').toUpperCase().trim();
    const weight = parseFloat(parts[weightIdx] || '0') || 0;

    if (!ticker) continue;

    if (!byStrategy.has(strategyName)) {
      byStrategy.set(strategyName, []);
    }
    byStrategy.get(strategyName)!.push({ ticker, weight });
  }

  return Array.from(byStrategy.entries()).map(([strategyName, tickers]) => ({
    strategyName,
    tickers
  }));
}

function formatPct(val: number | null | undefined): string {
  if (val == null) return '–';
  return `${val.toFixed(2)}%`;
}

function formatNum(val: number | null | undefined): string {
  if (val == null) return '–';
  return val.toFixed(2);
}

function formatMarketCap(val: number | null | undefined): string {
  if (val == null) return '–';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString()}`;
}

const StrategiesOverview: React.FC = () => {
  const [csvText, setCsvText] = useState('');
  const [results, setResults] = useState<StrategyResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result));
    reader.readAsText(file);
    setResults(null);
    setError(null);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!csvText.trim()) {
      setError('Please upload a CSV or paste data.');
      return;
    }
    setLoading(true);
    setError(null);
    setResults(null);
    try {
      const strategies = parseCsv(csvText);
      if (strategies.length === 0) {
        throw new Error('No valid strategies found. Check CSV format.');
      }
      for (const s of strategies) {
        const total = s.tickers.reduce((sum, t) => sum + t.weight, 0);
        if (Math.abs(total - 100) > 0.01) {
          throw new Error(`Strategy "${s.strategyName}" weights must sum to 100% (current: ${total.toFixed(1)}%)`);
        }
      }
      const { strategies: res } = await apiService.fetchStrategiesOverview(strategies);
      setResults(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch strategy characteristics');
    } finally {
      setLoading(false);
    }
  }, [csvText]);

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-xl font-semibold mb-2">Strategies Overview</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload a CSV with columns: <strong>Model/Strategy Name</strong>, <strong>Ticker</strong>, <strong>Target Percent/Weight</strong>. One row per ticker. Weights per strategy must sum to 100%. Cash is skipped.
        </p>
        <p className="text-sm text-amber-600 mb-4">
          ⏱ Large files (50+ tickers) can take 5–15 minutes. Please wait—do not refresh.
        </p>

        <div className="flex flex-wrap gap-4 mb-4">
          <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
            <input type="file" accept=".csv" onChange={handleFileUpload} className="sr-only" />
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Upload CSV
          </label>
          <button
            onClick={handleAnalyze}
            disabled={loading || !csvText.trim()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Fetching (may take several minutes)...
              </span>
            ) : (
              'Analyze Strategies'
            )}
          </button>
        </div>

        <textarea
          value={csvText}
          onChange={(e) => { setCsvText(e.target.value); setResults(null); setError(null); }}
          placeholder={CSV_EXAMPLE}
          className="w-full h-32 p-3 border border-gray-300 rounded-md font-mono text-sm"
          spellCheck={false}
        />

        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
            {error}
          </div>
        )}
      </div>

      {results && results.length > 0 && (
        <div className="space-y-6">
          {results.map((strat) => (
            <div key={strat.strategyName} className="bg-white p-6 rounded-lg shadow-lg">
              <h3 className="text-lg font-semibold mb-4 border-b pb-2">{strat.strategyName}</h3>
              {(strat.tickerDetails.some(t => t.dataNull) || strat.tickerDetails.some(t => t.error)) && (
                <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-md text-sm">
                  <span className="font-medium text-amber-800">Tickers with no data: </span>
                  <span className="text-amber-700">
                    {strat.tickerDetails
                      .filter(t => t.dataNull || t.error)
                      .map(t => `${t.ticker}${t.dataNull ? ' (null)' : ` (${t.error})`}`)
                      .join(', ')}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase">Trailing Div Yield</div>
                  <div className="text-lg font-semibold">{formatPct(strat.characteristics.trailingDividendYield)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase">Forward Div Yield</div>
                  <div className="text-lg font-semibold">{formatPct(strat.characteristics.forwardDividendYield)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase">P/E Ratio</div>
                  <div className="text-lg font-semibold">{formatNum(strat.characteristics.pe)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase">Beta</div>
                  <div className="text-lg font-semibold">{formatNum(strat.characteristics.beta)}</div>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <div className="text-xs text-gray-500 uppercase">Market Cap</div>
                  <div className="text-lg font-semibold">{formatMarketCap(strat.characteristics.weightedMarketCap)}</div>
                </div>
              </div>

              {strat.characteristics.sectorBreakdown.length > 0 && (
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">Sector Breakdown</div>
                  <div className="flex flex-wrap gap-2">
                    {strat.characteristics.sectorBreakdown.map((s) => (
                      <span key={s.name} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
                        {s.name}: {s.weight}%
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Ticker</th>
                      <th className="text-right py-2">Weight</th>
                      <th className="text-right py-2">Trailing Div</th>
                      <th className="text-right py-2">Forward Div</th>
                      <th className="text-right py-2">P/E</th>
                      <th className="text-right py-2">Beta</th>
                      <th className="text-left py-2">Sector</th>
                      <th className="text-left py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strat.tickerDetails.map((t) => (
                      <tr key={t.ticker} className={`border-b border-gray-100 ${t.dataNull ? 'bg-amber-50' : ''}`}>
                        <td className="py-2 font-medium">{t.ticker}</td>
                        <td className="text-right py-2">{t.weight}%</td>
                        <td className="text-right py-2">{t.error ? '–' : formatPct(t.dividendYield)}</td>
                        <td className="text-right py-2">{t.error ? '–' : formatPct(t.forwardDividendYield)}</td>
                        <td className="text-right py-2">{t.error ? '–' : formatNum(t.pe)}</td>
                        <td className="text-right py-2">{t.error ? '–' : formatNum(t.beta)}</td>
                        <td className="py-2">{t.error ? t.error : (t.sector || '–')}</td>
                        <td className="py-2">
                          {t.error && (
                            <span className="text-red-600 text-xs" title={t.error}>Error</span>
                          )}
                          {t.dataNull && !t.error && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-200 text-amber-800" title="Alpha Vantage returned null/limited data (common for ETFs)">
                              N/A
                            </span>
                          )}
                          {!t.error && !t.dataNull && (
                            <span className="text-green-600 text-xs" title={t.source === 'ETF_PROFILE' ? 'Data from ETF Profile' : 'Data from Company Overview'}>
                              OK{t.source === 'ETF_PROFILE' ? ' (ETF)' : ''}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StrategiesOverview;
