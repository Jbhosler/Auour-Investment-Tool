
import { MonthlyReturn, Drawdown, PerformanceMetrics, Strategy, DistributionAnalysis } from '../types';
import { runMonteCarloSimulation } from './monteCarloSimulator';

/**
 * Trailing annualized return (CAGR) for the last N full calendar months.
 * Uses point-to-point compounding: product of (1 + r) over the period, then annualized.
 * When asOfEndMonth is provided, uses only returns through that month (e.g. quarter end for fact-sheet alignment).
 * @param returns - Chronological monthly returns (oldest first)
 * @param years - 1, 3, 5, or 10
 * @param asOfEndMonth - Optional 'YYYY-MM'; if set, trailing period ends on this month (inclusive)
 */
const calculateAnnualizedReturn = (
    returns: MonthlyReturn[],
    years: number,
    asOfEndMonth?: string
): number | null => {
    const months = years * 12;
    let subset = returns;
    if (asOfEndMonth) {
        const idx = returns.findIndex((r) => r.date === asOfEndMonth);
        if (idx < 0) return null;
        subset = returns.slice(0, idx + 1);
    }
    if (subset.length < months) return null;

    const relevantReturns = subset.slice(-months);
    const product = relevantReturns.reduce((acc, r) => acc * (1 + r.value), 1);
    return Math.pow(product, 12 / months) - 1;
};

const calculateAnnualizedVolatility = (returns: MonthlyReturn[]): number | null => {
    if (returns.length < 2) return null;
    const returnValues = returns.map(r => r.value);
    const mean = returnValues.reduce((a, b) => a + b, 0) / returnValues.length;
    const variance = returnValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returnValues.length - 1);
    const stdDev = Math.sqrt(variance);
    return stdDev * Math.sqrt(12);
};

/**
 * Largest drawdowns from peak to trough. Tracks running peak; when wealth falls,
 * records the minimum (trough) until a new peak. Returns worst 3 by magnitude.
 * Do not reset currentDrawdown when entering a drawdown—otherwise the first
 * trough can be overwritten by a later, smaller drawdown (e.g. during recovery).
 */
const calculateDrawdowns = (returns: MonthlyReturn[]): Drawdown[] => {
    if (returns.length === 0) return [];

    let wealthIndex = 1;
    let peakWealth = 1;
    let peakDate = returns[0].date;
    let troughWealth = 1;
    let troughDate = returns[0].date;
    
    let currentDrawdown = 0;
    let inDrawdown = false;
    const drawdowns: Drawdown[] = [];
    
    const wealthSeries = returns.map(r => wealthIndex *= (1 + r.value));
    
    for (let i = 0; i < wealthSeries.length; i++) {
        const currentDate = returns[i].date;
        const currentWealth = wealthSeries[i];

        if (currentWealth > peakWealth) {
            if (inDrawdown) {
                 // End of a drawdown
                 drawdowns.push({
                     peakDate,
                     troughDate,
                     recoveryDate: currentDate,
                     drawdown: (troughWealth - peakWealth) / peakWealth,
                 });
                 inDrawdown = false;
            }
            peakWealth = currentWealth;
            peakDate = currentDate;
            troughWealth = currentWealth;
            troughDate = currentDate;
        } else {
            const drawdown = (currentWealth - peakWealth) / peakWealth;
            if (drawdown < currentDrawdown) {
                 currentDrawdown = drawdown;
                 troughWealth = currentWealth;
                 troughDate = currentDate;
                 if (!inDrawdown) {
                     inDrawdown = true;
                 }
            }
        }
    }
    
    // If still in drawdown at the end
    if (inDrawdown) {
        drawdowns.push({
            peakDate,
            troughDate,
            recoveryDate: null,
            drawdown: (troughWealth - peakWealth) / peakWealth
        });
    }

    return drawdowns.sort((a, b) => a.drawdown - b.drawdown).slice(0, 3);
};


export const calculateRollingReturns = (returns: MonthlyReturn[], windowMonths: number): number[] => {
    if (returns.length < windowMonths) return [];
    const rolling: number[] = [];
    for (let i = 0; i <= returns.length - windowMonths; i++) {
        const window = returns.slice(i, i + windowMonths);
        const product = window.reduce((acc, r) => acc * (1 + r.value), 1);
        rolling.push(product - 1);
    }
    return rolling;
};

const analyzeRollingReturns = (rollingReturns: number[]) => {
    if (rollingReturns.length === 0) return { percentPositive: 0, percentNegative: 0, distribution: [] };
    const positiveCount = rollingReturns.filter(r => r >= 0).length;
    const negativeCount = rollingReturns.filter(r => r < 0).length;
    
    const percentPositive = (positiveCount / rollingReturns.length) * 100;
    const percentNegative = (negativeCount / rollingReturns.length) * 100;
    
    const min = Math.floor(Math.min(...rollingReturns) * 10) / 10;
    const max = Math.ceil(Math.max(...rollingReturns) * 10) / 10;
    const range = max-min;
    const binSize = Math.max(0.01, range/10);

    const bins: { [key: string]: number } = {};

    for (const r of rollingReturns) {
        const binStart = Math.floor(r / binSize) * binSize;
        const binName = `${(binStart * 100).toFixed(0)}% to ${((binStart + binSize) * 100).toFixed(0)}%`;
        bins[binName] = (bins[binName] || 0) + 1;
    }
    
    const distribution = Object.entries(bins)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => parseFloat(a.name) - parseFloat(b.name));

    return { percentPositive, percentNegative, distribution };
};

