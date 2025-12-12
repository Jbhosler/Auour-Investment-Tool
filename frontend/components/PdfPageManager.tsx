import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import { TrashIcon, CheckIcon } from './icons/Icons';
import { apiService } from '../services/apiService';
import PageLibraryManager from './PageLibraryManager';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PageLibraryItem {
    id: string;
    name: string;
    page_data: string;
    position_type: 'before' | 'after';
}

interface PdfPageManagerProps {
    title: string;
    positionType: 'before' | 'after';
    selectedPageIds: string[];
    onUpdateSelectedPages: (pageIds: string[]) => void;
}

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

const PdfThumbnail: React.FC<{ pageData: string }> = ({ pageData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const renderPdf = async () => {
            try {
                const base64Data = extractBase64Data(pageData);
                const pdfSrc = { data: atob(base64Data) };
                const pdf = await pdfjsLib.getDocument(pdfSrc).promise;
                const page = await pdf.getPage(1);
                
                const canvas = canvasRef.current;
                if (!canvas) return;
                
                const context = canvas.getContext('2d');
                if (!context) return;
                
                const container = canvas.parentElement;
                if (!container) return;
                
                const viewport = page.getViewport({ scale: 1 });
                const scale = container.clientWidth / viewport.width;
                const scaledViewport = page.getViewport({ scale });

                canvas.height = scaledViewport.height;
                canvas.width = scaledViewport.width;

                await page.render({ canvasContext: context, viewport: scaledViewport }).promise;
            } catch (e: any) {
                console.error("Error rendering PDF thumbnail:", e);
                setError('Could not render PDF preview.');
            }
        };

        if (pageData) {
            renderPdf();
        }
    }, [pageData]);

    return (
        <div className="aspect-[210/297] w-full h-full object-contain bg-gray-100 flex items-center justify-center">
            {error ? (
                <span className="text-red-500 text-xs p-2">{error}</span>
            ) : (
                <canvas ref={canvasRef} />
            )}
        </div>
    );
};

