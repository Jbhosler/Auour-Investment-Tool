
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
}

export interface Benchmark {
    id: string;
    name: string;
    returns: MonthlyReturn[];
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
}