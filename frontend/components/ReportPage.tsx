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
        <div className="w-full flex flex-col bg-white text-[#4b5563] font-sans" style={{ width: '8.5in', minHeight: '11in' }}>
            {/* Header - compact with accent bar */}
            <header className="px-12 pt-8 pb-3">
                {/* Accent bar above title */}
                <div className="bg-[#003365] mb-3" style={{ width: '40px', height: '3px' }} />
                <h2 className="text-lg font-semibold text-[#003365] tracking-tight max-w-full break-words leading-relaxed" style={{ fontSize: '1.1rem', lineHeight: '1.4' }}>
                    {title}
                </h2>
            </header>

            {/* Main Content - U.S. Letter safe margins */}
            <main className="flex-grow px-12 pt-3 pb-4 bg-white overflow-visible">
                <div className="bg-white">
                    {children}
                </div>
            </main>

            {/* Footer - lighter styling per boutique design */}
            <footer className="px-12 py-3 bg-[#f9fafb] border-t border-[#f3f4f6] text-slate-500 mt-auto" style={{ minHeight: '60px' }}>
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        {clientName.trim() && (
                            <p className="text-slate-500" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>
                                <span className="font-normal">Prepared for:</span>
                                <span className="font-medium text-[#003365] ml-2">{clientName}</span>
                            </p>
                        )}
                        {adviserName.trim() && (
                            <p className="text-slate-500" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>
                                <span className="font-normal">Prepared by:</span>
                                <span className="font-medium text-[#003365] ml-2">{adviserName}</span>
                            </p>
                        )}
                    </div>
                    <div className="text-right space-y-1 flex-shrink-0">
                        <p className="text-slate-500 italic" style={{ fontSize: '0.7rem', lineHeight: '1.4' }}>This proposal is for discussion purposes only.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default ReportPage;
