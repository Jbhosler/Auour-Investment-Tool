
import { MonthlyReturn, Drawdown, PerformanceMetrics, Strategy, DistributionAnalysis, SecondaryPortfolioManual } from '../types';
import { runMonteCarloSimulation } from './monteCarloSimulator';

type WeightedMonthlySeries = {
    weight: number;
    returns: MonthlyReturn[];
};

/**
 * Months that appear on every weighted series, sorted ascending (YYYY-MM chronological order).
 */
export const intersectMonthlyDatesAcrossSeries = (
    weightedStrategies: WeightedMonthlySeries[]
): string[] => {
    if (weightedStrategies.length === 0) return [];
    if (weightedStrategies.some((w) => w.returns.length === 0)) return [];
    const perStrategySets = weightedStrategies.map((w) => new Set(w.returns.map((r) => r.date)));
    const firstDates = [...perStrategySets[0]];
    firstDates.sort();
    return firstDates.filter((d) => perStrategySets.every((set) => set.has(d)));
};

/**
 * Trims series `a` to months where both `a` and `b` exist; returns aligned pairs ordered by `a`.
 */
export const intersectTwoMonthlySeries = (
    a: MonthlyReturn[],
    b: MonthlyReturn[]
): [MonthlyReturn[], MonthlyReturn[]] => {
    const bMap = new Map(b.map((r) => [r.date, r]));
    const outA: MonthlyReturn[] = [];
    const outB: MonthlyReturn[] = [];
    for (const r of a) {
        const br = bMap.get(r.date);
        if (br !== undefined) {
            outA.push(r);
            outB.push(br);
        }
    }
    return [outA, outB];
};

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
 * Largest drawdowns from peak to trough to recovery (recovery = wealth back at or above
 * prior peak). Wealth is compounded starting at $1 before the first month.
 * Returns up to three worst completed / in-progress episodes by depth vs that peak (most negative first).
 *
 * Uses a tiny relative epsilon on peak wealth so compounded paths recover when they reclaim
 * a prior peak in practice (float noise), not only on strict inequality.
 * Series is sorted by calendar month ascending before processing.
 */
