import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';
import { PlusCircleIcon, TrashIcon } from './icons/Icons';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

interface PdfPageManagerProps {
    title: string;
    pages: string[];
    onAddPage: (pageData: string) => void;
    onDeletePage: (index: number) => void;
    onReorderPage: (startIndex: number, endIndex: number) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const PdfThumbnail: React.FC<{ pageData: string }> = ({ pageData }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const renderPdf = async () => {
            try {
                const pdfSrc = { data: atob(pageData.split(',')[1]) };
                const pdf = await pdfjsLib.getDocument(pdfSrc).promise;
                const page = await pdf.getPage(1); // Render first page only
                
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


const PdfPageManager: React.FC<PdfPageManagerProps> = ({ title, pages, onAddPage, onDeletePage, onReorderPage }) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                const base64 = await fileToBase64(file);
                onAddPage(base64);
            } catch (error) {
                console.error("Error converting file to base64", error);
                alert("Could not load PDF file.");
            }
        }
        event.target.value = '';
    };
    
    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragEnter = (index: number) => {
        if (draggedIndex !== null && draggedIndex !== index) {
            setDragOverIndex(index);
        }
    };

    const handleDrop = () => {
        if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
            onReorderPage(draggedIndex, dragOverIndex);
        }
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };


    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <label className="flex items-center space-x-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 cursor-pointer">
                    <PlusCircleIcon />
                    <span>Add Page (PDF)</span>
                    <input
                        type="file"
                        className="hidden"
                        accept="application/pdf"
                        onChange={handleFileChange}
                    />
                </label>
            </div>
            
            {pages.length > 0 ? (
                <>
                <p className="text-sm text-gray-500 mb-4">You can drag and drop pages to reorder them.</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page, index) => (
                        <div
                            key={index}
                            draggable
                            onDragStart={() => handleDragStart(index)}
                            onDragEnter={() => handleDragEnter(index)}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={handleDrop}
                            onDragEnd={handleDragEnd}
                            className={`relative group border rounded-md overflow-hidden shadow transition-opacity ${
                                draggedIndex !== null ? 'cursor-grabbing' : 'cursor-grab'
                            } ${draggedIndex === index ? 'opacity-40' : ''}`}
                        >
                            <PdfThumbnail pageData={page} />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                <button
                                    onClick={() => onDeletePage(index)}
                                    className="p-2 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                    aria-label={`Delete page ${index + 1}`}
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                            {dragOverIndex === index && draggedIndex !== index && (
                                <div className="absolute inset-0 border-4 border-blue-500 border-dashed rounded-md pointer-events-none" aria-hidden="true" />
                            )}
                        </div>
                    ))}
                </div>
                </>
            ) : (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p>No pages uploaded. Add PDF files to be included in the report.</p>
                </div>
            )}
        </div>
    );
};

export default PdfPageManager;
