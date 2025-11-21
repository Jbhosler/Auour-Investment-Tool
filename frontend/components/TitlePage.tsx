import React from 'react';

interface TitlePageProps {
    firmLogo: string | null;
    portfolioName: string;
    adviserName: string;
    clientName: string;
    investmentAmount: string;
    clientAge: string;
    annualDistribution: string;
    riskTolerance: string;
}

const TitlePage: React.FC<TitlePageProps> = ({ firmLogo, portfolioName, adviserName, clientName, investmentAmount, clientAge, annualDistribution, riskTolerance }) => {
    const today = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });

    const formatCurrency = (value: string) => {
        const number = parseFloat(value.replace(/[^0-9.-]+/g,""));
        if (isNaN(number)) return '';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(number);
    };

    return (
        <div className="w-full h-full flex bg-white text-gray-800 font-sans">
            {/* Left Accent Panel - lighter, more minimal */}
            <div className="w-1/4 bg-gradient-to-b from-[#003365] to-[#002a52] relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-24 h-24 border-2 border-white/15 rounded-full"></div>
                </div>
                {firmLogo && (
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-28 h-14 bg-white p-2 rounded shadow-md">
                        <img src={firmLogo} alt="Firm Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                )}
            </div>

            {/* Main Content Area - lighter background, better spacing for A4 */}
            <div className="w-3/4 flex flex-col justify-between p-16 bg-white">
                {/* Header Section */}
                <header className="w-full">
                    {!firmLogo && (
                        <div className="w-48 h-20"></div>
                    )}
                </header>

                {/* Body Section - ensure no clipping with max-width and wrapping */}
                <main className="w-full flex-1 flex flex-col justify-center">
                    <div className="mb-10">
                        {/* Reduced font size slightly and added max-width to prevent clipping on A4 */}
                        <h1 className="text-5xl font-serif text-[#003365] tracking-tight font-bold leading-tight max-w-full break-words">
                            Investment Proposal
                        </h1>
                        <div className="w-20 h-0.5 bg-[#003365] mt-5"></div>
                    </div>
                    {/* Ensure subtitle wraps gracefully and doesn't clip */}
                    <h2 className="text-2xl font-light text-gray-600 mt-6 mb-4 max-w-full break-words leading-relaxed">
                        {clientName ? `A scenario for ${clientName}.` : portfolioName}
                    </h2>
                    {adviserName && (
                        <p className="text-lg font-light text-gray-500 mb-12 max-w-full break-words">
                            Prepared for {adviserName}.
                        </p>
                    )}
                    {!adviserName && <div className="mb-12"></div>}
                </main>

                {/* Footer Section - lighter text colors */}
                <footer className="w-full text-left mt-auto">
                    <p className="text-base text-gray-500">{today}</p>
                    <p className="text-xs text-gray-400 mt-4 italic max-w-3xl leading-relaxed">
                        This document is for informational purposes only and does not constitute an offer or solicitation to buy or sell any security. Past performance is not indicative of future results. All investments involve risk, including the possible loss of principal. Please consult with your financial adviser before making any investment decisions. This scenario was run utilizing actual composite returns for the strategies.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default TitlePage;