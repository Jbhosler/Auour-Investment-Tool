import React from 'react';
import { PerformanceMetrics } from '../types';

interface DistributionAnalysisProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
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
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-300">
                <h5 className="font-medium text-gray-700 text-base mb-4 truncate" title={name}>{name}</h5>
                <p className="text-sm text-gray-500 text-center py-8">
                    Distribution analysis requires client age, investment amount, annual distribution, and at least 10 years of performance data.
                </p>
            </div>
        );
    }
    
    const successRateColor = data.successRate >= 75 ? 'bg-green-500' : data.successRate >= 50 ? 'bg-yellow-500' : 'bg-red-500';

    return (
        <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
            {/* Lighter border styling */}
            <div className="mb-5 pb-2 border-b border-[#003365]">
                <h5 className="font-semibold text-base text-[#003365] truncate" title={name}>{name}</h5>
            </div>
            <div className="space-y-5">
                <div>
                    <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm font-medium text-gray-700 uppercase tracking-wide">Chance of Success</span>
                        <span className="text-2xl font-semibold text-[#003365]">{data.successRate.toFixed(0)}%</span>
                    </div>
                    {/* Lighter progress bar background */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                        <div 
                            className={`${successRateColor} h-3 rounded-full transition-all`} 
                            style={{ width: `${data.successRate}%` }}
                        >
                            <div className="h-full flex items-center justify-end pr-2">
                                <span className="text-xs font-semibold text-white">{data.successRate.toFixed(0)}%</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-right italic">Based on 100 simulations over {data.simulationYears} years.</p>
                </div>

                {/* Lighter border and background */}
                <div className="border-t border-gray-200 pt-4 space-y-3 bg-gray-50 p-4 rounded">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-normal text-gray-700">Median Portfolio Value at Age 95</span>
                        <span className="font-mono font-semibold text-base text-[#003365]">{formatCurrency(data.medianFinalValue)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-normal text-gray-700">Total Distributions Taken</span>
                        <span className="font-mono font-semibold text-base text-[#003365]">{formatCurrency(data.totalDistributions)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const DistributionAnalysis: React.FC<DistributionAnalysisProps> = ({ portfolio, benchmark }) => {
    
    const showComponent = portfolio.distributionAnalysis || benchmark.distributionAnalysis;
    
    if (!showComponent) return null; // Don't render anything if no data is available for either
    
    return (
        <div>
            <div className="mb-5 pb-2 border-b border-[#003365]">
                <h4 className="font-semibold text-lg text-[#003365]">Hypothetical Distribution Analysis</h4>
                <p className="text-sm text-gray-600 mt-1">Monte Carlo simulation to age 95</p>
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ResultCard name={portfolio.name} data={portfolio.distributionAnalysis} />
                <ResultCard name={benchmark.name} data={benchmark.distributionAnalysis} />
            </div>
            {/* Lighter disclaimer styling */}
            <div className="mt-5 p-3 bg-yellow-50 border-l-2 border-yellow-300 rounded">
                <p className="text-xs text-gray-600 italic leading-relaxed">
                    <strong className="font-medium">Disclaimer:</strong> This Monte Carlo simulation is a hypothetical illustration of potential outcomes and is not a guarantee of future results. The analysis is based on the 10-year annualized return and volatility of the respective portfolios and does not account for taxes, fees, or changes in market conditions.
                </p>
            </div>
        </div>
    );
};

export default DistributionAnalysis;
