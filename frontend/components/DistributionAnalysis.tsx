import React from 'react';
import { PerformanceMetrics } from '../types';

interface DistributionAnalysisProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    secondaryPortfolio?: PerformanceMetrics & { name: string };
}

const formatCurrency = (value: number | null) => {
    if (value === null) return <span className="text-gray-400">N/A</span>;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const ResultCard: React.FC<{ name: string; data: PerformanceMetrics['distributionAnalysis'] }> = ({ name, data }) => {
    if (!data) {
        return (
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-200">
                <h5 className="font-medium text-gray-600 mb-3 truncate" style={{ fontSize: '0.9rem' }} title={name}>{name}</h5>
                <p className="text-sm text-gray-500 text-center py-6" style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                    Distribution analysis requires client age, investment amount, annual distribution, and at least 10 years of performance data.
                </p>
            </div>
        );
    }
    
    const successRateColor = data.successRate >= 75 ? 'bg-green-500' : data.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="bg-white p-5 rounded-lg border border-gray-200">
            {/* Lighter border styling */}
            <div className="mb-4 pb-2 border-b border-gray-200">
                <h5 className="font-semibold text-base text-[#003365] truncate" style={{ fontSize: '0.9rem' }} title={name}>{name}</h5>
            </div>
            <div className="space-y-4">
                <div>
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="font-medium text-gray-600 uppercase tracking-wide" style={{ fontSize: '0.75rem' }}>Chance of Success</span>
                        <span className="font-semibold text-[#003365]" style={{ fontSize: '1.5rem' }}>{data.successRate.toFixed(0)}%</span>
                    </div>
                    {/* Lighter progress bar background */}
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                            className={`${successRateColor} h-2.5 rounded-full transition-all`} 
                            style={{ width: `${data.successRate}%` }}
                        >
                            <div className="h-full flex items-center justify-end pr-1.5">
                                <span className="text-xs font-semibold text-white">{data.successRate.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right italic" style={{ fontSize: '0.7rem' }}>Based on 250 simulations over {data.simulationYears} years.</p>
                </div>

                {/* Lighter border and background */}
                <div className="border-t border-gray-200 pt-3 space-y-2.5 bg-gray-50 p-3 rounded">
                    <div className="flex justify-between items-center">
                        <span className="font-normal text-gray-600" style={{ fontSize: '0.8rem' }}>Median Portfolio Value at Age 95</span>
                        <span className="font-mono font-semibold text-[#003365]" style={{ fontSize: '0.9rem' }}>{formatCurrency(data.medianFinalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-normal text-gray-600" style={{ fontSize: '0.8rem' }}>Total Distributions Taken</span>
                        <span className="font-mono font-semibold text-[#003365]" style={{ fontSize: '0.9rem' }}>{formatCurrency(data.totalDistributions)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DistributionAnalysis: React.FC<DistributionAnalysisProps> = ({ portfolio, benchmark, secondaryPortfolio }) => {
    
    const showComponent = portfolio.distributionAnalysis || benchmark.distributionAnalysis || secondaryPortfolio?.distributionAnalysis;
    
    if (!showComponent) return null; // Don't render anything if no data is available for any
    
    return (
        <div>
            <div className="mb-4 pb-2 border-b border-gray-200">
                <h4 className="font-semibold text-base text-[#003365]" style={{ fontSize: '0.95rem' }}>Hypothetical Distribution Analysis</h4>
                <p className="text-sm text-gray-500 mt-1" style={{ fontSize: '0.8rem' }}>Monte Carlo simulation to age 95</p>
            </div>
             <div className={`grid gap-5 ${secondaryPortfolio ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                <ResultCard name={portfolio.name} data={portfolio.distributionAnalysis} />
                {secondaryPortfolio && (
                    <ResultCard name={secondaryPortfolio.name} data={secondaryPortfolio.distributionAnalysis} />
                )}
                <ResultCard name={benchmark.name} data={benchmark.distributionAnalysis} />
            </div>
            {/* Lighter disclaimer styling */}
            <div className="mt-4 p-3 bg-yellow-50 border-l-2 border-yellow-200 rounded">
                <p className="text-gray-600 italic leading-relaxed" style={{ fontSize: '0.7rem', lineHeight: '1.5' }}>
                    <strong className="font-medium">Disclaimer:</strong> This Monte Carlo simulation is a hypothetical illustration of potential outcomes and is not a guarantee of future results. The analysis is based on the 10-year annualized return and volatility of the respective portfolios and does not account for taxes, fees, or changes in market conditions.
                </p>
            </div>
        </div>
    );
};

export default DistributionAnalysis;
