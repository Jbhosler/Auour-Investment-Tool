import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

/**
 * Safely extracts base64 data from page_data string.
 * Handles both data URL format (data:application/pdf;base64,<data>) and pure base64 format.
 */
export const extractBase64Data = (pageData: string): string => {
    if (!pageData || typeof pageData !== 'string') {
        throw new Error('pageData is empty, undefined, or not a string');
    }
    const trimmed = pageData.trim();
    if (!trimmed) {
        throw new Error('pageData is empty after trimming');
    }
    if (trimmed.includes(',')) {
        const parts = trimmed.split(',');
        if (parts.length >= 2 && parts[1] && parts[1].trim()) {
            return parts[1].trim();
        }
        throw new Error('Invalid data URL format: missing base64 data after comma');
    }
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
            } catch (e: unknown) {
                console.error('Error rendering PDF thumbnail:', e);
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

export default PdfThumbnail;
