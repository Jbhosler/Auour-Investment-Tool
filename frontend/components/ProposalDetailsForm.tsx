import React from 'react';

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
    setAdviserFee
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
            </div>
        </div>
    );
};

export default ProposalDetailsForm;