const PdfPageManager: React.FC<PdfPageManagerProps> = ({ title, positionType, selectedPageIds, onUpdateSelectedPages }) => {
    const [libraryPages, setLibraryPages] = useState<PageLibraryItem[]>([]);
    const [selectedPages, setSelectedPages] = useState<PageLibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showLibrary, setShowLibrary] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    useEffect(() => {
        loadLibraryPages();
    }, [positionType]);

    useEffect(() => {
        loadSelectedPages();
    }, [selectedPageIds, libraryPages]);

    const loadLibraryPages = async (): Promise<PageLibraryItem[]> => {
        try {
            setLoading(true);
            const data = await apiService.getPageLibrary(positionType);
            setLibraryPages(data);
            return data;
        } catch (error) {
            console.error('Error loading page library:', error);
            return [];
        } finally {
            setLoading(false);
        }
    };

    const loadSelectedPages = async () => {
        if (selectedPageIds.length === 0) {
            setSelectedPages([]);
            return;
        }

        // Map selected IDs to library pages
        const pages = selectedPageIds
            .map(id => libraryPages.find(p => p.id === id))
            .filter((p): p is PageLibraryItem => p !== undefined);
        
        setSelectedPages(pages);
    };

    const handleTogglePageSelection = (pageId: string) => {
        if (selectedPageIds.includes(pageId)) {
            // Remove from selection
            onUpdateSelectedPages(selectedPageIds.filter(id => id !== pageId));
        } else {
            // Add to selection
            onUpdateSelectedPages([...selectedPageIds, pageId]);
        }
    };

    const handleRemoveFromSelection = (pageId: string) => {
        onUpdateSelectedPages(selectedPageIds.filter(id => id !== pageId));
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragEnter = (index: number) => {
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Required to allow drop
        e.stopPropagation();
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            const newOrder = [...selectedPageIds];
            const [removed] = newOrder.splice(draggedIndex, 1);
            newOrder.splice(dragOverIndex, 0, removed);
            onUpdateSelectedPages(newOrder);
        }
        
        // Always reset drag state
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="space-y-6" data-testid={`pdf-page-manager-${positionType}`}>
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4 border-b-2 border-gray-300 pb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {selectedPages.length > 0 
                                ? `${selectedPages.length} page${selectedPages.length !== 1 ? 's' : ''} will be included in PDF`
                                : 'No pages selected for PDF - select pages below'}
                        </p>
                    </div>
                    <button
                        onClick={() => setShowLibrary(!showLibrary)}
                        className="px-5 py-2.5 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-800 shadow-md transition-all"
                    >
                        {showLibrary ? 'Hide Library Manager' : 'Manage Library'}
                    </button>
                </div>

                {/* Selected Pages Summary - Always Visible at Top */}
                <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-semibold text-blue-900">
                            📄 Pages Included in PDF ({selectedPages.length})
                        </h3>
                        {selectedPages.length > 0 && (
                            <span className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-full">
                                Active
                            </span>
                        )}
                    </div>
                    {selectedPages.length > 0 ? (
                        <>
                            <p className="text-sm text-blue-800 mb-3">
                                These pages will appear in the generated PDF in the order shown below. Drag to reorder.
                            </p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {selectedPages.map((page, index) => (
                                    <div
                                        key={page.id}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragEnter={() => handleDragEnter(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDrop={handleDrop}
                                        onDragEnd={handleDragEnd}
                                        className={`relative group border-2 border-blue-500 rounded-md overflow-hidden shadow-md transition-opacity ${
                                            draggedIndex !== null ? 'cursor-grabbing' : 'cursor-grab'
                                        } ${draggedIndex === index ? 'opacity-40' : ''}`}
                                    >
                                        <PdfThumbnail pageData={page.page_data} />
                                        <div className="p-2 bg-blue-100">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-blue-900 bg-blue-200 px-2 py-0.5 rounded">
                                                    #{index + 1}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleRemoveFromSelection(page.id);
                                                    }}
                                                    className="p-1 bg-red-500 text-white rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label={`Remove ${page.name}`}
                                                    title="Remove from PDF"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                            <p className="text-xs font-medium text-blue-900 truncate mt-1" title={page.name}>
                                                {page.name}
                                            </p>
                                        </div>
                                        {dragOverIndex === index && draggedIndex !== index && (
                                            <div className="absolute inset-0 border-4 border-blue-700 border-dashed rounded-md pointer-events-none" aria-hidden="true" />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="text-center py-6 text-blue-700">
                            <p className="font-medium">No pages selected</p>
                            <p className="text-sm mt-1">Select pages from the library below to include them in the PDF.</p>
                        </div>
                    )}
                </div>

                {showLibrary && (
                    <div className="mb-6">
                        <PageLibraryManager
                            positionType={positionType}
                            onPageAdded={loadLibraryPages}
                            onPageUpdated={loadLibraryPages}
                            onPageDeleted={async () => {
                                const updatedPages = await loadLibraryPages();
                                // Remove deleted pages from selection using the freshly loaded pages
                                const remainingIds = selectedPageIds.filter(id => 
                                    updatedPages.some(p => p.id === id)
                                );
                                if (remainingIds.length !== selectedPageIds.length) {
                                    onUpdateSelectedPages(remainingIds);
                                }
                            }}
                        />
                    </div>
                )}

                {/* SELECT PAGES SECTION - ALWAYS VISIBLE */}
                <div 
                    id={`page-selection-${positionType}`}
                    className="mb-6 p-6 bg-gray-100 border-4 border-gray-400 rounded-xl shadow-xl" 
                    style={{
                        minHeight: '200px',
                        backgroundColor: '#f3f4f6',
                        border: '4px solid #9ca3af',
                        padding: '1.5rem'
                    }}
                >
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h3 className="text-2xl font-extrabold text-gray-900 mb-2" style={{fontSize: '1.5rem', fontWeight: '800'}}>
                                📚 SELECT PAGES FROM LIBRARY
                            </h3>
                            <p className="text-base font-semibold text-gray-700" style={{fontSize: '1rem', fontWeight: '600'}}>
                                👆 CLICK ON ANY PAGE BELOW TO ADD IT TO THE PDF. CLICK AGAIN TO REMOVE IT.
                            </p>
                        </div>
                        {selectedPages.length > 0 && (
                            <div className="px-4 py-2 bg-green-100 border-2 border-green-500 rounded-lg">
                                <span className="text-sm font-semibold text-green-800">
                                    {selectedPages.length} Selected
                                </span>
                            </div>
                        )}
                    </div>
                    {loading ? (
                        <div className="text-center py-8 text-gray-500">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3"></div>
                            <p className="font-medium">Loading library...</p>
                        </div>
                    ) : libraryPages.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                            {libraryPages.map((page) => {
                                const isSelected = selectedPageIds.includes(page.id);
                                return (
                                    <div
                                        key={page.id}
                                        onClick={() => handleTogglePageSelection(page.id)}
                                        className={`relative group border-2 rounded-lg overflow-hidden shadow-lg cursor-pointer transition-all transform hover:scale-105 ${
                                            isSelected 
                                                ? 'border-blue-600 bg-blue-50 ring-4 ring-blue-300' 
                                                : 'border-gray-300 hover:border-blue-400 hover:shadow-xl'
                                        }`}
                                        title={isSelected ? `Click to remove "${page.name}"` : `Click to add "${page.name}"`}
                                    >
                                        <PdfThumbnail pageData={page.page_data} />
                                        <div className={`p-2 ${isSelected ? 'bg-blue-100' : 'bg-white'}`}>
                                            <div className="flex items-center justify-between">
                                                <p className={`text-xs font-semibold truncate flex-1 ${isSelected ? 'text-blue-900' : 'text-gray-800'}`} title={page.name}>
                                                    {page.name}
                                                </p>
                                                {isSelected && (
                                                    <div className="ml-2 bg-blue-600 text-white rounded-full p-1 flex-shrink-0">
                                                        <CheckIcon />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {!isSelected && (
                                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-5 transition-all rounded-lg pointer-events-none" />
                                        )}
                                        {isSelected && (
                                            <div className="absolute top-2 right-2 bg-blue-600 text-white rounded-full p-1.5 shadow-lg">
                                                <CheckIcon />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg bg-white">
                            <p className="font-medium mb-2">No pages in library yet</p>
                            <p className="text-sm">Click "Manage Library" above to add pages to the library.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default PdfPageManager;
