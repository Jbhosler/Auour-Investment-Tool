
import { MonthlyReturn, Drawdown, PerformanceMetrics, Strategy, DistributionAnalysis } from '../types';
import { runMonteCarloSimulation } from './monteCarloSimulator';

const calculateAnnualizedReturn = (returns: MonthlyReturn[], years: number): number | null => {
    const months = years * 12;
    if (returns.length < months) return null;

    const relevantReturns = returns.slice(-months);
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
                     currentDrawdown = 0; // Reset to find new trough
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


const calculateRollingReturns = (returns: MonthlyReturn[], windowMonths: number): number[] => {
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
    const positiveCount = rollingReturns.filter(r => r > 0).length;
    
    const percentPositive = (positiveCount / rollingReturns.length) * 100;
    const percentNegative = 100 - percentPositive;
    
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

export const calculateMetrics = (
    returns: MonthlyReturn[],
    investmentAmount = 0,
    annualDistribution = 0,
    clientAge = 0
): PerformanceMetrics => {
    const rolling12m = calculateRollingReturns(returns, 12);
    const rollingAnalysis = analyzeRollingReturns(rolling12m);

    const monthlyDistribution = annualDistribution / 12;
    const useIRR = investmentAmount > 0 && monthlyDistribution > 0;
    
    const returnsMetrics = {
        '1 Year': useIRR ? calculateIRRForPeriod(returns, 1, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(returns, 1),
        '3 Year': useIRR ? calculateIRRForPeriod(returns, 3, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(returns, 3),
        '5 Year': useIRR ? calculateIRRForPeriod(returns, 5, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(returns, 5),
        '10 Year': useIRR ? calculateIRRForPeriod(returns, 10, investmentAmount, monthlyDistribution) : calculateAnnualizedReturn(returns, 10),
    };

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