const calculateDrawdowns = (returns: MonthlyReturn[]): Drawdown[] => {
    if (returns.length === 0) return [];

    const chronological = [...returns].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

    const relTol = (value: number) => Math.max(1e-15, Math.abs(value) * 1e-12);

    let wealthIndex = 1;
    let peakWealth = 1;
    let peakDate = chronological[0].date;
    let troughWealth = 1;
    let troughDate = chronological[0].date;

    let currentDrawdown = 0;
    let inDrawdown = false;
    const drawdowns: Drawdown[] = [];

    const wealthSeries = chronological.map((r) => (wealthIndex *= (1 + r.value)));

    for (let i = 0; i < wealthSeries.length; i++) {
        const currentDate = chronological[i].date;
        const currentWealth = wealthSeries[i];

        const tolAtPeak = relTol(peakWealth);

        /** Back to prior running peak within tolerance — closes an underwater episode */
        const recovered = peakWealth > 0 && currentWealth + tolAtPeak >= peakWealth;

        if (inDrawdown && recovered) {
            drawdowns.push({
                peakDate,
                troughDate,
                recoveryDate: currentDate,
                drawdown: (troughWealth - peakWealth) / peakWealth,
            });
            inDrawdown = false;
            currentDrawdown = 0;
            peakWealth = currentWealth;
            peakDate = currentDate;
            troughWealth = currentWealth;
            troughDate = currentDate;
            continue;
        }

        if (!inDrawdown && currentWealth > peakWealth + tolAtPeak) {
            currentDrawdown = 0;
            peakWealth = currentWealth;
            peakDate = currentDate;
            troughWealth = currentWealth;
            troughDate = currentDate;
            continue;
        }

        const drawdown = (currentWealth - peakWealth) / peakWealth;
        if (drawdown < currentDrawdown) {
            currentDrawdown = drawdown;
            troughWealth = currentWealth;
            troughDate = currentDate;
            if (currentWealth + tolAtPeak < peakWealth) {
                inDrawdown = true;
            }
        }
    }

    if (inDrawdown) {
        drawdowns.push({
            peakDate,
            troughDate,
            recoveryDate: null,
            drawdown: (troughWealth - peakWealth) / peakWealth,
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
 * Annual strategist (model) fee as a percentage (e.g. 0.32 for 0.32% per year).
 * Uploaded monthly returns are full gross (no embedded fees); strategist, platform, and adviser
 * fees are subtracted uniformly from monthly returns when computing net client performance.
 */
export const STRATEGIST_FEE_ANNUAL_PERCENT = 0.32;

/**
 * Weighted blend of uploaded monthly returns across sleeves. No fees are applied.
 * Use for gross performance; combine with adjustReturnsByFee via blendPortfolios for net.
 */
export const blendUploadedGrossReturns = (weightedSeries: WeightedMonthlySeries[]): MonthlyReturn[] => {
    if (weightedSeries.length === 0) return [];

    const monthKeys = intersectMonthlyDatesAcrossSeries(weightedSeries);
    if (monthKeys.length === 0) return [];

    const maps = weightedSeries.map((ws) => new Map(ws.returns.map((r) => [r.date, r])));

    return monthKeys.map((date) => {
        let total = 0;
        for (let i = 0; i < weightedSeries.length; i++) {
            const ret = maps[i].get(date);
            if (ret !== undefined) {
                total += ret.value * weightedSeries[i].weight;
            }
        }
        return { date, value: total };
    });
};

/** Platform fee waterfall tiers: [maxAccountValue, feeRate]. Fee rate as decimal (e.g. 0.004 = 0.4%). */
export const PLATFORM_FEE_TIERS: { maxValue: number; rate: number }[] = [
    { maxValue: 250_000, rate: 0.004 },
    { maxValue: 500_000, rate: 0.0037 },
    { maxValue: 750_000, rate: 0.0032 },
    { maxValue: 1_500_000, rate: 0.0027 },
    { maxValue: 3_500_000, rate: 0.0022 },
    { maxValue: 10_000_000, rate: 0.002 },
    { maxValue: 25_000_000, rate: 0.0015 },
    { maxValue: Infinity, rate: 0.001 },
];

/**
 * Calculates annual platform fee (as percentage of account value) using waterfall tiers.
 * Each tier applies only to the amount within that tier's range.
 * @param accountValue - Account value in dollars
 * @returns Effective annual fee as percentage (e.g. 0.385 for 0.385%)
 */
export const calculatePlatformFeeFromWaterfall = (accountValue: number): number => {
    if (accountValue <= 0) return 0;
    let totalFee = 0;
    let prevMax = 0;
    for (const tier of PLATFORM_FEE_TIERS) {
        const tierStart = prevMax;
        const tierEnd = Math.min(tier.maxValue, accountValue);
        if (tierEnd > tierStart) {
            const tierAmount = tierEnd - tierStart;
            totalFee += tierAmount * tier.rate;
        }
        if (accountValue <= tier.maxValue) break;
        prevMax = tier.maxValue;
    }
    return (totalFee / accountValue) * 100;
};

/**
 * Subtracts a total annual fee rate from each monthly return (annual % ÷ 12 per month).
 * Used for net client returns: pass strategist + platform + adviser as one combined annual %.
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

/**
 * Client net blended returns: weighted uploaded gross minus strategist, adviser, and platform
 * fees (combined annual rate, deducted evenly across months).
 */
export const blendPortfolios = (
    weightedStrategies: (Strategy & { weight: number })[],
    annualFeePercent?: number,
    platformFeePercent?: number
): MonthlyReturn[] => {
    const blendedReturns = blendUploadedGrossReturns(weightedStrategies);
    const clientFeePercent = (annualFeePercent || 0) + (platformFeePercent || 0);
    const totalFeePercent = STRATEGIST_FEE_ANNUAL_PERCENT + clientFeePercent;
    return adjustReturnsByFee(blendedReturns, totalFeePercent);
};

/**
 * @deprecated Prefer passing pre-trimmed return series aligned to the portfolio; kept for callers that still anchor to December year-end.
 * Returns the latest year-end month (December) in the series, e.g. '2025-12'.
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

    // When asOfEndMonth is set, 1/3/5/10 use series through that month; vol, drawdown, rolling, and growth use same series
    const returnsMetrics = series.length > 0
        ? {
            '1 Year': useIRR ? calculateIRRForPeriod(series, 1, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 1),
            '3 Year': useIRR ? calculateIRRForPeriod(series, 3, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 3),
            '5 Year': useIRR ? calculateIRRForPeriod(series, 5, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 5),
            '10 Year': useIRR ? calculateIRRForPeriod(series, 10, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(series, 10),
        }
        : { '1 Year': null as number | null, '3 Year': null, '5 Year': null, '10 Year': null };

    const rolling12m = calculateRollingReturns(series, 12);
    const rollingAnalysis = analyzeRollingReturns(rolling12m);
    let distributionAnalysis: DistributionAnalysis | undefined = undefined;
    const tenYearReturn = returnsMetrics['10 Year'];
    const volatility = calculateAnnualizedVolatility(series);

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
        volatility,
        drawdowns: calculateDrawdowns(series),
        rollingReturnsAnalysis: {
            percentPositive: rollingAnalysis.percentPositive,
            percentNegative: rollingAnalysis.percentNegative,
        },
        rollingReturnsDistribution: rollingAnalysis.distribution,
        growthOfDollar: calculateGrowthOfDollar(series),
        returnType: useIRR ? 'IRR' : 'TWR',
        distributionAnalysis,
        performanceAsOf: series.length > 0 ? series[series.length - 1].date : null,
    };
};

/**
 * Builds minimal PerformanceMetrics for a manually entered secondary portfolio.
 * Used only in Performance Table and Growth of Dollar. Returns null if manual has no valid data.
 * @param manual - User-entered name, 1/3/5/10 returns (as decimals, e.g. 0.08 for 8%), volatility
 * @param primaryDateRange - { startDate, endDate } in YYYY-MM to align growth series start with primary; end uses manual.returnsAsOf when set
 */
export const buildManualSecondaryPortfolioMetrics = (
    manual: SecondaryPortfolioManual,
    primaryDateRange: { startDate: string; endDate: string }
): (PerformanceMetrics & { name: string; isManualOnly: boolean; returnsAsOf?: string | null }) | null => {
    const hasAnyReturn = manual.returns1Y != null || manual.returns3Y != null || manual.returns5Y != null || manual.returns10Y != null;
    if (!manual.name?.trim() || !hasAnyReturn) return null;

    const returns = {
        '1 Year': manual.returns1Y,
        '3 Year': manual.returns3Y,
        '5 Year': manual.returns5Y,
        '10 Year': manual.returns10Y,
    };

    const yyyyMm = manual.returnsAsOf?.trim();
    const endDate =
        yyyyMm && /^\d{4}-\d{2}$/.test(yyyyMm)
            ? yyyyMm
            : primaryDateRange.endDate;

    // Synthesize growthOfDollar: use longest available return as constant monthly rate over primary start through chosen end
    const annualReturn = manual.returns10Y ?? manual.returns5Y ?? manual.returns3Y ?? manual.returns1Y ?? 0;
    const monthlyRate = Math.pow(1 + annualReturn, 1 / 12) - 1;

    const growthOfDollar: { date: string; value: number }[] = [];
    const [startYear, startMonth] = primaryDateRange.startDate.split('-').map(Number);
    const [endYear, endMonth] = endDate.split('-').map(Number);

    let value = 1;
    growthOfDollar.push({ date: primaryDateRange.startDate, value: 1 });

    let y = startYear;
    let m = startMonth;
    m++;
    if (m > 12) {
        m = 1;
        y++;
    }
    while (y < endYear || (y === endYear && m <= endMonth)) {
        value *= 1 + monthlyRate;
        const dateStr = `${y}-${String(m).padStart(2, '0')}`;
        growthOfDollar.push({ date: dateStr, value });
        m++;
        if (m > 12) {
            m = 1;
            y++;
        }
    }

    return {
        returns,
        volatility: manual.volatility,
        drawdowns: [],
        rollingReturnsAnalysis: { percentPositive: 0, percentNegative: 0 },
        rollingReturnsDistribution: [],
        growthOfDollar,
        returnType: 'TWR' as const,
        name: manual.name.trim(),
        isManualOnly: true,
        returnsAsOf: endDate,
        performanceAsOf: endDate,
    };
};