import React, { useRef, useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import { ReportData } from '../types';
import PerformanceTable from './PerformanceTable';
import DrawdownTable from './DrawdownTable';
import RollingReturnsChart from './RollingReturnsChart';
import { DownloadIcon, SaveIcon } from './icons/Icons';
import TitlePage from './TitlePage';
import ReportPage from './ReportPage'; // New import
import GrowthChart from './GrowthChart';
import DistributionAnalysis from './DistributionAnalysis';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://aistudiocdn.com/pdfjs-dist@^4.4.168/build/pdf.worker.min.mjs';

interface ReportOutputProps {
    reportData: ReportData;
    beforeOutputPages: string[];
    pagesAfterOutput: string[];
    aiSummary: string;
    firmLogo: string | null;
    adviserName: string;
    clientName: string;
    investmentAmount: string;
    clientAge: string;
    annualDistribution: string;
    riskTolerance: string;
}

// Component to display captured chart image in PDF
const CapturedChartImage: React.FC<{ imageDataUrl: string; title: string }> = ({ imageDataUrl, title }) => {
    if (!imageDataUrl) {
        return <div className="p-4 text-gray-500">Chart not available</div>;
    }
    return (
        <div className="bg-white p-6 rounded-lg border border-gray-300 shadow-sm">
            <div className="mb-4 pb-2 border-b border-[#003365]">
                <h4 className="font-semibold text-lg text-[#003365]">{title}</h4>
            </div>
            <div className="flex justify-center">
                <img src={imageDataUrl} alt={title} className="max-w-full h-auto" style={{ maxHeight: '400px' }} />
            </div>
        </div>
    );
};

const SummaryForPdf: React.FC<{ summary: string }> = ({ summary }) => {
    const paragraphs = summary.split('\n').filter(p => p.trim() !== '');
    
    return (
        <div className="space-y-5">
            <div className="mb-4 pb-2 border-b border-[#003365]">
                <h3 className="text-lg font-semibold text-[#003365]">Executive Summary</h3>
            </div>
            <div className="bg-white border border-gray-300 rounded-lg p-5 shadow-sm">
                <div className="prose max-w-none text-gray-700 space-y-3" style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
                    {paragraphs.map((paragraph, index) => {
                        // Check if paragraph is a heading (starts with ** and ends with **)
                        const isHeading = paragraph.trim().startsWith('**') && paragraph.trim().endsWith('**');
                        const cleanParagraph = paragraph.replace(/\*\*/g, '').trim();
                        
                        if (isHeading) {
                            return (
                                <h4 key={index} className="text-base font-semibold text-[#003365] mt-3 mb-2 pb-1 border-b border-gray-200">
                                    {cleanParagraph}
                                </h4>
                            );
                        }
                        
                        return (
                            <p key={index} className="text-sm leading-relaxed text-gray-700 break-words">
                                {paragraph}
                            </p>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};


const ReportOutput: React.FC<ReportOutputProps> = ({ 
    reportData, 
    beforeOutputPages, 
    pagesAfterOutput, 
    aiSummary, 
    firmLogo,
    adviserName,
    clientName,
    investmentAmount,
    clientAge,
    annualDistribution,
    riskTolerance
}) => {
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    // Refs to capture already-rendered charts from screen
    const growthChartRef = useRef<HTMLDivElement>(null);
    const rollingReturnsChartRef = useRef<HTMLDivElement>(null);

    const handleSaveReport = () => {
        if (!reportData) {
            alert("No report data to save.");
            return;
        }
        try {
            const dataToSave = {
                reportData,
                aiSummary,
                savedAt: new Date().toISOString(),
            };
            localStorage.setItem('investmentProposalReport', JSON.stringify(dataToSave));
            alert('Report saved successfully to your browser\'s local storage!');
        } catch (error) {
            console.error("Error saving report to local storage:", error);
            alert("Failed to save report. Your browser's local storage might be full or disabled.");
        }
    };

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
            
          
            const addPdfPagesToPdf = async (pdfDataUrls: string[]) => {
                if (!pdfDataUrls || pdfDataUrls.length === 0) {
                    console.log('No PDF pages to add');
                    return;
                }
                for (const pdfData of pdfDataUrls) {
                    try {
                        const loadingTask = pdfjsLib.getDocument({ data: atob(pdfData.split(',')[1]) });
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
                const allDates = new Set([...portfolioMap.keys(), ...benchmarkMap.keys()]);
                const sortedDates = Array.from(allDates).sort();
                const chartData = sortedDates.map(date => ({
                    date,
                    Portfolio: portfolioMap.get(date),
                    Benchmark: benchmarkMap.get(date),
                }));

                const currencyFormatter = (value: number) => {
                    return new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD',
                    }).format(value);
                };
                
                return (
                    <div className="space-y-4">
                        <PerformanceTable portfolio={reportData.portfolio} benchmark={reportData.benchmark} returnType={reportData.portfolio.returnType} />
                        <div className="mt-4">
                            {capturedCharts['growthChart'] ? (
                                <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                                    <div className="mb-3 pb-2 border-b border-[#003365]">
                                        <h4 className="font-semibold text-base text-[#003365]">Growth of {formatCurrencyForTitle(investmentAmount)}</h4>
                                        <p className="text-xs text-gray-600 mt-1">Historical performance comparison</p>
                                    </div>
                                    <div className="flex justify-center">
                                        <img src={capturedCharts['growthChart']} alt="Growth Chart" className="max-w-full h-auto" style={{ maxHeight: '280px' }} />
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-white p-4 rounded-lg border border-gray-300 shadow-sm">
                                    <div className="mb-3 pb-2 border-b border-[#003365]">
                                        <h4 className="font-semibold text-base text-[#003365]">Growth of {formatCurrencyForTitle(investmentAmount)}</h4>
                                        <p className="text-xs text-gray-600 mt-1">Historical performance comparison</p>
                                    </div>
                                    {/* Increased height and bottom margin for legend below */}
                                    <div style={{ width: '100%', height: 320 }}>
                                        <LineChart 
                                            width={700} 
                                            height={320} 
                                            data={chartData} 
                                            margin={{ top: 10, right: 20, left: 10, bottom: 60 }} 
                                            isAnimationActive={false}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                            <XAxis 
                                                dataKey="date" 
                                                tick={{ fontSize: 10, fill: '#6b7280' }} 
                                                tickFormatter={(tick) => {
                                                    const date = new Date(tick);
                                                    if (date.getMonth() === 0) return date.getFullYear().toString();
                                                    return '';
                                                }}
                                            />
                                            <YAxis 
                                                tickFormatter={(value) => currencyFormatter(value)}
                                                tick={{ fontSize: 10, fill: '#6b7280' }}
                                                domain={['dataMin', 'dataMax']}
                                            />
                                            <Tooltip
                                                formatter={(value: number) => currencyFormatter(value)}
                                                labelFormatter={(label: string) => `Date: ${label}`}
                                                contentStyle={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '4px' }}
                                            />
                                            {/* Legend positioned below chart, centered */}
                                            <Legend 
                                                verticalAlign="bottom" 
                                                align="center"
                                                wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }}
                                                iconType="line"
                                            />
                                            <Line type="monotone" dataKey="Portfolio" stroke="#4a90e2" dot={false} strokeWidth={2} name={reportData.portfolio.name} />
                                            <Line type="monotone" dataKey="Benchmark" stroke="#8884d8" dot={false} strokeWidth={2} name={reportData.benchmark.name} />
                                        </LineChart>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            };

            const reportPageComponents = [
                aiSummary ? {
                    title: 'Executive Summary',
                    component: <SummaryForPdf summary={aiSummary} />
                } : null,
                {
                    title: 'Performance Analysis',
                    component: <CombinedPerformancePage />
                },
                {
                    title: 'Largest Drawdown Analysis',
                    component: <DrawdownTable portfolio={reportData.portfolio} benchmark={reportData.benchmark} />
                },
                {
                    title: 'Rolling 12-Month Returns Analysis',
                    // Use captured image if available, otherwise fall back to rendering
                    component: capturedCharts['rollingReturnsChart']
                        ? <CapturedChartImage imageDataUrl={capturedCharts['rollingReturnsChart']} title="Rolling 12-Month Returns Distribution" />
                        : <RollingReturnsChart portfolio={reportData.portfolio} benchmark={reportData.benchmark} isPdfMode={true} />
                },
                (reportData.portfolio.distributionAnalysis || reportData.benchmark.distributionAnalysis) ? {
                    title: 'Monte Carlo Simulation Analysis',
                    component: <DistributionAnalysis portfolio={reportData.portfolio} benchmark={reportData.benchmark} />
                } : null
            // FIX: Replaced JSX.Element with React.ReactElement to fix "Cannot find namespace 'JSX'" error.
            ].filter((p): p is { title: string; component: React.ReactElement; } => p !== null);

            const totalPages = 1 + beforeOutputPages.length + reportPageComponents.length + pagesAfterOutput.length;
            let pageCounter = 1;

            // 1. Title Page
            await addComponentPageToPdf(<TitlePage {...reportData} firmLogo={firmLogo} adviserName={adviserName} clientName={clientName} investmentAmount={investmentAmount} clientAge={clientAge} annualDistribution={annualDistribution} riskTolerance={riskTolerance} portfolioName={reportData.portfolio.name} />);
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
                        onClick={handleSaveReport}
                        className="flex items-center space-x-2 bg-indigo-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-300"
                    >
                        <SaveIcon />
                        <span>Save Report</span>
                    </button>
                    <button
                        onClick={handleDownloadPdf}
                        disabled={isGeneratingPdf}
                        className="flex items-center space-x-2 bg-green-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-300 disabled:bg-gray-400 disabled:cursor-wait"
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
                />
                <div ref={growthChartRef}>
                    <GrowthChart
                        portfolio={reportData.portfolio}
                        benchmark={reportData.benchmark}
                        investmentAmount={investmentAmount}
                    />
                </div>
                <DistributionAnalysis
                    portfolio={reportData.portfolio}
                    benchmark={reportData.benchmark}
                />
                <DrawdownTable 
                    portfolio={reportData.portfolio}
                    benchmark={reportData.benchmark}
                />
                <div ref={rollingReturnsChartRef}>
                    <RollingReturnsChart
                        portfolio={reportData.portfolio}
                        benchmark={reportData.benchmark}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReportOutput;