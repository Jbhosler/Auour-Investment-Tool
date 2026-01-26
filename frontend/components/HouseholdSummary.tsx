import React from 'react';
import { Account, Strategy, Benchmark } from '../types';

interface HouseholdSummaryProps {
    accounts: Account[];
    strategies: Strategy[];
    benchmarks: Benchmark[];
}

const HouseholdSummary: React.FC<HouseholdSummaryProps> = ({
    accounts,
    strategies,
    benchmarks
}) => {
    const totalInvestment = accounts.reduce((sum, acc) => sum + (acc.investmentAmount || 0), 0);
    const totalDistribution = accounts.reduce((sum, acc) => sum + (acc.annualDistribution || 0), 0);

    return (
        <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Household Summary</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="bg-gray-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Total Accounts</div>
                    <div className="text-2xl font-semibold">{accounts.length}</div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Total Investment</div>
                    <div className="text-2xl font-semibold">
                        ${totalInvestment.toLocaleString()}
                    </div>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                    <div className="text-sm text-gray-600">Total Annual Distribution</div>
                    <div className="text-2xl font-semibold">
                        ${totalDistribution.toLocaleString()}
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-lg font-semibold">Accounts</h3>
                {accounts.map((account) => (
                    <div key={account.id} className="border-b pb-4">
                        <div className="font-medium">{account.accountName}</div>
                        <div className="text-sm text-gray-600">
                            Investment: ${(account.investmentAmount || 0).toLocaleString()} | 
                            Distribution: ${(account.annualDistribution || 0).toLocaleString()}/year
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default HouseholdSummary;
