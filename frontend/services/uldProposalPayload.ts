import { Drawdown, ReportData } from '../types';
import { formatPerformanceAsOfLabel } from '../utils/performanceAsOfDisplay';
import { calculatePlatformFeeFromWaterfall, STRATEGIST_FEE_ANNUAL_PERCENT } from './performanceCalculator';

export interface UldStrategyRef {
  id: string;
  name?: string;
  templateKey?: string | null;
}

const PULL_QUOTE = 'A cornerstone of Auour\'s approach is the active mitigation of large drawdowns, which is particularly vital for conservative objectives.';

const FIRM = {
  footer_line: 'AUOUR INVESTMENTS &nbsp;|&nbsp; 400 Tradecenter Suite 3990, Woburn, MA 01801 &nbsp;|&nbsp; 978-338-4930',
  tagline: 'A RiskManaged&trade; Solution for Downside Mitigation',
};

const DISCLOSURES = {
  cover: 'This document is for informational purposes only and does not constitute an offer or solicitation to buy or sell any security. Past performance is not indicative of future results. All investments involve risk, including the possible loss of principal. Please consult with your financial adviser before making any investment decisions. This scenario was run utilizing actual composite returns for the strategies.',
  discussion: 'This proposal is for discussion purposes only.',
};

export function isFullUldScenario(
  allocations: { strategyId: string; weight: number }[],
  strategies: UldStrategyRef[]
): boolean {
  if (allocations.length !== 1) return false;
  if (Math.abs(allocations[0].weight - 100) > 0.01) return false;
  const strategy = strategies.find((item) => item.id === allocations[0].strategyId);
  if (!strategy) return false;
  if (strategy.templateKey === 'uld') return true;
  return /ultra\s*low\s*duration/i.test(strategy.name || '');
}

function formatSignedPercent(value: number | null, digits = 2): string {
  if (value === null || Number.isNaN(value)) return 'N/A';
  return `${(value * 100).toFixed(digits)}%`;
}

function formatShare(value: number): string {
  return `${value.toFixed(1)}%`;
}

function formatCurrency(raw: string, digits: number): string {
  const amount = parseFloat(String(raw).replace(/[^0-9.-]+/g, ''));
  if (Number.isNaN(amount)) return raw || '';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(amount);
}

function monthKey(date: string): string {
  return date.slice(0, 7);
}

function formatWindow(drawdown: Drawdown): string {
  return `${monthKey(drawdown.peakDate)} to ${monthKey(drawdown.troughDate)}`;
}