/**
 * Computes rolling returns distribution using a unified bin scheme across all series.
 * Fixes mismatched bins when comparing portfolios with very different return ranges
 * (e.g. equity portfolio vs money market).
 */
export const computeUnifiedRollingDistribution = (
    portfolioRolling: number[],
    benchmarkRolling: number[],
    secondaryRolling?: number[]
): {
    portfolio: { name: string; value: number }[];
    benchmark: { name: string; value: number }[];
    secondary: { name: string; value: number }[];
} => {
    const allReturns = [...portfolioRolling, ...benchmarkRolling, ...(secondaryRolling ?? [])];
    if (allReturns.length === 0) {
        return {
            portfolio: [],
            benchmark: [],
            secondary: secondaryRolling ? [] : [],
        };
    }
    const min = Math.floor(Math.min(...allReturns) * 10) / 10;
    const max = Math.ceil(Math.max(...allReturns) * 10) / 10;
    const range = max - min;
    const binSize = Math.max(0.01, range / 10);

    const binCounts = (rolling: number[]) => {
        const bins: { [key: string]: number } = {};
        for (const r of rolling) {
            const binStart = Math.floor(r / binSize) * binSize;
            const binName = `${(binStart * 100).toFixed(0)}% to ${((binStart + binSize) * 100).toFixed(0)}%`;
            bins[binName] = (bins[binName] || 0) + 1;
        }
        return Object.entries(bins)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => parseFloat(a.name) - parseFloat(b.name));
    };

    const portfolioBins = binCounts(portfolioRolling);
    const benchmarkBins = binCounts(benchmarkRolling);
    const secondaryBins = secondaryRolling ? binCounts(secondaryRolling) : [];

    const allKeys = new Set([
        ...portfolioBins.map((d) => d.name),
        ...benchmarkBins.map((d) => d.name),
        ...secondaryBins.map((d) => d.name),
    ]);
    const sortedKeys = Array.from(allKeys).sort((a, b) => parseFloat(a) - parseFloat(b));

    const fillMissingBins = (bins: { name: string; value: number }[]) => {
        const map = new Map(bins.map((d) => [d.name, d.value]));
        return sortedKeys.map((key) => ({
            name: key,
            value: map.get(key) ?? 0,
        }));
    };

    return {
        portfolio: fillMissingBins(portfolioBins),
        benchmark: fillMissingBins(benchmarkBins),
        secondary: secondaryRolling ? fillMissingBins(secondaryBins) : [],
    };
};

const calculateGrowthOfDollar = (returns: MonthlyReturn[]): { date: string; value: number }[] => {
    if (returns.length === 0) return [];
    
    let currentValue = 1;
    const growthSeries = returns.map(r => {
        currentValue *= (1 + r.value);
        return {
            date: r.date,
            value: currentValue,
        };
    });
    
    // Add starting point
    const startDate = new Date(returns[0].date);
    startDate.setMonth(startDate.getMonth() - 1);

    return [{ date: startDate.toISOString().slice(0, 7), value: 1 }, ...growthSeries];
};

// IRR Calculation functions
const npv = (rate: number, cashflows: number[]): number => {
    return cashflows.reduce((acc, val, i) => acc + val / Math.pow(1 + rate, i), 0);
};

const irr = (cashflows: number[], minRate = -0.99, maxRate = 1.0, tolerance = 1e-7, maxIter = 100): number | null => {
    if (cashflows.length === 0 || cashflows[0] > 0) return null;

    let lowerRate = minRate;
    let upperRate = maxRate;
    
    const npvAtLower = npv(lowerRate, cashflows);
    const npvAtUpper = npv(upperRate, cashflows);
    
    if (npvAtLower * npvAtUpper >= 0) return null;

    let guessRate = (lowerRate + upperRate) / 2;
    let iter = 0;

    while (iter < maxIter) {
        const npvAtGuess = npv(guessRate, cashflows);
        if (Math.abs(npvAtGuess) < tolerance) return guessRate;

        if (npv(lowerRate, cashflows) * npvAtGuess < 0) {
            upperRate = guessRate;
        } else {
            lowerRate = guessRate;
        }
        guessRate = (lowerRate + upperRate) / 2;
        iter++;
    }

    return null; // did not converge
};

