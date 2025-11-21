
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AllocationChartsProps {
    strategyAllocationData: { name: string, value: number }[];
    categoryAllocationData: { name: string, value: number }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF1943'];
const CATEGORY_COLORS = {
    'Equity': '#4a90e2',
    'Fixed Income': '#50e3c2',
    'Alternatives': '#f5a623',
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    if (percent < 0.05) return null; // Don't render labels for tiny slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="12" fontWeight="bold">
            {`${(percent * 100).toFixed(0)}%`}
        </text>
    );
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-2 border border-gray-300 rounded shadow-lg">
        <p className="font-semibold">{`${payload[0].name}`}</p>
        <p className="text-sm">{`Allocation: ${payload[0].value.toFixed(1)}%`}</p>
      </div>
    );
  }
  return null;
};


const AllocationCharts: React.FC<AllocationChartsProps> = ({ strategyAllocationData, categoryAllocationData }) => {
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
             <h2 className="text-xl font-semibold mb-4 border-b pb-2">Portfolio Allocation</h2>
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4">
                 <div>
                    <h3 className="text-lg font-medium text-center mb-2">By Strategy</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={strategyAllocationData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {strategyAllocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{fontSize: '11px', paddingLeft: '10px'}} iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
                 <div>
                    <h3 className="text-lg font-medium text-center mb-2">By Asset Category</h3>
                    <div style={{ width: '100%', height: 250 }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Pie
                                    data={categoryAllocationData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={renderCustomizedLabel}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                    nameKey="name"
                                >
                                    {categoryAllocationData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip content={<CustomTooltip />} />
                                <Legend layout="vertical" align="right" verticalAlign="middle" wrapperStyle={{fontSize: '11px', paddingLeft: '10px'}} iconSize={8} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>
             </div>
        </div>
    );
}

export default AllocationCharts;