import { DistributionAnalysis } from '../types';

/**
 * Generates a random number from a standard normal distribution using the Box-Muller transform.
 */
const randomNormal = (): number => {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); //Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
};

export const runMonteCarloSimulation = (
    initialInvestment: number,
    clientAge: number,
    targetAge: number,
    annualDistribution: number,
    meanAnnualReturn: number,
    annualVolatility: number,
    numSimulations = 100
): DistributionAnalysis | null => {
    if (clientAge >= targetAge || initialInvestment <= 0 || annualDistribution <= 0 || clientAge <= 0) {
        return null;
    }

    const simulationYears = targetAge - clientAge;
    const finalValues: number[] = [];
    let successfulSimulations = 0;

    for (let i = 0; i < numSimulations; i++) {
        let portfolioValue = initialInvestment;
        let survived = true;

        for (let year = 0; year < simulationYears; year++) {
            // Generate random return for the year
            const annualReturn = meanAnnualReturn + randomNormal() * annualVolatility;
            
            // Grow portfolio
            portfolioValue *= (1 + annualReturn);

            // Take distribution at the end of the year
            const distributionToTake = Math.min(portfolioValue, annualDistribution);
            portfolioValue -= distributionToTake;

            if (portfolioValue <= 0 && year < simulationYears -1) {
                // If we run out of money before the final year, it's a failure
                survived = false;
                break;
            }
        }
        
        if (survived && portfolioValue > 0) {
            successfulSimulations++;
            finalValues.push(portfolioValue);
        }
    }

    if (successfulSimulations === 0) {
        return {
            successRate: 0,
            medianFinalValue: 0,
            totalDistributions: 0,
            simulationYears,
        };
    }

    finalValues.sort((a, b) => a - b);
    const medianFinalValue = finalValues.length % 2 === 0
        ? (finalValues[finalValues.length / 2 - 1] + finalValues[finalValues.length / 2]) / 2
        : finalValues[Math.floor(finalValues.length / 2)];
        
    const totalDistributions = annualDistribution * simulationYears;

    return {
        successRate: (successfulSimulations / numSimulations) * 100,
        medianFinalValue,
        totalDistributions,
        simulationYears,
    };
};
