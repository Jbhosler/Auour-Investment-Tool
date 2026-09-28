import React from 'react';
import { PerformanceMetrics } from '../types';
import { formatPerformanceAsOfLabel } from '../utils/performanceAsOfDisplay';

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
            <div className="bg-[#f9fafb] p-4">
                <h5 className="font-medium text-[#4b5563] mb-2 truncate" style={{ fontSize: '0.85rem' }} title={name}>{name}</h5>
                <p className="text-[#4b5563] text-center py-4" style={{ fontSize: '0.75rem', lineHeight: '1.5' }}>
                    Distribution analysis requires client age, investment amount, annual distribution, and at least 10 years of performance data.
                </p>
            </div>
        );
    }
    
    const successRateColor = data.successRate >= 75 ? 'bg-green-500' : data.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="bg-white p-4">
            <div className="mb-3 pb-1.5 border-b border-[#f3f4f6]">
                <h5 className="font-semibold text-[#003365] tracking-tight truncate" style={{ fontSize: '0.85rem' }} title={name}>{name}</h5>
            </div>
            <div className="space-y-3">
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
                    <p className="text-xs text-[#4b5563] mt-1.5 text-right italic" style={{ fontSize: '0.65rem' }}>Based on 250 simulations over {data.simulationYears} years.</p>
                </div>

                <div className="border-t border-[#f3f4f6] pt-2 space-y-2 bg-[#f9fafb] p-2">
                    <div className="flex justify-between items-center">
                        <span className="font-normal text-[#4b5563]" style={{ fontSize: '0.75rem' }}>Median Portfolio Value at Age 95</span>
                        <span className="font-mono font-semibold text-[#003365]" style={{ fontSize: '0.9rem' }}>{formatCurrency(data.medianFinalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="font-normal text-[#4b5563]" style={{ fontSize: '0.75rem' }}>Total Distributions Taken</span>
                        <span className="font-mono font-semibold text-[#003365]" style={{ fontSize: '0.9rem' }}>{formatCurrency(data.totalDistributions)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DistributionAnalysis: React.FC<DistributionAnalysisProps> = ({ portfolio, benchmark, secondaryPortfolio }) => {
    const asOfLabel = formatPerformanceAsOfLabel(portfolio.performanceAsOf ?? benchmark.performanceAsOf);

    const showComponent = portfolio.distributionAnalysis || benchmark.distributionAnalysis || secondaryPortfolio?.distributionAnalysis;
    
    if (!showComponent) return null; // Don't render anything if no data is available for any
    
    return (
        <div>
            <div className="mb-3 pb-1.5 border-b border-[#f3f4f6]">
                <h4 className="font-semibold text-[#003365] tracking-tight" style={{ fontSize: '0.9rem' }}>Hypothetical Distribution Analysis</h4>
                <p className="text-[#4b5563] mt-0.5" style={{ fontSize: '0.75rem' }}>Monte Carlo simulation to age 95</p>
                {asOfLabel && (
                    <p className="text-[#4b5563] mt-0.5 font-medium" style={{ fontSize: '0.7rem' }}>As of {asOfLabel}</p>
                )}
            </div>
             <div className={`grid gap-4 ${secondaryPortfolio ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                <ResultCard name={portfolio.name} data={portfolio.distributionAnalysis} />
                {secondaryPortfolio && (
                    <ResultCard name={secondaryPortfolio.name} data={secondaryPortfolio.distributionAnalysis} />
                )}
                <ResultCard name={benchmark.name} data={benchmark.distributionAnalysis} />
            </div>
            <div className="mt-3 p-2 bg-yellow-50 border-l-2 border-yellow-200">
                <p className="text-[#4b5563] italic leading-relaxed" style={{ fontSize: '0.65rem', lineHeight: '1.5' }}>
                    <strong className="font-medium">Disclaimer:</strong> This Monte Carlo simulation is a hypothetical illustration of potential outcomes and is not a guarantee of future results. The analysis is based on the 10-year annualized return and volatility of the respective portfolios and does not account for taxes, fees, or changes in market conditions.
                </p>
            </div>
        </div>
    );
};

export default DistributionAnalysis;
