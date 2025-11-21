import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PerformanceMetrics } from '../types';

interface GrowthChartProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    isPdfMode?: boolean;
    investmentAmount?: string;
}

const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

const GrowthChart: React.FC<GrowthChartProps> = ({ portfolio, benchmark, isPdfMode = false, investmentAmount = '1' }) => {

    const initialInvestment = parseFloat(investmentAmount.replace(/[^0-9.-]+/g, "")) || 1;

    const mergedData = useMemo(() => {
        const portfolioMap = new Map(portfolio.growthOfDollar.map(d => [d.date, d.value * initialInvestment]));
        const benchmarkMap = new Map(benchmark.growthOfDollar.map(d => [d.date, d.value * initialInvestment]));

        const allDates = new Set([...portfolioMap.keys(), ...benchmarkMap.keys()]);
        const sortedDates = Array.from(allDates).sort();

        return sortedDates.map(date => {
            return {
                date,
                Portfolio: portfolioMap.get(date),
                Benchmark: benchmarkMap.get(date),
            };
        });
    }, [portfolio.growthOfDollar, benchmark.growthOfDollar, initialInvestment]);
    
    if (mergedData.length === 0) {
        return <p>Not enough data to display growth chart.</p>;
    }
    
    return (
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
            <h4 className="font-semibold text-lg text-[#003365] mb-4">Growth of {currencyFormatter(initialInvestment)}</h4>
            {/* Increased height to accommodate bottom legend, adjusted margins for PDF safety */}
            <div style={{ width: isPdfMode ? '700px' : '100%', height: isPdfMode ? 380 : 400 }}>
                {isPdfMode ? (
                    <LineChart 
                        width={700} 
                        height={380} 
                        data={mergedData} 
                        margin={{ top: 10, right: 20, left: 10, bottom: 60 }} 
                        isAnimationActive={false}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 11, fill: '#6b7280' }} 
                            tickFormatter={(tick) => {
                                const date = new Date(tick);
                                if (date.getMonth() === 0) {
                                   return date.getFullYear().toString();
                                }
                                return '';
                            }}
                        />
                        <YAxis 
                            tickFormatter={(value) => currencyFormatter(value)}
                            tick={{ fontSize: 11, fill: '#6b7280' }}
                            domain={['dataMin', 'dataMax']}
                        />
                        <Tooltip
                            formatter={(value: number) => currencyFormatter(value)}
                            labelFormatter={(label: string) => `Date: ${label}`}
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        />
                        {/* Legend positioned below chart, centered */}
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                            iconType="line"
                        />
                        <Line type="monotone" dataKey="Portfolio" stroke="#4a90e2" dot={false} strokeWidth={2} name={portfolio.name} />
                        <Line type="monotone" dataKey="Benchmark" stroke="#8884d8" dot={false} strokeWidth={2} name={benchmark.name} />
                    </LineChart>
                ) : (
                    <ResponsiveContainer>
                        <LineChart 
                            data={mergedData} 
                            margin={{ top: 10, right: 20, left: 10, bottom: 60 }} 
                            isAnimationActive={!isPdfMode}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 11, fill: '#6b7280' }} 
                                tickFormatter={(tick) => {
                                    const date = new Date(tick);
                                    if (date.getMonth() === 0) {
                                       return date.getFullYear().toString();
                                    }
                                    return '';
                                }}
                            />
                            <YAxis 
                                tickFormatter={(value) => currencyFormatter(value)}
                                tick={{ fontSize: 11, fill: '#6b7280' }}
                                domain={['dataMin', 'dataMax']}
                            />
                            <Tooltip
                                formatter={(value: number) => currencyFormatter(value)}
                                labelFormatter={(label: string) => `Date: ${label}`}
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                            {/* Legend positioned below chart, centered */}
                            <Legend 
                                verticalAlign="bottom" 
                                align="center"
                                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                iconType="line"
                            />
                            <Line type="monotone" dataKey="Portfolio" stroke="#4a90e2" dot={false} strokeWidth={2} name={portfolio.name} />
                            <Line type="monotone" dataKey="Benchmark" stroke="#8884d8" dot={false} strokeWidth={2} name={benchmark.name} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default GrowthChart;