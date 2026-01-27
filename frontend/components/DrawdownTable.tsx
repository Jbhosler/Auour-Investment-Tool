import React from 'react';
import { Drawdown, PerformanceMetrics } from '../types';

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
    <div className="overflow-hidden rounded-lg border border-gray-200">
        {/* Lighter header styling with centered title */}
        <div className="bg-gradient-to-r from-[#003365] to-[#003d6b] px-4 py-3 flex items-center justify-center">
            <h5 className="font-medium text-white uppercase tracking-wide text-center" style={{ fontSize: '0.75rem' }} title={name}>
                {name}
            </h5>
        </div>
        <table className="w-full text-sm text-left">
            {/* Lighter header row */}
            <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-4 py-2 font-medium text-gray-600 uppercase border-b border-gray-200" style={{ fontSize: '0.7rem' }}>Decline</th>
                    <th scope="col" className="px-4 py-2 font-medium text-gray-600 uppercase border-b border-gray-200" style={{ fontSize: '0.7rem' }}>Dates</th>
                </tr>
            </thead>
            <tbody className="bg-white">
                {drawdowns.length > 0 ? drawdowns.map((dd, index) => {
                    const severity = dd.drawdown < -0.20 ? 'text-red-700' : dd.drawdown < -0.10 ? 'text-orange-600' : 'text-yellow-600';
                    return (
                        <tr 
                            key={index} 
                            className={`border-b border-gray-100 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                            <td className={`px-4 py-2.5 font-mono font-semibold ${severity}`} style={{ fontSize: '0.85rem' }}>{formatPercent(dd.drawdown)}</td>
                            <td className="px-4 py-2.5 font-mono text-gray-600" style={{ fontSize: '0.85rem' }}>{`${dd.peakDate} to ${dd.troughDate}`}</td>
                        </tr>
                    );
                }) : (
                    <tr className="bg-white">
                        <td colSpan={2} className="px-4 py-6 text-center text-gray-400 italic" style={{ fontSize: '0.8rem' }}>No significant drawdowns recorded.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
)

const DrawdownTable: React.FC<DrawdownTableProps> = ({ portfolio, benchmark, secondaryPortfolio }) => {
    return (
        <div>
            <div className="mb-4 pb-2 border-b border-gray-200">
                <h4 className="font-semibold text-base text-[#003365]" style={{ fontSize: '0.95rem' }}>Largest Drawdowns</h4>
                <p className="text-sm text-gray-500 mt-1" style={{ fontSize: '0.8rem' }}>Historical peak-to-trough declines</p>
            </div>
            <div className={`grid gap-5 ${secondaryPortfolio ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1 md:grid-cols-2'}`}>
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