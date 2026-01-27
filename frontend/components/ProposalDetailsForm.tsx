import React, { useState } from 'react';

interface SecondaryPortfolioTicker {
    ticker: string;
    weight: number;
}

interface ProposalDetailsFormProps {
    adviserName: string;
    setAdviserName: (name: string) => void;
    clientName: string;
    setClientName: (name: string) => void;
    investmentAmount: string;
    setInvestmentAmount: (amount: string) => void;
    clientAge: string;
    setClientAge: (age: string) => void;
    annualDistribution: string;
    setAnnualDistribution: (amount: string) => void;
    riskTolerance: string;
    setRiskTolerance: (tolerance: string) => void;
    adviserFee: string;
    setAdviserFee: (fee: string) => void;
    enableSecondaryPortfolio?: boolean;
    setEnableSecondaryPortfolio?: (enabled: boolean) => void;
    secondaryPortfolioTickers?: SecondaryPortfolioTicker[];
    setSecondaryPortfolioTickers?: (tickers: SecondaryPortfolioTicker[]) => void;
}

const ProposalDetailsForm: React.FC<ProposalDetailsFormProps> = ({
    adviserName,
    setAdviserName,
    clientName,
    setClientName,
    investmentAmount,
    setInvestmentAmount,
    clientAge,
    setClientAge,
    annualDistribution,
    setAnnualDistribution,
    riskTolerance,
    setRiskTolerance,
    adviserFee,
    setAdviserFee,
    enableSecondaryPortfolio = false,
    setEnableSecondaryPortfolio,
    secondaryPortfolioTickers = [],
    setSecondaryPortfolioTickers
}) => {

    const formatForDisplay = (value: string) => {
        if (!value) return '';
        const number = parseInt(value, 10);
        if (isNaN(number)) return '';
        return number.toLocaleString('en-US');
    };

    const handleNumericChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        const value = e.target.value;
        const sanitizedValue = value.replace(/[^0-9]/g, '');
        setter(sanitizedValue);
    };
    
    const handleIntegerChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (value: string) => void) => {
        const value = e.target.value;
        const sanitizedValue = value.replace(/[^0-9]/g, '');
        setter(sanitizedValue);
    };

    // Secondary Portfolio handlers
    const handleAddTicker = () => {
        if (setSecondaryPortfolioTickers) {
            setSecondaryPortfolioTickers([...secondaryPortfolioTickers, { ticker: '', weight: 0 }]);
        }
    };

    const handleRemoveTicker = (index: number) => {
        if (setSecondaryPortfolioTickers) {
            setSecondaryPortfolioTickers(secondaryPortfolioTickers.filter((_, i) => i !== index));
        }
    };

    const handleTickerChange = (index: number, field: 'ticker' | 'weight', value: string | number) => {
        if (setSecondaryPortfolioTickers) {
            const updated = [...secondaryPortfolioTickers];
            updated[index] = { ...updated[index], [field]: value };
            setSecondaryPortfolioTickers(updated);
        }
    };

    const totalWeight = secondaryPortfolioTickers.reduce((sum, t) => sum + (t.weight || 0), 0);
    const weightError = enableSecondaryPortfolio && secondaryPortfolioTickers.length > 0 && Math.abs(totalWeight - 100) > 0.01;

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Proposal Details</h2>
            <div className="space-y-4">
                <div>
                    <label htmlFor="client-name" className="block text-sm font-medium text-gray-700">
                        Client Name
                    </label>
                    <input
                        type="text"
                        id="client-name"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., Jane Doe"
                    />
                </div>
                <div>
                    <label htmlFor="client-age" className="block text-sm font-medium text-gray-700">
                        Client Age
                    </label>
                    <input
                        type="text"
                        id="client-age"
                        value={clientAge}
                        onChange={(e) => handleIntegerChange(e, setClientAge)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., 65"
                    />
                </div>
                <div>
                    <label htmlFor="risk-tolerance" className="block text-sm font-medium text-gray-700">
                        Risk Tolerance
                    </label>
                    <select
                        id="risk-tolerance"
                        value={riskTolerance}
                        onChange={(e) => setRiskTolerance(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                        <option value="">Select...</option>
                        <option value="Conservative">Conservative</option>
                        <option value="Moderate">Moderate</option>
                        <option value="Aggressive">Aggressive</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="adviser-name" className="block text-sm font-medium text-gray-700">
                        Adviser Name
                    </label>
                    <input
                        type="text"
                        id="adviser-name"
                        value={adviserName}
                        onChange={(e) => setAdviserName(e.target.value)}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="e.g., John Smith"
                    />
                </div>
                <div>
                    <label htmlFor="investment-amount" className="block text-sm font-medium text-gray-700">
                        Investment Amount
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="text"
                            id="investment-amount"
                            value={formatForDisplay(investmentAmount)}
                            onChange={(e) => handleNumericChange(e, setInvestmentAmount)}
                            className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="100,000"
                        />
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">USD</span>
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="annual-distribution" className="block text-sm font-medium text-gray-700">
                        Desired Annual Distribution
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                            type="text"
                            id="annual-distribution"
                            value={formatForDisplay(annualDistribution)}
                            onChange={(e) => handleNumericChange(e, setAnnualDistribution)}
                            className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="40,000"
                        />
                         <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">USD</span>
                        </div>
                    </div>
                </div>
                <div>
                    <label htmlFor="adviser-fee" className="block text-sm font-medium text-gray-700">
                        Adviser Annual Fee (%)
                    </label>
                    <div className="mt-1 relative rounded-md shadow-sm">
                        <input
                            type="text"
                            id="adviser-fee"
                            value={adviserFee}
                            onChange={(e) => {
                                const value = e.target.value;
                                // Allow decimal numbers with up to 2 decimal places
                                const sanitizedValue = value.replace(/[^0-9.]/g, '');
                                // Ensure only one decimal point
                                const parts = sanitizedValue.split('.');
                                if (parts.length > 2) {
                                    setAdviserFee(parts[0] + '.' + parts.slice(1).join(''));
                                } else if (parts[1] && parts[1].length > 2) {
                                    setAdviserFee(parts[0] + '.' + parts[1].substring(0, 2));
                                } else {
                                    setAdviserFee(sanitizedValue);
                                }
                            }}
                            className="block w-full border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            placeholder="1.00"
                        />
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                            <span className="text-gray-500 sm:text-sm">%</span>
                        </div>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                        Annual fee deducted monthly on a pro-rata basis (e.g., 1% = 0.083% per month)
                    </p>
                </div>
                
                {/* Secondary Portfolio Comparison Toggle */}
                {setEnableSecondaryPortfolio && (
                    <div className="border-t pt-4 mt-4">
                        <div className="flex items-center justify-between mb-4">
                            <label htmlFor="secondary-portfolio-toggle" className="block text-sm font-medium text-gray-700">
                                Compare Secondary Portfolio
                            </label>
                            <label htmlFor="secondary-portfolio-toggle" className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    id="secondary-portfolio-toggle"
                                    className="sr-only peer"
                                    checked={enableSecondaryPortfolio}
                                    onChange={(e) => setEnableSecondaryPortfolio(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>
                        
                        {enableSecondaryPortfolio && setSecondaryPortfolioTickers && (
                            <div className="mt-4 space-y-3">
                                <div className="flex justify-between items-center">
                                    <p className="text-sm text-gray-600">
                                        Enter ticker symbols and allocation weights (must total 100%)
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleAddTicker}
                                        className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        + Add Ticker
                                    </button>
                                </div>
                                
                                {secondaryPortfolioTickers.length === 0 && (
                                    <p className="text-sm text-gray-500 italic">Click "Add Ticker" to start building your secondary portfolio.</p>
                                )}
                                
                                {secondaryPortfolioTickers.map((ticker, index) => (
                                    <div key={index} className="flex gap-2 items-start">
                                        <div className="flex-1">
                                            <input
                                                type="text"
                                                value={ticker.ticker}
                                                onChange={(e) => handleTickerChange(index, 'ticker', e.target.value.toUpperCase())}
                                                placeholder="Ticker (e.g., AAPL)"
                                                className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    value={ticker.weight || ''}
                                                    onChange={(e) => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        handleTickerChange(index, 'weight', val);
                                                    }}
                                                    placeholder="Weight %"
                                                    min="0"
                                                    max="100"
                                                    step="0.01"
                                                    className="block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm pr-8"
                                                />
                                                <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none">
                                                    <span className="text-gray-500 text-xs">%</span>
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveTicker(index)}
                                            className="px-2 py-1 text-sm text-red-600 hover:text-red-800 focus:outline-none"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                                
                                {secondaryPortfolioTickers.length > 0 && (
                                    <div className="flex justify-between items-center pt-2 border-t">
                                        <span className={`text-sm font-medium ${weightError ? 'text-red-600' : 'text-gray-700'}`}>
                                            Total: {totalWeight.toFixed(2)}%
                                        </span>
                                        {weightError && (
                                            <span className="text-xs text-red-600">
                                                Weights must total exactly 100%
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProposalDetailsForm;