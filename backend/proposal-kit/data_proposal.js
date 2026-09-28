/**
 * Ultra Low Duration figures the proposal engine does not calculate.
 *
 * Scenario performance, volatility, and drawdowns (1/3/5/10-year returns,
 * proposal-fee net returns, annualized volatility, peak-to-trough drawdowns,
 * and rolling-period counts) come from performanceCalculator and are passed
 * in the render payload. Do not copy those into this file.
 *
 * This module holds the published composite presentation, portfolio
 * characteristics, duration-proxy comparison, and the GIPS verification window.
 * Change a number here and every ULD page that prints it updates together.
 */

const YIELD_BAR_SCALE = 6;
const DRAWDOWN_BAR_SCALE = 50;

function percent(value, digits = 2) {
  return `${Number(value).toFixed(digits)}%`;
}

function barWidth(value, scale) {
  const width = Math.min(100, (Math.abs(Number(value)) / scale) * 100);
  return `${width.toFixed(1)}%`;
}

/** Published composite gross yield. Shared by the model, fact sheet, and protections pages. */
const grossYield = 5.09;

/** Composite since-inception maximum drawdown. Not the scenario drawdown from the engine. */
const maxDrawdownSinceInception = -2.15;

const characteristics = {
  asOf: '6/30/2026',
  asOfShort: '06/30/2026',
  grossYield,
  grossYieldDisplay: percent(grossYield),
  effectiveDurationYears: 0.70,
  effectiveDurationDisplay: '0.70 years',
  effectiveDurationShort: '0.70 Yrs.',
};

const compositeStats = {
  sharpe5Year: '2.94',
  sharpeSinceInception: '1.81',
  stdDev5Year: '1.12%',
  stdDevSinceInception: '1.25%',
  benchmarkStdDev5Year: '1.95%',
  benchmarkStdDevSinceInception: '1.59%',
  maxDrawdown5Year: '-0.97%',
  benchmarkMaxDrawdown5Year: '-5.26%',
  maxDrawdownSinceInception: percent(maxDrawdownSinceInception),
  benchmarkMaxDrawdownSinceInception: '-5.26%',
};

const calendarYears = [2026, 2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018, 2017, 2016, 2015];

const protectionRows = [
  { label: 'Short-Duration Bond ETFs', yield: 4.00, maxDrawdown: -5.35 },
  { label: 'Intermediate-Term Bond ETFs', yield: 4.29, maxDrawdown: -23.18 },
  { label: 'Long-Duration Bond ETFs', yield: 4.89, maxDrawdown: -47.61 },
  { label: 'Auour ULD', yield: grossYield, maxDrawdown: maxDrawdownSinceInception, highlight: true },
].map((row) => ({
  label: row.label,
  highlight: Boolean(row.highlight),
  yieldDisplay: percent(row.yield),
  yieldBar: barWidth(row.yield, YIELD_BAR_SCALE),
  drawdownDisplay: percent(row.maxDrawdown),
  drawdownBar: barWidth(row.maxDrawdown, DRAWDOWN_BAR_SCALE),
}));

const uldReference = {
  gips: {
    verifiedFrom: '10/1/2013',
    verifiedTo: '12/31/2025',
  },
  characteristics,
  composite: {
    periodLabel: '2Q 2026',
    modelFeeLabel: '32.5bps',
    benchmarkLabel: 'Bberg 1-3 Yr Govt',
    annualized: {
      gross: ['2.51%', '4.98%', '5.58%', '3.94%', '2.77%', '2.60%'],
      net: ['2.35%', '4.65%', '5.25%', '3.62%', '2.44%', '2.28%'],
      benchmark: ['0.79%', '3.14%', '4.31%', '1.91%', '1.76%', '1.71%'],
    },
    stats: compositeStats,
    calendarYears,
    calendar: {
      gross: ['2.51%', '5.37%', '5.78%', '5.83%', '0.49%', '0.04%', '1.65%', '4.11%', '1.35%', '1.20%', '1.70%', '-0.54%'],
      net: ['2.35%', '5.04%', '5.46%', '5.51%', '0.16%', '-0.28%', '1.33%', '3.79%', '1.03%', '0.88%', '1.38%', '-0.86%'],
      benchmark: ['0.79%', '5.16%', '4.03%', '4.34%', '-3.80%', '-0.62%', '3.16%', '3.59%', '1.58%', '0.46%', '0.87%', '-0.02%'],
    },
  },
  protections: {
    yieldBarScale: YIELD_BAR_SCALE,
    drawdownBarScale: DRAWDOWN_BAR_SCALE,
    rows: protectionRows,
  },
};

export default uldReference;
