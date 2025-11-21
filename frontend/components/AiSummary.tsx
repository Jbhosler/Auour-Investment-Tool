import React, { useState, useCallback } from 'react';
import { ReportData } from '../types';
import { generateProposalSummary } from '../services/geminiService';
import { SparklesIcon } from './icons/Icons';

interface AiSummaryProps {
    reportData: ReportData;
    summary: string;
    onSummaryUpdate: (summary: string) => void;
    clientAge: string;
    annualDistribution: string;
    riskTolerance: string;
    investmentAmount: string;
    clientName: string;
    adviserName: string;
}

export const AiSummary: React.FC<AiSummaryProps> = ({ reportData, summary, onSummaryUpdate, clientAge, annualDistribution, riskTolerance, investmentAmount, clientName, adviserName }) => {
    // PHASE 1 DIAGNOSTIC: Component render logging
    console.error('🎨🎨🎨 AiSummary COMPONENT RENDERED 🎨🎨🎨');
    try {
        localStorage.setItem('ai_summary_component_rendered', JSON.stringify({
            timestamp: new Date().toISOString(),
            message: 'AiSummary component rendered',
            hasReportData: !!reportData
        }));
        console.error('✅ Stored component render test to localStorage');
    } catch (e) {
        console.error('❌ Failed to store component render test:', e);
    }
    
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

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

    const handleGenerateSummary = useCallback(async () => {
        // Logging for debugging (console only, no alerts in production)
        console.error('🔵 handleGenerateSummary called');
        console.error('🔵 reportData:', reportData);
        console.error('🔵 clientAge:', clientAge);
        console.error('🔵 annualDistribution:', annualDistribution);
        console.error('🔵 riskTolerance:', riskTolerance);
        
        setIsLoading(true);
        setError('');
        onSummaryUpdate('');
        try {
            console.error('🔵 About to call generateProposalSummary...');
            const result = await generateProposalSummary(reportData, clientAge, annualDistribution, riskTolerance);
            console.error('🔵 generateProposalSummary returned:', result?.substring(0, 100));
            onSummaryUpdate(result);
        } catch (err: any) {
            console.error('🔴 ERROR in handleGenerateSummary');
            console.error('🔴 Error object:', err);
            console.error('🔴 Error message:', err?.message);
            console.error('🔴 Error stack:', err?.stack);
            console.error('🔴 Error name:', err?.name);
            // Error is displayed in UI via setError, no alert needed
            setError(err.message || 'Failed to generate summary.');
        } finally {
            setIsLoading(false);
        }
    }, [reportData, onSummaryUpdate, clientAge, annualDistribution, riskTolerance]);
    
    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            {/* Input Summary Section */}
            {(clientName || investmentAmount || annualDistribution || clientAge || riskTolerance || adviserName) && (
                <div className="mb-6 pb-4 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Proposal Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        {clientName && (
                            <div>
                                <span className="text-gray-500">Client:</span>
                                <span className="ml-2 font-semibold text-gray-800">{clientName}</span>
                            </div>
                        )}
                        {adviserName && (
                            <div>
                                <span className="text-gray-500">Adviser:</span>
                                <span className="ml-2 font-semibold text-gray-800">{adviserName}</span>
                            </div>
                        )}
                        {investmentAmount && (
                            <div>
                                <span className="text-gray-500">Investment:</span>
                                <span className="ml-2 font-semibold text-[#003365]">{formatCurrency(investmentAmount)}</span>
                            </div>
                        )}
                        {annualDistribution && (
                            <div>
                                <span className="text-gray-500">Annual Distribution:</span>
                                <span className="ml-2 font-semibold text-[#003365]">{formatCurrency(annualDistribution)}</span>
                            </div>
                        )}
                        {clientAge && (
                            <div>
                                <span className="text-gray-500">Client Age:</span>
                                <span className="ml-2 font-semibold text-gray-800">{clientAge}</span>
                            </div>
                        )}
                        {riskTolerance && (
                            <div>
                                <span className="text-gray-500">Risk Tolerance:</span>
                                <span className="ml-2 font-semibold text-gray-800">{riskTolerance}</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-800">AI-Powered Summary</h2>
                <button
                    onClick={() => {
                        // Button click handler (alerts removed for production)
                        console.error('✅ Button clicked - calling handleGenerateSummary');
                        handleGenerateSummary();
                    }}
                    disabled={isLoading}
                    className="flex items-center space-x-2 bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-400 transition-colors duration-300"
                >
                    <SparklesIcon />
                    <span>{isLoading ? 'Generating...' : 'Generate Summary'}</span>
                </button>
            </div>
            {isLoading && (
                 <div className="flex justify-center items-center h-48">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            )}
            {error && <div className="text-red-500 bg-red-100 p-3 rounded">{error}</div>}
            {summary && (
                <div className="prose max-w-none text-gray-600 mt-4 space-y-4">
                    {summary.split('\n').map((paragraph, index) => (
                        <p key={index}>{paragraph}</p>
                    ))}
                </div>
            )}
            {!summary && !isLoading && !error && (
                <div className="text-center py-8 text-gray-500">
                    <p>Click "Generate Summary" to get an AI-driven analysis of this proposal.</p>
                </div>
            )}
        </div>
    );
};