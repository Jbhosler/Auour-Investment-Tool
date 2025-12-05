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
        <div className="w-full h-full flex bg-white text-gray-700 font-sans" style={{ minHeight: '297mm' }}>
            {/* Left Accent Line - thin vertical line */}
            <div className="w-1 bg-[#003365]" style={{ minHeight: '297mm' }}></div>

            {/* Main Content Area - lighter background, better spacing for A4, ensure no clipping */}
            <div className="flex-1 flex flex-col justify-between px-12 py-10 bg-white" style={{ minHeight: '297mm' }}>
                {/* Header Section - reduced height to prevent clipping */}
                <header className="w-full" style={{ minHeight: '60px', maxHeight: '80px' }}>
                    {firmLogo && (
                        <div className="w-48 h-16 mb-4">
                            <img src={firmLogo} alt="Firm Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    {!firmLogo && (
                        <div className="w-48 h-16"></div>
                    )}
                </header>

                {/* Body Section - ensure no clipping with max-width and wrapping, centered vertically */}
                <main className="w-full flex-1 flex flex-col justify-center" style={{ paddingTop: '20px', paddingBottom: '20px' }}>
                    <div className="mb-8">
                        {/* Reduced font size for A4 safety, ensures no clipping even with html2canvas scaling */}
                        <h1 className="font-serif text-[#003365] tracking-tight font-bold leading-tight max-w-full break-words" style={{ fontSize: '2.5rem', lineHeight: '1.2' }}>
                            Investment Proposal
                        </h1>
                        <div className="w-16 h-px bg-[#003365] mt-4"></div>
                    </div>
                    {/* Ensure subtitle wraps gracefully and doesn't clip, reduced size */}
                    <h2 className="font-light text-gray-600 mt-4 mb-3 max-w-full break-words leading-relaxed" style={{ fontSize: '1.5rem', lineHeight: '1.5' }}>
                        {clientName ? `A scenario for ${clientName}.` : portfolioName}
                    </h2>
                    {adviserName && (
                        <p className="font-light text-gray-500 mb-8 max-w-full break-words" style={{ fontSize: '1rem', lineHeight: '1.6' }}>
                            Prepared for {adviserName}.
                        </p>
                    )}
                    {!adviserName && <div className="mb-8"></div>}
                </main>

                {/* Footer Section - lighter text colors, fixed height to prevent overlap */}
                <footer className="w-full text-left mt-auto" style={{ minHeight: '100px', maxHeight: '120px' }}>
                    <p className="text-gray-500" style={{ fontSize: '0.9rem', marginBottom: '8px' }}>{today}</p>
                    <p className="text-gray-400 italic max-w-full leading-relaxed" style={{ fontSize: '0.7rem', lineHeight: '1.5' }}>
                        This document is for informational purposes only and does not constitute an offer or solicitation to buy or sell any security. Past performance is not indicative of future results. All investments involve risk, including the possible loss of principal. Please consult with your financial adviser before making any investment decisions. This scenario was run utilizing actual composite returns for the strategies.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default TitlePage;