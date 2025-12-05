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
        <div className="w-full h-full flex flex-col bg-white text-gray-700 font-sans" style={{ minHeight: '297mm' }}>
            {/* Header - flexible height to accommodate multi-line titles, no overflow hidden */}
            {/* Increased padding and flexible min-height to prevent title clipping on A4 */}
            <header className="px-12 pt-8 pb-4" style={{ minHeight: '90px', maxHeight: '120px' }}>
                {/* Very subtle top border */}
                <div className="border-t border-gray-200 pt-4">
                    {/* Title with wrapping enabled, max-width to prevent overflow, reduced size for PDF safety */}
                    <h2 className="text-lg font-semibold text-[#003365] tracking-wide max-w-full break-words leading-relaxed" style={{ fontSize: '1.1rem', lineHeight: '1.5' }}>
                        {title}
                    </h2>
                </div>
            </header>

            {/* Main Content - lighter background, more whitespace, ensure no bottom clipping */}
            {/* Reduced padding slightly and ensured overflow visible to prevent clipping */}
            <main className="flex-grow px-12 py-6 bg-white overflow-visible" style={{ paddingBottom: '20px' }}>
                {/* Cleaner wrapper with minimal styling */}
                <div className="bg-white">
                    {children}
                </div>
            </main>

            {/* Footer - lighter styling, subtle border, fixed height to prevent overlap */}
            <footer className="px-12 py-4 bg-gray-50 border-t border-gray-200 text-xs mt-auto" style={{ minHeight: '70px' }}>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        {clientName.trim() && (
                            <p className="text-gray-600" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>
                                <span className="text-gray-500 font-normal">Prepared for:</span> 
                                <span className="font-medium text-[#003365] ml-2">{clientName}</span>
                            </p>
                        )}
                        {adviserName.trim() && (
                            <p className="text-gray-600" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>
                                <span className="text-gray-500 font-normal">Prepared by:</span> 
                                <span className="font-medium text-[#003365] ml-2">{adviserName}</span>
                            </p>
                        )}
                    </div>
                    <div className="text-right space-y-1 flex-shrink-0">
                        <p className="text-gray-500 italic" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>This proposal is for discussion purposes only.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ReportPage;