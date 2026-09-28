
import React from 'react';
import { PerformanceMetrics } from '../types';
import { formatPerformanceAsOfLabel } from '../utils/performanceAsOfDisplay';

interface PerformanceTableProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    returnType: 'TWR' | 'IRR';
    secondaryPortfolio?: PerformanceMetrics & { name: string; isManualOnly?: boolean; returnsAsOf?: string | null };
}

const formatPercent = (value: number | null) => {
    if (value === null) return <span className="text-gray-400">N/A</span>;
    const color = value >= 0 ? 'text-green-600' : 'text-red-600';
    return <span className={color}>{`${(value * 100).toFixed(2)}%`}</span>;
};


const PerformanceTable: React.FC<PerformanceTableProps> = ({ portfolio, benchmark, returnType, secondaryPortfolio }) => {
    const primaryAsOfLabel = formatPerformanceAsOfLabel(portfolio.performanceAsOf ?? benchmark.performanceAsOf);

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
            <div className="mb-3 pb-1.5 border-b border-[#f3f4f6]">
                <h4 className="font-semibold text-[#003365] tracking-tight" style={{ fontSize: '0.9rem' }}>Key Performance Metrics</h4>
                <p className="text-[#4b5563] mt-0.5" style={{ fontSize: '0.75rem' }}>Comparative analysis of portfolio vs. benchmark</p>
                {primaryAsOfLabel && (
                    <p className="text-[#4b5563] mt-0.5 font-medium" style={{ fontSize: '0.7rem' }}>
                        As of {primaryAsOfLabel}
                    </p>
                )}
                {secondaryPortfolio && (
                    <p className="text-xs text-[#4b5563] mt-0.5" style={{ fontSize: '0.65rem' }} title={secondaryPortfolio.isManualOnly ? 'Entered metrics are assumed to match your factsheet for the stated as-of date; they are not recomputed by this application.' : 'Returns sourced from Alpha Vantage; may differ slightly from Morningstar due to data source and month-end conventions.'}>
                        {secondaryPortfolio.isManualOnly ? (
                            <>
                                Secondary portfolio: user-entered metrics, assumed accurate through{' '}
                                {formatPerformanceAsOfLabel(secondaryPortfolio.returnsAsOf ?? secondaryPortfolio.performanceAsOf) ?? primaryAsOfLabel ?? 'the primary portfolio blended series end'}
                                .
                                They are shown as entered and not forced to match the primary portfolio statistical cutoff.
                            </>
                        ) : (
                            'Secondary portfolio: Alpha Vantage total return (may differ from Morningstar).'
                        )}
                    </p>
                )}
            </div>
            <div className="overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-[#003365] text-white">
                        <tr>
                            <th scope="col" className="px-3 py-1.5 font-medium uppercase tracking-tight" style={{ fontSize: '0.65rem' }}>Metric</th>
                            {portfolio.grossReturns && (
                                <th scope="col" className="px-3 py-1.5 text-right font-medium uppercase tracking-tight truncate" style={{ fontSize: '0.65rem' }} title={`${portfolio.name} gross: blended uploaded returns (no fees)`}>{portfolio.name} (Gross)</th>
                            )}
                            <th scope="col" className="px-3 py-1.5 text-right font-medium uppercase tracking-tight truncate" style={{ fontSize: '0.65rem' }} title={portfolio.name}>{portfolio.name} (Net)</th>
                            {secondaryPortfolio && (
                                <th scope="col" className="px-3 py-1.5 text-right font-medium uppercase tracking-tight truncate" style={{ fontSize: '0.65rem' }} title={secondaryPortfolio.name}>{secondaryPortfolio.name}</th>
                            )}
                            <th scope="col" className="px-3 py-1.5 text-right font-medium uppercase tracking-tight truncate" style={{ fontSize: '0.65rem' }} title={`${benchmark.name} (uploaded)`}>{benchmark.name}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white">
                        {metrics.map((metricKey, index) => {
                            const portfolioValue = metricKey === 'volatility' 
                                ? portfolio.volatility 
                                : portfolio.returns[metricKey as keyof PerformanceMetrics['returns']];
                            const portfolioGrossValue = metricKey !== 'volatility' && portfolio.grossReturns
                                ? portfolio.grossReturns[metricKey as keyof PerformanceMetrics['returns']]
                                : null;
                            const benchmarkValue = metricKey === 'volatility' 
                                ? benchmark.volatility 
                                : benchmark.returns[metricKey as keyof PerformanceMetrics['returns']];
                            const secondaryValue = secondaryPortfolio 
                                ? (metricKey === 'volatility' 
                                    ? secondaryPortfolio.volatility 
                                    : secondaryPortfolio.returns[metricKey as keyof PerformanceMetrics['returns']])
                                : null;
                            
                            const outperforms = portfolioValue !== null && benchmarkValue !== null && portfolioValue > benchmarkValue;
                            
                            return (
                                <tr 
                                    key={metricKey} 
                                    className={`border-b border-[#f3f4f6] ${index % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]'}`}
                                >
                                    <td className="px-3 py-1.5 font-medium text-[#4b5563]" style={{ fontSize: '0.8rem' }}>{metricLabels[metricKey]}</td>
                                    {portfolio.grossReturns && (
                                        <td className="px-3 py-1.5 text-right font-mono text-[#4b5563]" style={{ fontSize: '0.8rem' }}>
                                            {metricKey === 'volatility'
                                                ? formatPercent(portfolio.grossVolatility ?? portfolio.volatility)
                                                : formatPercent(portfolioGrossValue)}
                                        </td>
                                    )}
                                    <td className={`px-3 py-1.5 text-right font-mono ${outperforms ? 'text-green-700 font-semibold' : 'text-[#4b5563]'}`} style={{ fontSize: '0.8rem' }}>
                                        {metricKey === 'volatility' ? formatPercent(portfolioValue) : formatPercent(portfolioValue)}
                                        {outperforms && portfolioValue !== null && benchmarkValue !== null && (
                                            <span className="ml-2 text-green-600" style={{ fontSize: '0.7rem' }}>↑</span>
                                        )}
                                    </td>
                                    {secondaryPortfolio && (
                                        <td className="px-3 py-1.5 text-right font-mono text-[#4b5563]" style={{ fontSize: '0.8rem' }}>
                                            {metricKey === 'volatility' ? formatPercent(secondaryValue) : formatPercent(secondaryValue)}
                                        </td>
                                    )}
                                    <td className="px-3 py-1.5 text-right font-mono text-[#4b5563]" style={{ fontSize: '0.8rem' }}>
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