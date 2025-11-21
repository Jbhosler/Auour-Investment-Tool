import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PerformanceMetrics } from '../types';

interface RollingReturnsChartProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    isPdfMode?: boolean;
}

const RollingReturnsChart: React.FC<RollingReturnsChartProps> = ({ portfolio, benchmark, isPdfMode = false }) => {

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
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="mb-4 pb-2 border-b border-[#003365]">
                <h4 className="font-semibold text-lg text-[#003365]">Rolling 12-Month Returns Distribution</h4>
                <p className="text-sm text-gray-600 mt-1">Frequency analysis of monthly returns</p>
            </div>
            {/* Lighter styling for stats section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 text-sm mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="border-b md:border-b-0 md:border-r border-gray-200 pr-4 pb-2 md:pb-0 mb-2 md:mb-0">
                    <p className="font-medium text-gray-700 truncate" title={portfolio.name}>{portfolio.name}</p>
                    <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Positive Periods:</span>
                        <span className="text-green-600 font-semibold">{portfolio.rollingReturnsAnalysis.percentPositive.toFixed(1)}%</span>
                    </div>
                     <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Negative Periods:</span>
                        <span className="text-red-600 font-semibold">{portfolio.rollingReturnsAnalysis.percentNegative.toFixed(1)}%</span>
                    </div>
                </div>
                 <div>
                    <p className="font-medium text-gray-700 truncate" title={benchmark.name}>{benchmark.name}</p>
                    <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Positive Periods:</span>
                        <span className="text-green-600 font-semibold">{benchmark.rollingReturnsAnalysis.percentPositive.toFixed(1)}%</span>
                    </div>
                     <div className="flex justify-between mt-1">
                        <span className="text-gray-600">Negative Periods:</span>
                        <span className="text-red-600 font-semibold">{benchmark.rollingReturnsAnalysis.percentNegative.toFixed(1)}%</span>
                    </div>
                </div>
            </div>
            {/* Increased height and bottom margin to accommodate legend below */}
            <div style={{ width: isPdfMode ? '700px' : '100%', height: isPdfMode ? 380 : 400 }} className="mt-6">
                {isPdfMode ? (
                    <BarChart 
                        width={700} 
                        height={380} 
                        data={mergedData} 
                        margin={{ top: 10, right: 20, left: 10, bottom: 60 }} 
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
                            label={{ value: 'Frequency (Months)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '11px' } }} 
                            allowDecimals={false}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                        />
                        <Tooltip
                            formatter={(value: number, name: string) => [`${value} months`, name]}
                            labelFormatter={(label: string) => `Return Range: ${label}`}
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        />
                        {/* Legend positioned below chart, centered */}
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                        />
                        <Bar dataKey="Portfolio" fill="#4a90e2" name={portfolio.name} />
                        <Bar dataKey="Benchmark" fill="#8884d8" name={benchmark.name} />
                    </BarChart>
                ) : (
                    <ResponsiveContainer>
                        <BarChart 
                            data={mergedData} 
                            margin={{ top: 10, right: 20, left: 10, bottom: 60 }} 
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
                                label={{ value: 'Frequency (Months)', angle: -90, position: 'insideLeft', offset: 10, style: { textAnchor: 'middle', fill: '#6b7280', fontSize: '11px' } }} 
                                allowDecimals={false}
                                tick={{ fontSize: 10, fill: '#6b7280' }}
                            />
                            <Tooltip
                                formatter={(value: number, name: string) => [`${value} months`, name]}
                                labelFormatter={(label: string) => `Return Range: ${label}`}
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                            {/* Legend positioned below chart, centered */}
                            <Legend 
                                verticalAlign="bottom" 
                                align="center"
                                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                            />
                            <Bar dataKey="Portfolio" fill="#4a90e2" name={portfolio.name} />
                            <Bar dataKey="Benchmark" fill="#8884d8" name={benchmark.name} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default RollingReturnsChart;