import React from 'react';

interface ReportPageProps {
    firmLogo: string | null;
    title: string;
    adviserName: string;
    clientName: string;
    pageNumber: number;
    totalPages: number;
    children: React.ReactNode;
}

const ReportPage: React.FC<ReportPageProps> = ({ firmLogo, title, adviserName, clientName, pageNumber, totalPages, children }) => {
    return (
        <div className="w-full h-full flex flex-col bg-white text-gray-800 font-sans">
            {/* Header - flexible height to accommodate multi-line titles, no overflow hidden */}
            <header className="px-16 pt-10 pb-6 min-h-[80px]">
                {/* Subtle top border instead of heavy line */}
                <div className="border-t border-gray-300 pt-5">
                    {/* Title with wrapping enabled, max-width to prevent overflow, reduced size slightly */}
                    <h2 className="text-xl font-semibold text-[#003365] tracking-wide max-w-full break-words leading-snug">
                        {title}
                    </h2>
                </div>
            </header>

            {/* Main Content - lighter background, more whitespace, ensure no bottom clipping */}
            <main className="flex-grow p-14 bg-white overflow-visible">
                {/* Removed extra white box wrapper for cleaner look, added subtle border */}
                <div className="bg-white p-6">
                    {children}
                </div>
            </main>

            {/* Footer - lighter styling, subtle border */}
            <footer className="px-16 py-5 bg-gray-50 border-t border-gray-200 text-xs mt-auto">
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        {clientName.trim() && (
                            <p className="text-gray-600">
                                <span className="text-gray-500 font-normal">Prepared for:</span> 
                                <span className="font-medium text-[#003365] ml-2">{clientName}</span>
                            </p>
                        )}
                        {adviserName.trim() && (
                            <p className="text-gray-600">
                                <span className="text-gray-500 font-normal">Prepared by:</span> 
                                <span className="font-medium text-[#003365] ml-2">{adviserName}</span>
                            </p>
                        )}
                    </div>
                    <div className="text-right space-y-1">
                        <p className="text-gray-500 italic text-xs">This proposal is for discussion purposes only.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ReportPage;