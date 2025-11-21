import { Strategy, Benchmark, MonthlyReturn, AssetAllocation } from '../types';

// Generates a somewhat realistic random walk for monthly returns
const generateReturnStream = (lengthMonths: number, annualizedMean: number, annualizedVolatility: number): MonthlyReturn[] => {
    const monthlyMean = annualizedMean / 12;
    const monthlyVolatility = annualizedVolatility / Math.sqrt(12);
    const returns: MonthlyReturn[] = [];
    let currentDate = new Date();
    currentDate.setMonth(currentDate.getMonth() - lengthMonths);

    for (let i = 0; i < lengthMonths; i++) {
        const randomNormal = (Math.random() + Math.random() + Math.random() + Math.random() + Math.random() + Math.random() - 3) / 3; // Approximation of N(0,1)
        const returnValue = monthlyMean + randomNormal * monthlyVolatility;
        
        returns.push({
            date: currentDate.toISOString().slice(0, 7), // YYYY-MM
            value: returnValue,
        });
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return returns;
};

export const initialStrategies: Strategy[] = [
    {
        id: 's1',
        name: 'US Equity Growth Fund',
        returns: generateReturnStream(120, 0.12, 0.18), // 10 years of data
        assetAllocation: { equity: 100, fixedIncome: 0, alternatives: 0 },
    },
    {
        id: 's2',
        name: 'Global Bond Fund',
        returns: generateReturnStream(120, 0.04, 0.06),
        assetAllocation: { equity: 0, fixedIncome: 100, alternatives: 0 },
    },
    {
        id: 's3',
        name: 'Emerging Markets High-Risk',
        returns: generateReturnStream(84, 0.15, 0.25), // 7 years of data
        assetAllocation: { equity: 100, fixedIncome: 0, alternatives: 0 },
    },
     {
        id: 's4',
        name: 'Real Estate Investment Trust (REIT)',
        returns: generateReturnStream(120, 0.08, 0.15),
        assetAllocation: { equity: 0, fixedIncome: 0, alternatives: 100 },
    },
];

export const initialBenchmarks: Benchmark[] = [
    {
        id: 'b1',
        name: 'S&P 500 Index',
        returns: generateReturnStream(120, 0.10, 0.16),
    },
    {
        id: 'b2',
        name: 'Bloomberg Global Aggregate Bond Index',
        returns: generateReturnStream(120, 0.03, 0.05),
    },
    {
        id: 'b3',
        name: 'MSCI Emerging Markets Index',
        returns: generateReturnStream(120, 0.11, 0.22),
    },
];