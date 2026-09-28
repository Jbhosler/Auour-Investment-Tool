
export interface MonthlyReturn {
    date: string;
    value: number;
}

export interface AssetAllocation {
    equity: number;
    fixedIncome: number;
    alternatives: number;
}

export interface Strategy {
    id: string;
    name: string;
    returns: MonthlyReturn[];
    assetAllocation: AssetAllocation;
    /** Base64 PDF data linked to this strategy; appended to proposal when strategy is used */
    linkedPdfData?: string | null;
}

export interface Benchmark {
    id: string;
    name: string;
    returns: MonthlyReturn[];
    assetAllocation?: AssetAllocation; // Optional, for benchmarks that have asset allocation
}

export interface Allocation {
    strategyId: string;
    weight: number;
}

export interface DistributionAnalysis {
    successRate: number;
    medianFinalValue: number;
    totalDistributions: number;
    simulationYears: number;
}

export interface PerformanceMetrics {
    returns: {
        '1 Year': number | null;
        '3 Year': number | null;
        '5 Year': number | null;
        '10 Year': number | null;
    };
    /** Gross 1/3/5/10 metrics from blended uploaded returns (no fee adjustments). Portfolio reports only. */
    grossReturns?: {
        '1 Year': number | null;
        '3 Year': number | null;
        '5 Year': number | null;
        '10 Year': number | null;
    };
    /** Annualized volatility of the same blended gross series as grossReturns. Portfolio reports only. */
    grossVolatility?: number | null;
    volatility: number | null;
    drawdowns: Drawdown[];
    rollingReturnsAnalysis: {
        percentPositive: number;
        percentNegative: number;
    };
    rollingReturnsDistribution: { name: string; value: number }[];
    growthOfDollar: { date: string; value: number }[];
    returnType: 'TWR' | 'IRR';
    distributionAnalysis?: DistributionAnalysis;
    /** YYYY-MM of the last month included in this metrics series (aligned portfolio/benchmark in reports). */
    performanceAsOf?: string | null;
}

export interface Drawdown {
    peakDate: string;
    troughDate: string;
    recoveryDate: string | null;
    drawdown: number;
}

export interface ReportData {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    /** When isManualOnly is true, secondary appears only in Performance Table and Growth of Dollar */
    secondaryPortfolio?: (PerformanceMetrics & { name: string; isManualOnly?: boolean; returnsAsOf?: string | null });
}

export interface SecondaryPortfolioTicker {
    ticker: string;
    weight: number;
}

/** Manually entered secondary portfolio: name + 1/3/5/10 returns and volatility. Shown only in Performance Table and Growth of Dollar. */
export interface SecondaryPortfolioManual {
    name: string;
    returns1Y: number | null;
    returns3Y: number | null;
    returns5Y: number | null;
    returns10Y: number | null;
    volatility: number | null;
    /** YYYY-MM — date through which entered returns apply. If unset, growth-of-$ synthesis uses the primary portfolio’s last blended month. */
    returnsAsOf?: string | null;
}

export interface Account {
    id: string;
    accountName: string;
    portfolioAllocations: Allocation[];
    benchmarkAllocations: Allocation[];
    selectedBenchmarkId: string;
    reportData: ReportData | null;
    aiSummary: string;
    investmentAmount: string;
    clientAge: string;
    annualDistribution: string;
    riskTolerance: string;
    adviserFee: string;
    platformFee?: string;
    platformFeeManualOverride?: boolean;
    enableSecondaryPortfolio?: boolean;
    /** 'tickers' = fetch from API; 'manual' = user-entered returns/volatility (Performance Table + Growth of Dollar only) */
    secondaryPortfolioMode?: 'tickers' | 'manual';
    secondaryPortfolioTickers?: SecondaryPortfolioTicker[];
    secondaryPortfolioManual?: SecondaryPortfolioManual;
    secondaryPortfolioReturns?: MonthlyReturn[];
    /** Tickers used when secondaryPortfolioReturns was last fetched; used to skip API when unchanged */
    secondaryPortfolioCacheTickers?: SecondaryPortfolioTicker[];
}