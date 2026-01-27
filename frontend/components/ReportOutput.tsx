import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import { ReportData } from '../types';
import PerformanceTable from './PerformanceTable';
import DrawdownTable from './DrawdownTable';
import RollingReturnsChart from './RollingReturnsChart';
import { DownloadIcon } from './icons/Icons';
import TitlePage from './TitlePage';
import ReportPage from './ReportPage'; // New import
import GrowthChart from './GrowthChart';
import DistributionAnalysis from './DistributionAnalysis';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { apiService } from '../services/apiService';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^4.4.168/build/pdf.worker.min.mjs';

interface ReportOutputProps {
    reportData: ReportData;
    selectedBeforePageIds: string[];
    selectedAfterPageIds: string[];
    aiSummary: string;
    firmLogo: string | null;
    secondaryLogo: string | null;
    adviserName: string;
    clientName: string;
    investmentAmount: string;
    clientAge: string;
    annualDistribution: string;
    riskTolerance: string;
    strategyAllocationData?: { name: string; value: number }[];
    categoryAllocationData?: { name: string; value: number }[];
    benchmarkAllocationData?: { name: string; value: number }[];
    benchmarkCategoryAllocationData?: { name: string; value: number }[];
}

// Component to display captured chart image in PDF
const CapturedChartImage: React.FC<{ imageDataUrl: string; title: string; showTitle?: boolean }> = ({ imageDataUrl, title, showTitle = false }) => {
    if (!imageDataUrl) {
        return <div className="p-4 text-gray-500" style={{ fontSize: '0.875rem' }}>Chart not available</div>;
    }
    return (
        <div className="bg-white px-0 py-0 rounded-lg border border-gray-200">
            {showTitle && (
                <div className="mb-3 pb-2 border-b border-gray-200">
                    <h4 className="font-semibold text-base text-[#003365]" style={{ fontSize: '1rem' }}>{title}</h4>
                </div>
            )}
            <div className="flex justify-center">
                <img src={imageDataUrl} alt={title} className="max-w-full h-auto" style={{ maxHeight: '400px' }} />
            </div>
        </div>
    );
};

const SummaryForPdf: React.FC<{ summary: string }> = ({ summary }) => {
    const paragraphs = summary.split('\n').filter(p => p.trim() !== '');
    
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="mb-2 pb-1 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-[#003365]" style={{ fontSize: '0.85rem' }}>Executive Summary</h3>
            </div>
            <div className="prose max-w-none text-gray-600 space-y-2" style={{ fontSize: '0.75rem', lineHeight: '1.5' }}>
                {paragraphs.map((paragraph, index) => {
                    // Check if paragraph is a heading (starts with ** and ends with **)
                    const isHeading = paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**');
                    const cleanParagraph = paragraph.replace(/\*\*/g, '').trim();
                    
                    if (isHeading) {
                        return (
                            <h4 key={index} className="font-semibold text-[#003365] mt-2 mb-1 pb-0.5 border-b border-gray-200" style={{ fontSize: '0.8rem' }}>
                                {cleanParagraph}
                            </h4>
                        );
                    }
                    
                    return (
                        <p key={index} className="leading-relaxed text-gray-600 break-words" style={{ fontSize: '0.75rem', lineHeight: '1.5' }}>
                            {paragraph}
                        </p>
                    );
                })}
            </div>
        </div>
    );
};

// Component to display client variables/information
const ClientVariables: React.FC<{
    clientName: string;
    investmentAmount: string;
    clientAge: string;
    annualDistribution: string;
    riskTolerance: string;
    adviserName: string;
}> = ({ clientName, investmentAmount, clientAge, annualDistribution, riskTolerance, adviserName }) => {
    const formatCurrency = (value: string) => {
        const number = parseFloat(value.replace(/[^0-9.-]+/g, ""));
        if (isNaN(number)) return value;
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(number);
    };

    return (
        <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="mb-2 pb-1 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-[#003365]" style={{ fontSize: '0.85rem' }}>Client Information</h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
                {clientName && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5" style={{ fontSize: '0.65rem' }}>Client Name</p>
                        <p className="text-xs font-medium text-gray-700" style={{ fontSize: '0.75rem' }}>{clientName}</p>
                    </div>
                )}
                {clientAge && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5" style={{ fontSize: '0.65rem' }}>Age</p>
                        <p className="text-xs font-medium text-gray-700" style={{ fontSize: '0.75rem' }}>{clientAge} years</p>
                    </div>
                )}
                {investmentAmount && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5" style={{ fontSize: '0.65rem' }}>Investment Amount</p>
                        <p className="text-xs font-medium text-gray-700" style={{ fontSize: '0.75rem' }}>{formatCurrency(investmentAmount)}</p>
                    </div>
                )}
                {annualDistribution && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5" style={{ fontSize: '0.65rem' }}>Annual Distribution</p>
                        <p className="text-xs font-medium text-gray-700" style={{ fontSize: '0.75rem' }}>{formatCurrency(annualDistribution)}</p>
                    </div>
                )}
                {riskTolerance && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5" style={{ fontSize: '0.65rem' }}>Risk Tolerance</p>
                        <p className="text-xs font-medium text-gray-700" style={{ fontSize: '0.75rem' }}>{riskTolerance}</p>
                    </div>
                )}
                {adviserName && (
                    <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-0.5" style={{ fontSize: '0.65rem' }}>Adviser</p>
                        <p className="text-xs font-medium text-gray-700" style={{ fontSize: '0.75rem' }}>{adviserName}</p>
                    </div>
                )}
            </div>
        </div>
    );
};


