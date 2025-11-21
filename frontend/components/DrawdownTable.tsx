import React from 'react';
import { Drawdown, PerformanceMetrics } from '../types';

interface DrawdownTableProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
}

const formatPercent = (value: number | null) => {
    if (value === null) return 'N/A';
    return `${(value * 100).toFixed(2)}%`;
};

const DrawdownSubTable: React.FC<{ drawdowns: Drawdown[], name: string }> = ({ drawdowns, name }) => (
    <div className="overflow-hidden rounded-lg border border-gray-300 shadow-sm">
        {/* Lighter header styling */}
        <div className="bg-gradient-to-r from-[#003365] to-[#003d6b] px-5 py-3">
            <h5 className="text-sm font-medium text-white uppercase tracking-wide truncate" title={name}>
                {name}
            </h5>
        </div>
        <table className="w-full text-sm text-left">
            {/* Lighter header row */}
            <thead className="bg-gray-50">
                <tr>
                    <th scope="col" className="px-5 py-2.5 font-medium text-gray-700 uppercase text-xs border-b border-gray-200">Decline</th>
                    <th scope="col" className="px-5 py-2.5 font-medium text-gray-700 uppercase text-xs border-b border-gray-200">Dates</th>
                </tr>
            </thead>
            <tbody className="bg-white">
                {drawdowns.length > 0 ? drawdowns.map((dd, index) => {
                    const severity = dd.drawdown < -0.20 ? 'text-red-700' : dd.drawdown < -0.10 ? 'text-orange-600' : 'text-yellow-600';
                    return (
                        <tr 
                            key={index} 
                            className={`border-b border-gray-200 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                        >
                            <td className={`px-5 py-3 font-mono font-semibold text-sm ${severity}`}>{formatPercent(dd.drawdown)}</td>
                            <td className="px-5 py-3 font-mono text-sm text-gray-700">{`${dd.peakDate} to ${dd.troughDate}`}</td>
                        </tr>
                    );
                }) : (
                    <tr className="bg-white">
                        <td colSpan={2} className="px-5 py-8 text-center text-gray-400 italic text-sm">No significant drawdowns recorded.</td>
                    </tr>
                )}
            </tbody>
        </table>
    </div>
)

const DrawdownTable: React.FC<DrawdownTableProps> = ({ portfolio, benchmark }) => {
    return (
        <div>
            <div className="mb-5 pb-2 border-b border-[#003365]">
                <h4 className="font-semibold text-lg text-[#003365]">Largest Drawdowns</h4>
                <p className="text-sm text-gray-600 mt-1">Historical peak-to-trough declines</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <DrawdownSubTable drawdowns={portfolio.drawdowns} name={portfolio.name} />
                <DrawdownSubTable drawdowns={benchmark.drawdowns} name={benchmark.name} />
            </div>
        </div>
    );
};

export default DrawdownTable;