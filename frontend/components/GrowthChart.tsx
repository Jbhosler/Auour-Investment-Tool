import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { PerformanceMetrics } from '../types';

interface GrowthChartProps {
    portfolio: PerformanceMetrics & { name: string };
    benchmark: PerformanceMetrics & { name: string };
    isPdfMode?: boolean;
    investmentAmount?: string;
    showTitle?: boolean; // Allow title to be hidden when used in contexts with existing titles
    secondaryPortfolio?: PerformanceMetrics & { name: string };
}

const currencyFormatter = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(value);
};

// Formatter for Y-axis that rounds to whole numbers with no decimals
const currencyFormatterRound = (value: number) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(Math.round(value));
};

const GrowthChart: React.FC<GrowthChartProps> = ({ portfolio, benchmark, isPdfMode = false, investmentAmount = '1', showTitle = true, secondaryPortfolio }) => {

    const initialInvestment = parseFloat(investmentAmount.replace(/[^0-9.-]+/g, "")) || 1;

    const mergedData = useMemo(() => {
        const portfolioMap = new Map(portfolio.growthOfDollar.map(d => [d.date, d.value * initialInvestment]));
        const benchmarkMap = new Map(benchmark.growthOfDollar.map(d => [d.date, d.value * initialInvestment]));
        const secondaryMap = secondaryPortfolio 
            ? new Map(secondaryPortfolio.growthOfDollar.map(d => [d.date, d.value * initialInvestment]))
            : null;

        const allDates = new Set([
            ...portfolioMap.keys(), 
            ...benchmarkMap.keys(),
            ...(secondaryMap ? secondaryMap.keys() : [])
        ]);
        const sortedDates = Array.from(allDates).sort();

        return sortedDates.map(date => {
            const dataPoint: any = {
                date,
                Portfolio: portfolioMap.get(date),
            };
            if (secondaryMap) {
                dataPoint['Secondary Portfolio'] = secondaryMap.get(date);
            }
            dataPoint['Benchmark'] = benchmarkMap.get(date);
            return dataPoint;
        });
    }, [portfolio.growthOfDollar, benchmark.growthOfDollar, secondaryPortfolio?.growthOfDollar, initialInvestment]);

    // Calculate year tick positions (only January dates)
    const yearTicks = useMemo(() => {
        return mergedData
            .map((d, idx) => {
                const date = new Date(d.date);
                return date.getMonth() === 0 ? d.date : null;
            })
            .filter((date): date is string => date !== null);
    }, [mergedData]);
    
    if (mergedData.length === 0) {
        return <p>Not enough data to display growth chart.</p>;
    }
    
    return (
        <div className="bg-white px-0 py-0 rounded-lg">
            {showTitle && (
                <h4 className="font-semibold text-base text-[#003365] mb-0 px-2 pt-1" style={{ fontSize: '0.95rem' }}>Growth of {currencyFormatter(initialInvestment)}</h4>
            )}
            {/* Reduced margins and padding to maximize chart size */}
            <div style={{ width: isPdfMode ? '700px' : '100%', height: isPdfMode ? 400 : 400 }}>
                {isPdfMode ? (
                    <LineChart 
                        width={700} 
                        height={400} 
                        data={mergedData} 
                        margin={{ top: 5, right: 5, left: 5, bottom: 50 }} 
                        isAnimationActive={false}
                    >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                            dataKey="date" 
                            tick={{ fontSize: 10, fill: '#6b7280' }} 
                            tickFormatter={(tick) => {
                                const date = new Date(tick);
                                // Only show year for January (month 0)
                                if (date.getMonth() === 0) {
                                   return date.getFullYear().toString();
                                }
                                return '';
                            }}
                            // Only show ticks for January dates (years only)
                            ticks={yearTicks.length > 0 ? yearTicks : undefined}
                            interval={0}
                        />
                        <YAxis 
                            tickFormatter={(value) => currencyFormatterRound(value)}
                            tick={{ fontSize: 10, fill: '#6b7280' }}
                            domain={['dataMin', 'dataMax']}
                            allowDecimals={false}
                        />
                        <Tooltip
                            formatter={(value: number) => currencyFormatter(value)}
                            labelFormatter={(label: string) => `Date: ${label}`}
                            contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                        />
                        {/* Legend positioned below chart, centered with reduced spacing */}
                        <Legend 
                            verticalAlign="bottom" 
                            align="center"
                            wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#4b5563' }}
                            iconType="line"
                        />
                        <Line type="monotone" dataKey="Portfolio" stroke="#003365" dot={false} strokeWidth={2} name={portfolio.name} />
                        {secondaryPortfolio && (
                            <Line type="monotone" dataKey="Secondary Portfolio" stroke="#10b981" dot={false} strokeWidth={2} name={secondaryPortfolio.name} />
                        )}
                        <Line type="monotone" dataKey="Benchmark" stroke="#9ca3af" dot={false} strokeWidth={2} name={benchmark.name} />
                    </LineChart>
                ) : (
                    <ResponsiveContainer>
                        <LineChart 
                            data={mergedData} 
                            margin={{ top: 5, right: 5, left: 5, bottom: 50 }} 
                            isAnimationActive={!isPdfMode}
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 10, fill: '#6b7280' }} 
                                tickFormatter={(tick) => {
                                    const date = new Date(tick);
                                    // Only show year for January (month 0)
                                    if (date.getMonth() === 0) {
                                       return date.getFullYear().toString();
                                    }
                                    return '';
                                }}
                                // Only show ticks for January dates (years only)
                                ticks={yearTicks.length > 0 ? yearTicks : undefined}
                                interval={0}
                            />
                            <YAxis 
                                tickFormatter={(value) => currencyFormatterRound(value)}
                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                domain={['dataMin', 'dataMax']}
                                allowDecimals={false}
                            />
                            <Tooltip
                                formatter={(value: number) => currencyFormatter(value)}
                                labelFormatter={(label: string) => `Date: ${label}`}
                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                            />
                            {/* Legend positioned below chart, centered with reduced spacing */}
                            <Legend 
                                verticalAlign="bottom" 
                                align="center"
                                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#4b5563' }}
                                iconType="line"
                            />
                            <Line type="monotone" dataKey="Portfolio" stroke="#003365" dot={false} strokeWidth={2} name={portfolio.name} />
                            {secondaryPortfolio && (
                                <Line type="monotone" dataKey="Secondary Portfolio" stroke="#10b981" dot={false} strokeWidth={2} name={secondaryPortfolio.name} />
                            )}
                            <Line type="monotone" dataKey="Benchmark" stroke="#9ca3af" dot={false} strokeWidth={2} name={benchmark.name} />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </div>
        </div>
    );
};

export default GrowthChart;