function inclusiveMonths(drawdown: Drawdown): number {
  const [startYear, startMonth] = monthKey(drawdown.peakDate).split('-').map(Number);
  const [endYear, endMonth] = monthKey(drawdown.troughDate).split('-').map(Number);
  return (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
}

function riskNote(portfolio: Drawdown | undefined, benchmark: Drawdown | undefined, benchmarkName: string): string {
  if (!portfolio || !benchmark) return '';
  return `The portfolio's deepest decline ran a ${inclusiveMonths(portfolio)}-month window (${formatWindow(portfolio)}), against ${inclusiveMonths(benchmark)} months for ${benchmarkName}.`;
}

export function buildUldProposalPayload(input: {
  reportData: ReportData;
  strategies: UldStrategyRef[];
  allocations: { strategyId: string; weight: number }[];
  clientName: string;
  investmentAmount: string;
  riskTolerance: string;
  adviserFee: string;
  platformFee: string;
  platformFeeManualOverride: boolean;
  aiSummary: string;
  charts: { growth: string; histogram: string };
  allocationCharts: { strategy: string; category: string };
}) {
  const { reportData } = input;
  const strategy = input.strategies.find((item) => item.id === input.allocations[0]?.strategyId);
  const displayName = strategy?.name || reportData.portfolio.name;
  const shortName = /ultra\s*low\s*duration/i.test(displayName) ? 'Ultra Low Duration' : displayName;
  const benchmarkName = reportData.benchmark.name;
  const asOf = formatPerformanceAsOfLabel(reportData.portfolio.performanceAsOf ?? reportData.benchmark.performanceAsOf) || '';

  const accountValue = parseFloat(input.investmentAmount.replace(/[^0-9.-]/g, '')) || 0;
  const platformFeePercent = input.platformFeeManualOverride
    ? (parseFloat(input.platformFee) || 0)
    : calculatePlatformFeeFromWaterfall(accountValue);
  const adviserFeePercent = parseFloat(input.adviserFee) || 0;
  const feeLines = [
    { label: 'Auour Fee', value: STRATEGIST_FEE_ANNUAL_PERCENT },
    { label: 'Platform Fee', value: platformFeePercent },
    { label: 'Adviser Fee', value: adviserFeePercent },
  ];
  const feeTotal = feeLines.reduce((sum, line) => sum + line.value, 0);

  const returnMetrics: { key: keyof ReportData['portfolio']['returns']; label: string }[] = [
    { key: '1 Year', label: '1-Year Return' },
    { key: '3 Year', label: '3-Year Ann. Return' },
    { key: '5 Year', label: '5-Year Ann. Return' },
    { key: '10 Year', label: '10-Year Ann. Return' },
  ];

  const rows = [
    ...returnMetrics.map(({ key, label }) => {
      const gross = reportData.portfolio.grossReturns?.[key] ?? null;
      const net = reportData.portfolio.returns[key];
      const benchmark = reportData.benchmark.returns[key];
      return {
        metric: label,
        gross: formatSignedPercent(gross),
        net: formatSignedPercent(net),
        benchmark: formatSignedPercent(benchmark),
        beats_benchmark: net !== null && benchmark !== null && net > benchmark,
      };
    }),
    {
      metric: 'Annualized Volatility',
      gross: formatSignedPercent(reportData.portfolio.grossVolatility ?? reportData.portfolio.volatility),
      net: formatSignedPercent(reportData.portfolio.volatility),
      benchmark: formatSignedPercent(reportData.benchmark.volatility),
      beats_benchmark: false,
    },
  ];

  const portfolioDrawdowns = reportData.portfolio.drawdowns;
  const benchmarkDrawdowns = reportData.benchmark.drawdowns;
  const count = Math.max(portfolioDrawdowns.length, benchmarkDrawdowns.length);
  const paired = Array.from({ length: count }, (_, index) => ({
    portfolio: portfolioDrawdowns[index],
    benchmark: benchmarkDrawdowns[index],
  }));

  const worstPortfolio = portfolioDrawdowns[0];
  const worstBenchmark = benchmarkDrawdowns[0];
  const oneYearNet = reportData.portfolio.returns['1 Year'];
  const oneYearBenchmark = reportData.benchmark.returns['1 Year'];

  const paragraphs = input.aiSummary
    .split(/\n+/)
    .map((paragraph) => paragraph.replace(/\*\*/g, '').trim())
    .filter(Boolean);

  return {
    client: { name: input.clientName },
    proposal: {
      date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
      as_of: asOf,
      amount: formatCurrency(input.investmentAmount, 0),
      amount_long: formatCurrency(input.investmentAmount, 2),
      risk_tolerance: input.riskTolerance || '',
    },
    portfolio: {
      strategy_key: 'uld',
      short_name: shortName,
      display_name: displayName,
    },
    benchmark: { name: benchmarkName },
    firm: FIRM,
    disclosures: DISCLOSURES,
    fees: {
      note: 'Uploaded returns are shown gross. Net portfolio performance subtracts the total annual fee below (applied evenly across each month\'s return).',
      lines: feeLines.map((line) => ({ label: line.label, value: `${line.value.toFixed(2)}%` })),
      total: `${feeTotal.toFixed(2)}%`,
    },
    allocation_charts: [
      { label: 'By Strategy', image: input.allocationCharts.strategy },
      { label: 'By Asset Category', image: input.allocationCharts.category },
    ],
    charts: {
      growth: input.charts.growth,
      histogram: input.charts.histogram,
    },
    summary: {
      pull_quote: PULL_QUOTE,
      paragraphs: paragraphs.length > 0 ? paragraphs : ['Summary will appear after the narrative is generated.'],
    },
    performance: {
      headline: [
        {
          label: '1-Year Net Return',
          value: formatSignedPercent(oneYearNet),
          caption: `vs. ${formatSignedPercent(oneYearBenchmark)} for ${benchmarkName}`,
        },
        {
          label: 'Max Drawdown',
          value: formatSignedPercent(worstPortfolio?.drawdown ?? null),
          caption: `vs. ${formatSignedPercent(worstBenchmark?.drawdown ?? null)} for ${benchmarkName}`,
        },
        {
          label: 'Annualized Volatility',
          value: formatSignedPercent(reportData.portfolio.volatility),
          caption: `vs. ${formatSignedPercent(reportData.benchmark.volatility)} for ${benchmarkName}`,
        },
      ],
      rows,
    },
    risk: {
      worst_portfolio: {
        value: formatSignedPercent(worstPortfolio?.drawdown ?? null),
        dates: worstPortfolio ? formatWindow(worstPortfolio) : '',
      },
      worst_benchmark: {
        value: formatSignedPercent(worstBenchmark?.drawdown ?? null),
        dates: worstBenchmark ? formatWindow(worstBenchmark) : '',
      },
      note: riskNote(worstPortfolio, worstBenchmark, benchmarkName),
      drawdowns: {
        portfolio: paired.map((row) => ({
          value: formatSignedPercent(row.portfolio?.drawdown ?? null),
          dates: row.portfolio ? formatWindow(row.portfolio) : '',
        })),
        benchmark: paired.map((row) => ({
          value: formatSignedPercent(row.benchmark?.drawdown ?? null),
          dates: row.benchmark ? formatWindow(row.benchmark) : '',
        })),
      },
      distribution: [
        {
          name: 'Portfolio',
          positive: formatShare(reportData.portfolio.rollingReturnsAnalysis.percentPositive),
          negative: formatShare(reportData.portfolio.rollingReturnsAnalysis.percentNegative),
        },
        {
          name: benchmarkName,
          positive: formatShare(reportData.benchmark.rollingReturnsAnalysis.percentPositive),
          negative: formatShare(reportData.benchmark.rollingReturnsAnalysis.percentNegative),
        },
      ],
    },
    library_overrides: { include: [], exclude: [] },
  };
}
