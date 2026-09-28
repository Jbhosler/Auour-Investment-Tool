import React from 'react';
import { Drawdown, PerformanceMetrics } from '../types';
import { formatPerformanceAsOfLabel } from '../utils/performanceAsOfDisplay';

interface DrawdownTableProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    secondaryPortfolio?: PerformanceMetrics & { name: string };
}

const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
};

const DrawdownSubTable: React.FC<{ drawdowns: Drawdown[], name: string }> = ({ drawdowns, name }) => (
    <div className="overflow-hidden">
        <div className="bg-[#003365] px-3 py-1.5 flex items-center justify-center">
            <h5 className="font-medium text-white uppercase tracking-tight text-center" style={{ fontSize: '0.7rem' }} title={name}>
                {name}
            </h5>
        </div>
        <table className="w-full text-sm text-left">
            <thead className="bg-[#f9fafb]">
                <tr>
                    <th scope="col" className="px-3 py-1 font-medium text-[#4b5563] uppercase tracking-tight border-b border-[#f3f4f6]" style={{ fontSize: '0.65rem' }}>Decline</th>
                    <th scope="col" className="px-3 py-1 font-medium text-[#4b5563] uppercase tracking-tight border-b border-[#f3f4f6]" style={{ fontSize: '0.65rem' }}>Dates</th>
                </tr>
            </thead>
            <tbody className="bg-white">
                {drawdowns.length > 0 ? drawdowns.map((dd, index) => {
                    const severity = dd.drawdown < -0.20 ? 'text-red-700' : dd.drawdown < -0.10 ? 'text-orange-600' : 'text-yellow-600';
                    return (
                        <tr 
                            key={index} 
                            className={`border-b border-[#f3f4f6] ${index % 2 === 0 ? 'bg-white' : 'bg-[#f9fafb]'}`}
                        >
                            <td className={`px-3 py-1 font-mono font-semibold ${severity}`} style={{ fontSize: '0.8rem' }}>{formatPercent(dd.drawdown)}</td>
                            <td className="px-3 py-1 font-mono text-[#4b5563]" style={{ fontSize: '0.8rem' }}>{`${dd.peakDate} to ${dd.troughDate}`}</td>
                        </tr>
                    );
                }) : (
                    <tr className="bg-white">
                        <td colSpan={2} className="px-3 py-4 text-center text-[#4b5563] italic" style={{ fontSize: '0.75rem' }}>No significant drawdowns recorded.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
)

const DrawdownTable: React.FC<DrawdownTableProps> = ({ portfolio, benchmark, secondaryPortfolio }) => {
    const asOfLabel = formatPerformanceAsOfLabel(portfolio.performanceAsOf ?? benchmark.performanceAsOf);

    return (
        <div>
            <div className="mb-3 pb-1.5 border-b border-[#f3f4f6]">
                <h4 className="font-semibold text-[#003365] tracking-tight" style={{ fontSize: '0.9rem' }}>Largest Drawdowns</h4>
                <p className="text-[#4b5563] mt-0.5" style={{ fontSize: '0.75rem' }}>Historical peak-to-trough declines</p>
                {asOfLabel && (
                    <p className="text-[#4b5563] mt-0.5 font-medium" style={{ fontSize: '0.7rem' }}>As of {asOfLabel}</p>
                )}
            </div>
            <div className={`grid gap-4 ${secondaryPortfolio ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
                <DrawdownSubTable drawdowns={portfolio.drawdowns} name={portfolio.name} />
                {secondaryPortfolio && (
                    <DrawdownSubTable drawdowns={secondaryPortfolio.drawdowns} name={secondaryPortfolio.name} />
                )}
                <DrawdownSubTable drawdowns={benchmark.drawdowns} name={benchmark.name} />
            </div>
        </div>
    );
};

export default DrawdownTable;