const ReportOutput: React.FC<ReportOutputProps> = ({ 
    reportData, 
    selectedBeforePageIds, 
    selectedAfterPageIds, 
    aiSummary, 
    firmLogo,
    secondaryLogo,
    adviserName,
    clientName,
    investmentAmount,
    clientAge,
    annualDistribution,
    riskTolerance,
    strategyAllocationData = [],
    categoryAllocationData = [],
    benchmarkAllocationData = [],
    benchmarkCategoryAllocationData = []
}) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    // Refs to capture already-rendered charts from screen
    const growthChartRef = useRef<HTMLDivElement>(null);
    const rollingReturnsChartRef = useRef<HTMLDivElement>(null);

    const handleDownloadPdf = async () => {
        if (isGeneratingPdf) return;

        setIsGeneratingPdf(true);
        
        // 0. Capture already-rendered charts from screen (much faster than re-rendering)
        const capturedCharts: { [key: string]: string } = {};
        
        const captureChart = async (ref: React.RefObject<HTMLDivElement>, name: string): Promise<void> => {
            if (!ref.current) return;
            try {
                // Small delay to ensure chart is fully rendered
                await new Promise(resolve => setTimeout(resolve, 50));
                const canvas = await html2canvas(ref.current, {
                    scale: 1.5, // Reduced from 2 for smaller file size (still good quality)
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff'
                });
                // Use JPEG with compression for smaller file size
                capturedCharts[name] = canvas.toDataURL('image/jpeg', 0.85);
                console.log(`Captured ${name} chart from screen`);
            } catch (error) {
                console.error(`Failed to capture ${name} chart:`, error);
            }
        };
        
        // Capture all charts that are already rendered on screen
        await Promise.all([
            captureChart(growthChartRef, 'growthChart'),
            captureChart(rollingReturnsChartRef, 'rollingReturnsChart')
        ]);
        
        // 1. Setup render container for PDF generation
        const renderContainer = document.createElement('div');
        renderContainer.style.position = 'absolute';
        renderContainer.style.left = '-9999px';
        renderContainer.style.top = '0';
        renderContainer.style.width = '210mm';
        renderContainer.style.height = '297mm';
        renderContainer.style.backgroundColor = 'white';
        renderContainer.style.visibility = 'visible'; // Must be visible for charts to render
        renderContainer.style.display = 'block';
        document.body.appendChild(renderContainer);
        
        // Force a layout calculation to ensure container is ready
        void renderContainer.offsetHeight;

        const { createRoot } = await import('react-dom/client');
        const root = createRoot(renderContainer);

        try {
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            let isFirstPage = true;

            // Helper function to compress image data
            const compressImage = (dataUrl: string, quality: number = 0.85): Promise<string> => {
                return new Promise((resolve) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');
                        if (!ctx) {
                            resolve(dataUrl);
                            return;
                        }
                        ctx.drawImage(img, 0, 0);
                        // Use JPEG for better compression
                        const compressed = canvas.toDataURL('image/jpeg', quality);
                        resolve(compressed);
                    };
                    img.onerror = () => resolve(dataUrl); // Fallback to original
                    img.src = dataUrl;
                });
            };

            const addCanvasToPdf = async (canvas: HTMLCanvasElement) => {
                if (!isFirstPage) pdf.addPage();
                // Use JPEG with compression instead of PNG for much smaller file size
                const imgData = await compressImage(canvas.toDataURL('image/jpeg', 0.85));
                const imgProps = pdf.getImageProperties(imgData);
                const pageRatio = pdfHeight / pdfWidth;
                const imgRatio = imgProps.height / imgProps.width;
                let finalWidth, finalHeight;
                if (imgRatio > pageRatio) {
                    finalHeight = pdfHeight;
                    finalWidth = finalHeight / imgRatio;
                } else {
                    finalWidth = pdfWidth;
                    finalHeight = finalWidth * imgRatio;
                }
                const x = (pdfWidth - finalWidth) / 2;
                const y = (pdfHeight - finalHeight) / 2;
                pdf.addImage(imgData, 'JPEG', x, y, finalWidth, finalHeight);
                isFirstPage = false;
            };
            
            const waitForChartsToRender = async (container: HTMLElement, maxWaitTime = 5000): Promise<void> => {
                return new Promise((resolve) => {
                    const startTime = Date.now();
                    let consecutiveReadyChecks = 0;
                    const requiredConsecutiveChecks = 3; // Require 3 consecutive ready checks
                    
                    const checkChartsReady = () => {
                        // Check for SVG elements (Recharts renders to SVG)
                        const svgElements = container.querySelectorAll('svg');
                        const hasCharts = svgElements.length > 0;
                        
                        if (hasCharts) {
                            // Check if SVGs have actual content (not empty)
                            let allChartsReady = true;
                            svgElements.forEach(svg => {
                                try {
                                    // Check if SVG has children
                                    if (svg.children.length === 0) {
                                        allChartsReady = false;
                                        return;
                                    }
                                    
                                    // Check if SVG has dimensions (getBBox might throw if not rendered)
                                    const bbox = svg.getBBox();
                                    if (bbox.width === 0 || bbox.height === 0) {
                                        allChartsReady = false;
                                        return;
                                    }
                                    
                                    // Additional check: look for actual chart elements (bars, lines, paths)
                                    const hasChartElements = svg.querySelectorAll('path, rect, line, circle').length > 0;
                                    if (!hasChartElements) {
                                        allChartsReady = false;
                                        return;
                                    }
                                    
                                    // Check client dimensions as well
                                    if (svg.clientWidth === 0 || svg.clientHeight === 0) {
                                        allChartsReady = false;
                                        return;
                                    }
                                } catch (e) {
                                    // getBBox() can throw if SVG is not yet rendered
                                    allChartsReady = false;
                                }
                            });
                            
                            if (allChartsReady) {
                                consecutiveReadyChecks++;
                                // Require multiple consecutive ready checks to ensure stability
                                if (consecutiveReadyChecks >= requiredConsecutiveChecks) {
                                    // Additional wait to ensure all rendering is complete (reduced from 500ms)
                                    console.log(`Charts ready after ${Date.now() - startTime}ms, waiting final ${200}ms`);
                                    setTimeout(resolve, 200);
                                    return;
                                }
                            } else {
                                // Reset counter if not ready
                                consecutiveReadyChecks = 0;
                            }
                        }
                        
                        // If no charts found, might be a text-only page, wait a bit and proceed
                        if (!hasCharts && Date.now() - startTime > 1000) {
                            console.log('No charts found, proceeding with text-only page');
                            resolve();
                            return;
                        }
                        
                        // Check timeout
                        if (Date.now() - startTime > maxWaitTime) {
                            console.warn(`Chart rendering timeout after ${maxWaitTime}ms, proceeding anyway`);
                            resolve();
                            return;
                        }
                        
                        // Check again in 150ms (slightly longer interval for better stability)
                        setTimeout(checkChartsReady, 150);
                    };
                    
                    // Start checking after longer initial render delay to allow React to fully render
                    setTimeout(checkChartsReady, 500);
                });
            };
            
            const addComponentPageToPdf = async (component: React.ReactElement) => {
                // Render the component
                root.render(component);
                
                // Wait for React to render and DOM to update (reduced from 400ms)
                await new Promise<void>(resolve => setTimeout(resolve, 200));
                
                // Force a layout recalculation to ensure everything is positioned
                void renderContainer.offsetHeight;
                
                // Wait for charts to fully render with improved checking
                // But use shorter timeout since we're using captured charts for most pages
                await waitForChartsToRender(renderContainer, 5000);
                
                // One final wait to ensure everything is settled (reduced from 200ms)
                await new Promise<void>(resolve => setTimeout(resolve, 100));
                
                // Capture the canvas with reduced scale for smaller file size
                const canvas = await html2canvas(renderContainer, { 
                    scale: 2, // Reduced from 3 - still excellent quality but much smaller file
                    useCORS: true,
                    logging: false,
                    onclone: (clonedDoc) => {
                        // Ensure all images are loaded in the cloned document
                        const images = clonedDoc.querySelectorAll('img');
                        images.forEach((img: HTMLImageElement) => {
                            if (!img.complete) {
                                img.src = img.src; // Force reload
                            }
                        });
                    }
                });
                await addCanvasToPdf(canvas);
            };
            
          
            /**
             * Safely extracts base64 data from page_data string.
             * Handles both data URL format (data:application/pdf;base64,<data>) and pure base64 format.
             */
            const extractBase64Data = (pageData: string): string => {
                if (!pageData || typeof pageData !== 'string') {
                    throw new Error('pageData is empty, undefined, or not a string');
                }
                
                // Trim whitespace
                const trimmed = pageData.trim();
                if (!trimmed) {
                    throw new Error('pageData is empty after trimming');
                }
                
                // Check if it's a data URL (contains comma)
                if (trimmed.includes(',')) {
                    const parts = trimmed.split(',');
                    if (parts.length >= 2 && parts[1] && parts[1].trim()) {
                        return parts[1].trim();
                    }
                    throw new Error('Invalid data URL format: missing base64 data after comma');
                }
                
                // If no comma, assume it's already pure base64
                return trimmed;
            };

            const addPdfPagesToPdf = async (pdfDataUrls: string[]) => {
                if (!pdfDataUrls || pdfDataUrls.length === 0) {
                    console.log('No PDF pages to add');
                    return;
                }
                for (const pdfData of pdfDataUrls) {
                    try {
                        const base64Data = extractBase64Data(pdfData);
                        const loadingTask = pdfjsLib.getDocument({ data: atob(base64Data) });
                        const sourcePdf = await loadingTask.promise;
                        for (let i = 1; i <= sourcePdf.numPages; i++) {
                            const page = await sourcePdf.getPage(i);
                            const viewport = page.getViewport({ scale: 2.5 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            if (!context) continue;
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            await page.render({ canvasContext: context, viewport }).promise;
                            await addCanvasToPdf(canvas); // Fixed: Added await
                        }
                    } catch (error) {
                        console.error('Error adding PDF page:', error);
                    }
                }
            };

            const formatCurrencyForTitle = (value: string) => {
                if (!value) return '$1';
                const number = parseFloat(value.replace(/[^0-9.-]+/g, ""));
                if (isNaN(number) || number === 0) return '$1';
                return new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: 'USD',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(number);
            };
            
            // Combined component for Performance Table and Growth Chart on one page
            const CombinedPerformancePage: React.FC = () => {
                const initialInvestment = parseFloat(investmentAmount.replace(/[^0-9.-]+/g, "")) || 1;
                const portfolioMap = new Map(reportData.portfolio.growthOfDollar.map((d: any) => [d.date, d.value * initialInvestment]));
                const benchmarkMap = new Map(reportData.benchmark.growthOfDollar.map((d: any) => [d.date, d.value * initialInvestment]));
                const secondaryMap = reportData.secondaryPortfolio 
                    ? new Map(reportData.secondaryPortfolio.growthOfDollar.map((d: any) => [d.date, d.value * initialInvestment]))
                    : null;
                const allDates = new Set([
                    ...portfolioMap.keys(), 
                    ...benchmarkMap.keys(),
                    ...(secondaryMap ? secondaryMap.keys() : [])
                ]);
                const sortedDates = Array.from(allDates).sort();
                const chartData = sortedDates.map(date => {
                    const dataPoint: any = {
                        date,
                        Portfolio: portfolioMap.get(date),
                    };
                    if (secondaryMap) {
                        dataPoint['Secondary Portfolio'] = secondaryMap.get(date);
                    }
                    dataPoint['Benchmark'] = benchmarkMap.get(date);
                    return dataPoint;
                });

                // Calculate year tick positions (only January dates)
                const yearTicks = chartData
                    .map((d: { date: string; Portfolio: number; Benchmark: number }) => {
                        const date = new Date(d.date);
                        return date.getMonth() === 0 ? d.date : null;
                    })
                    .filter((date): date is string => date !== null);

                const currencyFormatter = (value: number) => {
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    }).format(value);
                };
                
                return (
                    <div className="space-y-4">
                        <PerformanceTable portfolio={reportData.portfolio} benchmark={reportData.benchmark} returnType={reportData.portfolio.returnType} secondaryPortfolio={reportData.secondaryPortfolio} />
                        {capturedCharts['growthChart'] ? (
                            <div className="bg-white px-0 py-0 rounded-lg border border-gray-200">
                                {/* Removed redundant title wrapper - chart image already includes title from GrowthChart component */}
                                <div className="flex justify-center">
                                    <img src={capturedCharts['growthChart']} alt="Growth Chart" className="max-w-full h-auto" style={{ maxHeight: '380px' }} />
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white px-0 py-0 rounded-lg border border-gray-200">
                                {/* Removed redundant title wrapper - using inline chart without extra title */}
                                {/* Reduced margins and padding to maximize chart size */}
                                <div style={{ width: '100%', height: 400 }}>
                                        <LineChart 
                                            width={700} 
                                            height={400} 
                                            data={chartData} 
                                            margin={{ top: 5, right: 5, left: 5, bottom: 50 }} 
                                            isAnimationActive={false}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis 
                                                dataKey="date" 
                                                tick={{ fontSize: 10, fill: '#6b7280' }} 
                                                tickFormatter={(tick) => {
                                                    const date = new Date(tick);
                                                    // Only show year for January (month 0)
                                                    if (date.getMonth() === 0) return date.getFullYear().toString();
                                                    return '';
                                                }}
                                                // Only show ticks for January dates (years only)
                                                ticks={yearTicks.length > 0 ? yearTicks : undefined}
                                                interval={0}
                                            />
                                            <YAxis 
                                                tickFormatter={(value) => {
                                                    // Round to whole numbers with no decimals
                                                    return new Intl.NumberFormat('en-US', {
                                                        style: 'currency',
                                                        currency: 'USD',
                                                        minimumFractionDigits: 0,
                                                        maximumFractionDigits: 0,
                                                    }).format(Math.round(value));
                                                }}
                                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                                domain={['dataMin', 'dataMax']}
                                                allowDecimals={false}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => currencyFormatter(value)}
                                                labelFormatter={(label: string) => `Date: ${label}`}
                                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                            />
                                            {/* Legend positioned below chart, centered with reduced spacing */}
                                            <Legend 
                                                verticalAlign="bottom" 
                                                align="center"
                                                wrapperStyle={{ paddingTop: '10px', fontSize: '11px', color: '#4b5563' }}
                                                iconType="line"
                                            />
                                            <Line type="monotone" dataKey="Portfolio" stroke="#003365" dot={false} strokeWidth={2} name={reportData.portfolio.name} />
                                            {reportData.secondaryPortfolio && (
                                                <Line type="monotone" dataKey="Secondary Portfolio" stroke="#10b981" dot={false} strokeWidth={2} name={reportData.secondaryPortfolio.name} />
                                            )}
                                            <Line type="monotone" dataKey="Benchmark" stroke="#9ca3af" dot={false} strokeWidth={2} name={reportData.benchmark.name} />
                                            {reportData.secondaryPortfolio && (
                                                <Line type="monotone" dataKey="Secondary Portfolio" stroke="#10b981" dot={false} strokeWidth={2} name={reportData.secondaryPortfolio.name} />
                                            )}
                                        </LineChart>
                                    </div>
                                </div>
                            )}
                    </div>
                );
            };

            // Combined component for Rolling Returns Chart and Drawdown Table on one page
            const CombinedReturnsAndDrawdownPage: React.FC = () => {
                return (
                    <div className="space-y-6">
                        {/* Rolling Returns Chart - first */}
                        {capturedCharts['rollingReturnsChart'] ? (
                            <CapturedChartImage 
                                imageDataUrl={capturedCharts['rollingReturnsChart']} 
                                title="Rolling 12-Month Returns Distribution" 
                                showTitle={false} 
                            />
                        ) : (
                            <RollingReturnsChart 
                                portfolio={reportData.portfolio} 
                                benchmark={reportData.benchmark} 
                                isPdfMode={true} 
                                showTitle={false}
                                secondaryPortfolio={reportData.secondaryPortfolio}
                            />
                        )}
                        {/* Drawdown Table - second */}
                        <div className="mt-6">
                            <DrawdownTable 
                                portfolio={reportData.portfolio} 
                                benchmark={reportData.benchmark}
                                secondaryPortfolio={reportData.secondaryPortfolio}
                            />
                        </div>
                    </div>
                );
            };

            // Pie chart colors - updated color scheme
            const STRATEGY_COLORS = ['#003365', '#4a90e2', '#50e3c2', '#f5a623', '#10b981', '#8b5cf6'];
            const CATEGORY_COLORS: { [key: string]: string } = {
                'Equity': '#003365',
                'Fixed Income': '#4a90e2',
                'Alternatives': '#10b981',
            };

            // Component for allocation pie charts
            const AllocationPieCharts: React.FC = () => {
                // DEBUG: Log raw input data
                console.log('=== PIE CHART DEBUG - RAW INPUT ===');
                console.log('strategyAllocationData (raw):', JSON.stringify(strategyAllocationData, null, 2));
                console.log('categoryAllocationData (raw):', JSON.stringify(categoryAllocationData, null, 2));
                
                // Filter out zero or very small values to ensure accurate rendering
                const filteredStrategyData = strategyAllocationData.filter(item => item.value > 0.01);
                const filteredCategoryData = categoryAllocationData.filter(item => item.value > 0.01);
                
                // DEBUG: Log filtered data
                console.log('=== PIE CHART DEBUG - FILTERED ===');
                console.log('filteredStrategyData:', JSON.stringify(filteredStrategyData, null, 2));
                console.log('filteredStrategyData.length:', filteredStrategyData.length);
                console.log('filteredCategoryData:', JSON.stringify(filteredCategoryData, null, 2));
                console.log('filteredCategoryData.length:', filteredCategoryData.length);
                
                // Special case: if only one item, create simple 100% data without normalization
                let normalizedStrategyData: { name: string; value: number }[];
                let normalizedCategoryData: { name: string; value: number }[];
                
                if (filteredStrategyData.length === 1) {
                    // Single item - set to exactly 100% without any processing
                    normalizedStrategyData = [{ ...filteredStrategyData[0], value: 100 }];
                    console.log('=== PIE CHART DEBUG - SINGLE STRATEGY ===');
                    console.log('Single strategy detected, setting to 100%');
                    console.log('normalizedStrategyData:', JSON.stringify(normalizedStrategyData, null, 2));
                } else {
                    // Multiple items - normalize data to ensure percentages sum to exactly 100%
                    const normalizeData = (data: { name: string; value: number }[]) => {
                        if (data.length === 0) return [];
                        const total = data.reduce((sum, item) => sum + item.value, 0);
                        if (total === 0) return [];
                        
                        // Check if data is already in percentage format (sums to ~100)
                        const isPercentageFormat = Math.abs(total - 100) < 0.1;
                        
                        let normalized: { name: string; value: number }[];
                        
                        if (isPercentageFormat) {
                            // Data is already in percentage format, just ensure it sums to exactly 100
                            normalized = data.map(item => ({
                                ...item,
                                value: item.value
                            }));
                        } else {
                            // Data is in decimal format (0-1), normalize to percentage
                            normalized = data.map(item => ({
                                ...item,
                                value: (item.value / total) * 100
                            }));
                        }
                        
                        // Ensure the sum is exactly 100.0 by adjusting the largest value
                        const sum = normalized.reduce((s, item) => s + item.value, 0);
                        const diff = 100 - sum;
                        
                        if (Math.abs(diff) > 0.0001 && normalized.length > 0) {
                            // Add the difference to the largest value to make sum exactly 100
                            const largestIndex = normalized.reduce((maxIdx, item, idx) => 
                                item.value > normalized[maxIdx].value ? idx : maxIdx, 0
                            );
                            normalized[largestIndex].value = normalized[largestIndex].value + diff;
                        }
                        
                        // Round to 2 decimal places for display, but keep precision for calculation
                        return normalized.map(item => ({
                            ...item,
                            value: Math.round(item.value * 100) / 100
                        }));
                    };
                    
                    normalizedStrategyData = normalizeData(filteredStrategyData);
                }
                
                if (filteredCategoryData.length === 1) {
                    // Single item - set to exactly 100% without any processing
                    normalizedCategoryData = [{ ...filteredCategoryData[0], value: 100 }];
                    console.log('=== PIE CHART DEBUG - SINGLE CATEGORY ===');
                    console.log('Single category detected, setting to 100%');
                    console.log('normalizedCategoryData:', JSON.stringify(normalizedCategoryData, null, 2));
                } else {
                    // Multiple items - normalize data to ensure percentages sum to exactly 100%
                    const normalizeData = (data: { name: string; value: number }[]) => {
                        if (data.length === 0) return [];
                        const total = data.reduce((sum, item) => sum + item.value, 0);
                        if (total === 0) return [];
                        
                        // Check if data is already in percentage format (sums to ~100)
                        const isPercentageFormat = Math.abs(total - 100) < 0.1;
                        
                        let normalized: { name: string; value: number }[];
                        
                        if (isPercentageFormat) {
                            // Data is already in percentage format, just ensure it sums to exactly 100
                            normalized = data.map(item => ({
                                ...item,
                                value: item.value
                            }));
                        } else {
                            // Data is in decimal format (0-1), normalize to percentage
                            normalized = data.map(item => ({
                                ...item,
                                value: (item.value / total) * 100
                            }));
                        }
                        
                        // Ensure the sum is exactly 100.0 by adjusting the largest value
                        const sum = normalized.reduce((s, item) => s + item.value, 0);
                        const diff = 100 - sum;
                        
                        if (Math.abs(diff) > 0.0001 && normalized.length > 0) {
                            // Add the difference to the largest value to make sum exactly 100
                            const largestIndex = normalized.reduce((maxIdx, item, idx) => 
                                item.value > normalized[maxIdx].value ? idx : maxIdx, 0
                            );
                            normalized[largestIndex].value = normalized[largestIndex].value + diff;
                        }
                        
                        // Round to 2 decimal places for display, but keep precision for calculation
                        return normalized.map(item => ({
                            ...item,
                            value: Math.round(item.value * 100) / 100
                        }));
                    };
                    
                    normalizedCategoryData = normalizeData(filteredCategoryData);
                }
                
                // Final verification: ensure all sums are exactly 100
                const ensureExactSum = (data: { name: string; value: number }[]) => {
                    if (data.length === 0) return data;
                    const sum = data.reduce((s, item) => s + item.value, 0);
                    const diff = 100 - sum;
                    if (Math.abs(diff) > 0.0001) {
                        // Find the largest value and adjust it
                        const largestIdx = data.reduce((maxIdx, item, idx) => 
                            item.value > data[maxIdx].value ? idx : maxIdx, 0
                        );
                        const newData = [...data];
                        newData[largestIdx] = {
                            ...newData[largestIdx],
                            value: newData[largestIdx].value + diff
                        };
                        return newData;
                    }
                    return data;
                };
                
                // Only apply ensureExactSum for multi-item cases (single items are already at 100%)
                if (normalizedStrategyData.length > 1) {
                    normalizedStrategyData = ensureExactSum(normalizedStrategyData);
                }
                if (normalizedCategoryData.length > 1) {
                    normalizedCategoryData = ensureExactSum(normalizedCategoryData);
                }
                
                if (normalizedStrategyData.length === 0 && normalizedCategoryData.length === 0) {
                    return null;
                }

                // Debug logging with detailed verification
                const finalStrategySum = normalizedStrategyData.reduce((sum, item) => sum + item.value, 0);
                const finalCategorySum = normalizedCategoryData.reduce((sum, item) => sum + item.value, 0);
                
                console.log('=== PIE CHART DEBUG - FINAL DATA ===');
                console.log('normalizedStrategyData (FINAL):', JSON.stringify(normalizedStrategyData, null, 2));
                console.log('strategySum:', finalStrategySum);
                console.log('strategySumIs100:', Math.abs(finalStrategySum - 100) < 0.01);
                console.log('normalizedCategoryData (FINAL):', JSON.stringify(normalizedCategoryData, null, 2));
                console.log('categorySum:', finalCategorySum);
                console.log('categorySumIs100:', Math.abs(finalCategorySum - 100) < 0.01);
                console.log('=== END PIE CHART DEBUG ===');
                
                // Final safety check: if sum is not 100, force it
                if (Math.abs(finalStrategySum - 100) > 0.01 && normalizedStrategyData.length > 0) {
                    console.warn('Strategy data sum is not 100:', finalStrategySum, 'Adjusting...');
                    const diff = 100 - finalStrategySum;
                    const largestIdx = normalizedStrategyData.reduce((maxIdx, item, idx) => 
                        item.value > normalizedStrategyData[maxIdx].value ? idx : maxIdx, 0
                    );
                    normalizedStrategyData[largestIdx].value += diff;
                }
                
                if (Math.abs(finalCategorySum - 100) > 0.01 && normalizedCategoryData.length > 0) {
                    console.warn('Category data sum is not 100:', finalCategorySum, 'Adjusting...');
                    const diff = 100 - finalCategorySum;
                    const largestIdx = normalizedCategoryData.reduce((maxIdx, item, idx) => 
                        item.value > normalizedCategoryData[maxIdx].value ? idx : maxIdx, 0
                    );
                    normalizedCategoryData[largestIdx].value += diff;
                }

                const RADIAN = Math.PI / 180;
                const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
                    if (percent < 0.05) return null;
                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                        <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="8" fontWeight="bold">
                            {`${(percent * 100).toFixed(0)}%`}
                        </text>
                    );
                };

                return (
                    <div className="space-y-4">
                        {/* Portfolio Allocation */}
                        <div className="bg-white border border-gray-200 rounded-lg p-3">
                            <div className="mb-2 pb-1 border-b border-gray-200">
                                <h3 className="text-sm font-semibold text-[#003365]" style={{ fontSize: '0.85rem' }}>Portfolio Allocation</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {/* Strategy Allocation Chart */}
                                {normalizedStrategyData.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-gray-700 mb-2 text-center" style={{ fontSize: '0.75rem' }}>By Strategy</h4>
                                        <div style={{ width: '100%', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <PieChart width={200} height={120}>
                                                {(() => {
                                                    // Recharts has a known issue with single-item pie charts - add a tiny placeholder
                                                    // to force proper rendering of a full circle
                                                    const pieData = normalizedStrategyData.length === 1 
                                                        ? [
                                                            { name: normalizedStrategyData[0].name, value: 99.99 },
                                                            { name: '__placeholder__', value: 0.01 }
                                                          ]
                                                        : normalizedStrategyData;
                                                    return (
                                                        <Pie
                                                            data={pieData}
                                                            cx={50}
                                                            cy={60}
                                                            labelLine={false}
                                                            label={normalizedStrategyData.length === 1 ? null : renderLabel}
                                                            outerRadius={38}
                                                            innerRadius={0}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            isAnimationActive={false}
                                                            startAngle={normalizedStrategyData.length === 1 ? 90 : 270}
                                                            endAngle={normalizedStrategyData.length === 1 ? -270 : -90}
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell 
                                                                    key={`cell-${index}`} 
                                                                    fill={
                                                                        entry.name === '__placeholder__' 
                                                                            ? 'transparent' 
                                                                            : STRATEGY_COLORS[index % STRATEGY_COLORS.length]
                                                                    } 
                                                                />
                                                            ))}
                                                        </Pie>
                                                    );
                                                })()}
                                                <Tooltip
                                                    formatter={(value: number) => `${value.toFixed(1)}%`}
                                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '10px' }}
                                                />
                                                <Legend 
                                                    verticalAlign="middle" 
                                                    align="right"
                                                    wrapperStyle={{ fontSize: '9px', color: '#4b5563', paddingLeft: '15px', width: '100px' }}
                                                    iconSize={6}
                                                />
                                            </PieChart>
                                        </div>
                                    </div>
                                )}
                                {/* Category Allocation Chart */}
                                {normalizedCategoryData.length > 0 && (
                                    <div>
                                        <h4 className="text-xs font-medium text-gray-700 mb-2 text-center" style={{ fontSize: '0.75rem' }}>By Asset Category</h4>
                                        <div style={{ width: '100%', height: '120px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                            <PieChart width={200} height={120}>
                                                {(() => {
                                                    // Recharts has a known issue with single-item pie charts - add a tiny placeholder
                                                    // to force proper rendering of a full circle
                                                    const pieData = normalizedCategoryData.length === 1 
                                                        ? [
                                                            { name: normalizedCategoryData[0].name, value: 99.99 },
                                                            { name: '__placeholder__', value: 0.01 }
                                                          ]
                                                        : normalizedCategoryData;
                                                    return (
                                                        <Pie
                                                            data={pieData}
                                                            cx={50}
                                                            cy={60}
                                                            labelLine={false}
                                                            label={normalizedCategoryData.length === 1 ? null : renderLabel}
                                                            outerRadius={38}
                                                            innerRadius={0}
                                                            fill="#8884d8"
                                                            dataKey="value"
                                                            isAnimationActive={false}
                                                            startAngle={normalizedCategoryData.length === 1 ? 90 : 270}
                                                            endAngle={normalizedCategoryData.length === 1 ? -270 : -90}
                                                        >
                                                            {pieData.map((entry, index) => (
                                                                <Cell 
                                                                    key={`cell-${index}`} 
                                                                    fill={
                                                                        entry.name === '__placeholder__' 
                                                                            ? 'transparent' 
                                                                            : (CATEGORY_COLORS[entry.name] || STRATEGY_COLORS[index % STRATEGY_COLORS.length])
                                                                    } 
                                                                />
                                                            ))}
                                                        </Pie>
                                                    );
                                                })()}
                                                <Tooltip
                                                    formatter={(value: number) => `${value.toFixed(1)}%`}
                                                    contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px', fontSize: '10px' }}
                                                />
                                                <Legend 
                                                    verticalAlign="middle" 
                                                    align="right"
                                                    wrapperStyle={{ fontSize: '9px', color: '#4b5563', paddingLeft: '15px', width: '100px' }}
                                                    iconSize={6}
                                                />
                                            </PieChart>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            };

            // Combined component for Executive Summary and Client Variables
            const ExecutiveSummaryWithClientInfo: React.FC = () => {
                return (
                    <div className="space-y-6">
                        {/* 1. Client Information - First */}
                        <ClientVariables
                            clientName={clientName}
                            investmentAmount={investmentAmount}
                            clientAge={clientAge}
                            annualDistribution={annualDistribution}
                            riskTolerance={riskTolerance}
                            adviserName={adviserName}
                        />
                        {/* 2. Allocation Pie Charts - Second */}
                        <AllocationPieCharts />
                        {/* 3. AI Summary - Third */}
                        {aiSummary && <SummaryForPdf summary={aiSummary} />}
                    </div>
                );
            };

            const reportPageComponents = [
                // Always show Executive Summary page (with or without AI summary) to include client variables
                {
                    title: 'Executive Summary',
                    component: <ExecutiveSummaryWithClientInfo />
                },
                {
                    title: 'Performance Analysis',
                    component: <CombinedPerformancePage />
                },
                {
                    title: 'Returns & Drawdown Analysis',
                    component: <CombinedReturnsAndDrawdownPage />
                },
                (reportData.portfolio.distributionAnalysis || reportData.benchmark.distributionAnalysis || reportData.secondaryPortfolio?.distributionAnalysis) ? {
                    title: 'Monte Carlo Simulation Analysis',
                    component: <DistributionAnalysis portfolio={reportData.portfolio} benchmark={reportData.benchmark} secondaryPortfolio={reportData.secondaryPortfolio} />
                } : null
            // FIX: Replaced JSX.Element with React.ReactElement to fix "Cannot find namespace 'JSX'" error.
            ].filter((p): p is { title: string; component: React.ReactElement; } => p !== null);

            // Fetch page data from library for selected pages
            const fetchPageData = async (pageIds: string[]): Promise<string[]> => {
                if (pageIds.length === 0) return [];
                
                try {
                    const pages = await Promise.all(
                        pageIds.map(id => apiService.getPageFromLibrary(id))
                    );
                    return pages.map(p => p.page_data);
                } catch (error) {
                    console.error('Error fetching pages from library:', error);
                    return [];
                }
            };

            const beforeOutputPages = await fetchPageData(selectedBeforePageIds);
            const pagesAfterOutput = await fetchPageData(selectedAfterPageIds);

            const totalPages = 1 + beforeOutputPages.length + reportPageComponents.length + pagesAfterOutput.length;
            let pageCounter = 1;

            // 1. Title Page
            await addComponentPageToPdf(<TitlePage {...reportData} firmLogo={firmLogo} secondaryLogo={secondaryLogo} adviserName={adviserName} clientName={clientName} investmentAmount={investmentAmount} clientAge={clientAge} annualDistribution={annualDistribution} riskTolerance={riskTolerance} portfolioName={reportData.portfolio.name} />);
            pageCounter++;

            // 2. "Before" PDF pages
            await addPdfPagesToPdf(beforeOutputPages);

            // 3. Main Report Content Pages
            for (const page of reportPageComponents) {
                try {
                    console.log(`Adding page: ${page.title}`);
                    await addComponentPageToPdf(
                        <ReportPage
                            firmLogo={firmLogo}
                            adviserName={adviserName}
                            clientName={clientName}
                            title={page.title}
                            pageNumber={pageCounter}
                            totalPages={totalPages}
                        >
                            {page.component}
                        </ReportPage>
                    );
                    pageCounter++;
                } catch (error) {
                    console.error(`Error adding page ${page.title}:`, error);
                    // Continue with next page even if one fails
                }
            }

            // 4. "After" PDF pages
            console.log(`Adding ${pagesAfterOutput.length} after output pages`);
            await addPdfPagesToPdf(pagesAfterOutput);

            // Generate filename: Proposal_ClientName_AdviserName_short date
            const sanitizeFilename = (str: string): string => {
                if (!str) return '';
                // Remove invalid filename characters and replace spaces with underscores
                return str.replace(/[<>:"/\\|?*]/g, '').replace(/\s+/g, '_').trim();
            };

            const formatShortDate = (): string => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const day = String(now.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            const clientNamePart = sanitizeFilename(clientName || '');
            const adviserNamePart = sanitizeFilename(adviserName || '');
            const datePart = formatShortDate();
            
            let filename = 'Proposal';
            if (clientNamePart) filename += `_${clientNamePart}`;
            if (adviserNamePart) filename += `_${adviserNamePart}`;
            filename += `_${datePart}.pdf`;

            pdf.save(filename);

        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("An error occurred while generating the PDF. Please check the console.");
        } finally {
            root.unmount();
	document.body.removeChild(renderContainer);
            setIsGeneratingPdf(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
                       
             <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">Comparative Performance Analysis</h2>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf || !aiSummary || aiSummary.trim() === ''}
                        className="flex items-center space-x-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-50"
                        title={!aiSummary || aiSummary.trim() === '' ? 'Please generate the AI summary first' : 'Download PDF report'}
                    >
                        {isGeneratingPdf ? (
                            <>
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                <span>Generating...</span>
                            </>
                        ) : (
                            <>
                                <DownloadIcon />
                                <span>Download PDF</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
            
            {/* This is the content visible on the screen */}
            <div className="p-4 space-y-8">
                <PerformanceTable 
                    portfolio={reportData.portfolio}
                    benchmark={reportData.benchmark}
                    returnType={reportData.portfolio.returnType}
                    secondaryPortfolio={reportData.secondaryPortfolio}
                />
                <div ref={growthChartRef}>
                    <GrowthChart
                        portfolio={reportData.portfolio}
                        benchmark={reportData.benchmark}
                        investmentAmount={investmentAmount}
                        secondaryPortfolio={reportData.secondaryPortfolio}
                    />
                </div>
                <DistributionAnalysis
                    portfolio={reportData.portfolio}
                    benchmark={reportData.benchmark}
                    secondaryPortfolio={reportData.secondaryPortfolio}
                />
                <DrawdownTable 
                    portfolio={reportData.portfolio}
                    benchmark={reportData.benchmark}
                    secondaryPortfolio={reportData.secondaryPortfolio}
                />
                <div ref={rollingReturnsChartRef}>
                    <RollingReturnsChart
                        portfolio={reportData.portfolio}
                        benchmark={reportData.benchmark}
                        secondaryPortfolio={reportData.secondaryPortfolio}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReportOutput;