import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PerformanceMetrics } from '../types';

interface RollingReturnsChartProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    isPdfMode?: boolean;
    showTitle?: boolean; // Allow title to be hidden when used in contexts with existing titles
}

const RollingReturnsChart: React.FC<RollingReturnsChartProps> = ({ portfolio, benchmark, isPdfMode = false, showTitle = true }) => {

    const mergedData = useMemo(() => {
        const allKeys = new Set([
            ...portfolio.rollingReturnsDistribution.map(d => d.name),
            ...benchmark.rollingReturnsDistribution.map(d => d.name)
        ]);

        const sortedKeys = Array.from(allKeys).sort((a,b) => parseFloat(a) - parseFloat(b));

        return sortedKeys.map(key => {
            const portfolioPoint = portfolio.rollingReturnsDistribution.find(d => d.name === key);
            const benchmarkPoint = benchmark.rollingReturnsDistribution.find(d => d.name === key);
            return {
                name: key,
                Portfolio: portfolioPoint ? portfolioPoint.value : 0,
                Benchmark: benchmarkPoint ? benchmarkPoint.value : 0,
            };
        });
    }, [portfolio.rollingReturnsDistribution, benchmark.rollingReturnsDistribution]);


    return (
        <div className="bg-white px-0 py-0 rounded-lg">
            {showTitle && (
                <div className="mb-1 pb-1 border-b border-gray-200 px-2 pt-1">
                    <h4 className="font-semibold text-base text-[#003365]" style={{ fontSize: '0.95rem' }}>Rolling 12-Month Returns Distribution</h4>
                    <p className="text-sm text-gray-500 mt-0.5" style={{ fontSize: '0.8rem' }}>Frequency analysis of monthly returns</p>
                </div>
            )}
            {/* Lighter styling for stats section with adequate padding to prevent cutoff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 text-sm mb-1 p-2.5 pb-3 bg-gray-50 rounded-lg border border-gray-200 mx-0">
                <div className="border-b md:border-b-0 md:border-r border-gray-200 pr-3 pb-2.5 md:pb-0 mb-2 md:mb-0">
                    <p className="font-medium text-gray-700 break-words" title={portfolio.name} style={{ fontSize: '0.85rem', marginBottom: '8px' }}>{portfolio.name}</p>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-gray-600" style={{ fontSize: '0.8rem' }}>Positive Periods:</span>
                        <span className="text-green-600 font-semibold" style={{ fontSize: '0.8rem' }}>{portfolio.rollingReturnsAnalysis.percentPositive.toFixed(1)}%</span>
                    </div>
                     <div className="flex justify-between mt-1.5">
                        <span className="text-gray-600" style={{ fontSize: '0.8rem' }}>Negative Periods:</span>
                        <span className="text-red-600 font-semibold" style={{ fontSize: '0.8rem' }}>{portfolio.rollingReturnsAnalysis.percentNegative.toFixed(1)}%</span>
                    </div>
                </div>
                 <div className="pl-2">
                    <p className="font-medium text-gray-700 break-words" title={benchmark.name} style={{ fontSize: '0.85rem', marginBottom: '8px' }}>{benchmark.name}</p>
                    <div className="flex justify-between mt-1.5">
                        <span className="text-gray-600" style={{ fontSize: '0.8rem' }}>Positive Periods:</span>
                        <span className="text-green-600 font-semibold" style={{ fontSize: '0.8rem' }}>{benchmark.rollingReturnsAnalysis.percentPositive.toFixed(1)}%</span>
                    </div>
                     <div className="flex justify-between mt-1.5">
                        <span className="text-gray-600" style={{ fontSize: '0.8rem' }}>Negative Periods:</span>
                        <span className="text-red-600 font-semibold" style={{ fontSize: '0.8rem' }}>{benchmark.rollingReturnsAnalysis.percentNegative.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            {/* Reduced margins and padding to maximize chart size, with adequate bottom margin for legend and angled labels */}
            <div style={{ width: '100%', height: isPdfMode ? 400 : 400 }} className="mt-0 px-0">
                {isPdfMode ? (
                    <BarChart 
                        width={690} 
                        height={400} 
                        data={mergedData} 
                        margin={{ top: 5, right: 0, left: 0, bottom: 85 }} 
                        isAnimationActive={false}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80} 
                            tick={{ fontSize: 10, fill: '#6b7280' }} 
                            interval={0}
                        />
                        <YAxis 
                            label={{ value: 'Frequency (Months)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '10px' } }} 
                            allowDecimals={false}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                        />
                        <Tooltip
                            formatter={(value: number, name: string) => [`${value} months`, name]}
                            labelFormatter={(label: string) => `Return Range: ${label}`}
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        />
                        {/* Legend positioned below chart, centered with adequate spacing to prevent cutoff */}
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#4b5563' }}
                        />
                        <Bar dataKey="Portfolio" fill="#003365" name={portfolio.name} />
                        <Bar dataKey="Benchmark" fill="#9ca3af" name={benchmark.name} />
                    </BarChart>
                ) : (
                    <ResponsiveContainer>
                        <BarChart 
                            data={mergedData} 
                            margin={{ top: 5, right: 0, left: 0, bottom: 85 }} 
                            isAnimationActive={!isPdfMode}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="name" 
                                angle={-45} 
                                textAnchor="end" 
                                height={80} 
                                tick={{ fontSize: 10, fill: '#6b7280' }} 
                                interval={0}
                            />
                            <YAxis 
                                label={{ value: 'Frequency (Months)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '10px' } }} 
                                allowDecimals={false}
                                tick={{ fontSize: 10, fill: '#6b7280' }}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => [`${value} months`, name]}
                                labelFormatter={(label: string) => `Return Range: ${label}`}
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                            {/* Legend positioned below chart, centered with adequate spacing to prevent cutoff */}
                            <Legend 
                                verticalAlign="bottom" 
                                align="center"
                                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#4b5563' }}
                            />
                            <Bar dataKey="Portfolio" fill="#003365" name={portfolio.name} />
                            <Bar dataKey="Benchmark" fill="#9ca3af" name={benchmark.name} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default RollingReturnsChart;