const calculateIRRForPeriod = (
    returns: MonthlyReturn[],
    years: number,
    initialInvestment: number,
    monthlyDistribution: number
): number | null => {
    const months = years * 12;
    if (returns.length < months || initialInvestment <= 0 || monthlyDistribution <= 0) {
        return null;
    }

    const relevantReturns = returns.slice(-months);
    let portfolioValue = initialInvestment;
    const cashflows: number[] = [-initialInvestment];

    for (const r of relevantReturns) {
        portfolioValue *= (1 + r.value);
        const distributionToTake = Math.min(portfolioValue, monthlyDistribution);
        cashflows.push(distributionToTake);
        portfolioValue -= distributionToTake;
    }

    cashflows[cashflows.length - 1] += portfolioValue;

    const monthlyIRR = irr(cashflows);

    if (monthlyIRR === null) return null;
    return Math.pow(1 + monthlyIRR, 12) - 1;
};


/**
 * Adjusts monthly returns by deducting an annual adviser fee on a pro-rata basis.
 * If annual fee is 1%, each monthly return is reduced by (1/12)% = 0.0833%
 * @param returns - Array of monthly returns to adjust
 * @param annualFeePercent - Annual fee as a percentage (e.g., 1 for 1%)
 * @returns Adjusted monthly returns
 */
export const adjustReturnsByFee = (returns: MonthlyReturn[], annualFeePercent: number): MonthlyReturn[] => {
    if (annualFeePercent <= 0 || !annualFeePercent) {
        return returns;
    }
    
    // Convert annual fee to monthly fee (divide by 12)
    const monthlyFeeDecimal = annualFeePercent / 100 / 12;
    
    return returns.map(r => ({
        date: r.date,
        value: r.value - monthlyFeeDecimal
    }));
};

export const blendPortfolios = (
    weightedStrategies: (Strategy & { weight: number })[], 
    annualFeePercent?: number
): MonthlyReturn[] => {
    if (weightedStrategies.length === 0) return [];
    
    const firstStrategy = weightedStrategies[0];
    const blendedReturns: MonthlyReturn[] = firstStrategy.returns.map(r => ({ date: r.date, value: 0 }));

    blendedReturns.forEach((br, index) => {
        let totalReturnValue = 0;
        for (const ws of weightedStrategies) {
            // Find the corresponding return by date, assuming dates are aligned
            const matchingReturn = ws.returns.find(r => r.date === br.date);
            if(matchingReturn){
                totalReturnValue += matchingReturn.value * ws.weight;
            }
        }
        br.value = totalReturnValue;
    });

    // Apply fee adjustment if provided
    if (annualFeePercent && annualFeePercent > 0) {
        return adjustReturnsByFee(blendedReturns, annualFeePercent);
    }

    return blendedReturns;
};

/**
 * Returns the latest year-end month (December) in the series, e.g. '2025-12'.
 * Used so all 1/3/5/10 calculations end with the most recent year-end.
 */
export const getLatestYearEndMonth = (returns: MonthlyReturn[]): string | undefined => {
    for (let i = returns.length - 1; i >= 0; i--) {
        if (returns[i].date.slice(5, 7) === '12') return returns[i].date.slice(0, 7);
    }
    return undefined;
};

export const calculateMetrics = (
    returns: MonthlyReturn[],
    investmentAmount = 0,
    annualDistribution = 0,
    clientAge = 0,
    asOfEndMonth?: string
): PerformanceMetrics => {
    const series = asOfEndMonth
        ? returns.filter((r) => r.date <= asOfEndMonth)
        : returns;
    const monthlyDistribution = annualDistribution / 12;
    const useIRR = investmentAmount > 0 && monthlyDistribution > 0;

    // When asOfEndMonth is set (e.g. for secondary portfolio), 1/3/5/10 use series through that month; rest use full returns
    const returnsMetrics = series.length > 0
        ? {
            '1 Year': useIRR ? calculateIRRForPeriod(series, 1, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 1),
            '3 Year': useIRR ? calculateIRRForPeriod(series, 3, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 3),
            '5 Year': useIRR ? calculateIRRForPeriod(series, 5, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 5),
            '10 Year': useIRR ? calculateIRRForPeriod(series, 10, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 10),
        }
        : { '1 Year': null as number | null, '3 Year': null, '5 Year': null, '10 Year': null };

    const rolling12m = calculateRollingReturns(returns, 12);
    const rollingAnalysis = analyzeRollingReturns(rolling12m);
    let distributionAnalysis: DistributionAnalysis | undefined = undefined;
    const tenYearReturn = returnsMetrics['10 Year'];
    const volatility = calculateAnnualizedVolatility(returns);

    if (clientAge > 0 && investmentAmount > 0 && annualDistribution > 0 && tenYearReturn !== null && volatility !== null) {
        distributionAnalysis = runMonteCarloSimulation(
            investmentAmount,
            clientAge,
            95, // Target age
            annualDistribution,
            tenYearReturn,
            volatility
        ) ?? undefined;
    }

    return {
        returns: returnsMetrics,
        volatility: calculateAnnualizedVolatility(returns),
        drawdowns: calculateDrawdowns(returns),
        rollingReturnsAnalysis: {
            percentPositive: rollingAnalysis.percentPositive,
            percentNegative: rollingAnalysis.percentNegative,
        },
        rollingReturnsDistribution: rollingAnalysis.distribution,
        growthOfDollar: calculateGrowthOfDollar(returns),
        returnType: useIRR ? 'IRR' : 'TWR',
        distributionAnalysis,
    };
};