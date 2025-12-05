
import React from 'react';
import { PerformanceMetrics } from '../types';

interface PerformanceTableProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    returnType: 'TWR' | 'IRR';
}

const formatPercent = (value: number | null) => {
    if (value === null) return <span className="text-gray-400">N/A</span>;
    const color = value >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{`${(value * 100).toFixed(2)}%`}</span>;
};


const PerformanceTable: React.FC<PerformanceTableProps> = ({ portfolio, benchmark, returnType }) => {
    const metrics: (keyof PerformanceMetrics['returns'] | 'volatility')[] = [
        '1 Year',
        '3 Year',
        '5 Year',
        '10 Year',
        'volatility'
    ];
    
    const metricLabels: Record<string, string> = {
        '1 Year': `1-Year ${returnType === 'IRR' ? 'IRR' : 'Return'}`,
        '3 Year': `3-Year Ann. ${returnType === 'IRR' ? 'IRR' : 'Return'}`,
        '5 Year': `5-Year Ann. ${returnType === 'IRR' ? 'IRR' : 'Return'}`,
        '10 Year': `10-Year Ann. ${returnType === 'IRR' ? 'IRR' : 'Return'}`,
        'volatility': 'Annualized Volatility'
    }

    return (
        <div>
            <div className="mb-4 pb-2 border-b border-gray-200">
                <h4 className="font-semibold text-base text-[#003365]" style={{ fontSize: '0.95rem' }}>Key Performance Metrics</h4>
                <p className="text-sm text-gray-500 mt-1" style={{ fontSize: '0.8rem' }}>Comparative analysis of portfolio vs. benchmark</p>
            </div>
            {/* Lighter border, no shadow for cleaner look */}
            <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full text-sm text-left">
                    {/* Lighter header - subtle gradient, reduced opacity */}
                    <thead className="bg-gradient-to-r from-[#003365] to-[#003d6b] text-white">
                        <tr>
                            <th scope="col" className="px-4 py-2.5 font-medium uppercase tracking-wide" style={{ fontSize: '0.7rem' }}>Metric</th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium uppercase tracking-wide truncate" style={{ fontSize: '0.7rem' }} title={portfolio.name}>{portfolio.name}</th>
                            <th scope="col" className="px-4 py-2.5 text-right font-medium uppercase tracking-wide truncate" style={{ fontSize: '0.7rem' }} title={benchmark.name}>{benchmark.name}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {metrics.map((metricKey, index) => {
                            const portfolioValue = metricKey === 'volatility' 
                                ? portfolio.volatility 
                                : portfolio.returns[metricKey as keyof PerformanceMetrics['returns']];
                            const benchmarkValue = metricKey === 'volatility' 
                                ? benchmark.volatility 
                                : benchmark.returns[metricKey as keyof PerformanceMetrics['returns']];
                            
                            // Determine if portfolio outperforms
                            const outperforms = portfolioValue !== null && benchmarkValue !== null && portfolioValue > benchmarkValue;
                            
                            return (
                                <tr 
                                    key={metricKey} 
                                    className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                >
                                    <td className="px-4 py-3 font-medium text-gray-600" style={{ fontSize: '0.85rem' }}>{metricLabels[metricKey]}</td>
                                    <td className={`px-4 py-3 text-right font-mono ${outperforms ? 'text-green-700 font-semibold' : 'text-gray-700'}`} style={{ fontSize: '0.85rem' }}>
                                        {metricKey === 'volatility' ? formatPercent(portfolioValue) : formatPercent(portfolioValue)}
                                        {outperforms && portfolioValue !== null && benchmarkValue !== null && (
                                            <span className="ml-2 text-green-600" style={{ fontSize: '0.75rem' }}>↑</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-right font-mono text-gray-700" style={{ fontSize: '0.85rem' }}>
                                        {metricKey === 'volatility' ? formatPercent(benchmarkValue) : formatPercent(benchmarkValue)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default PerformanceTable;