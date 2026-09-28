import React, { useEffect, useState } from 'react';
import { TrashIcon, CheckIcon } from './icons/Icons';
import PdfThumbnail from './PdfThumbnail';

export interface PageLibraryItem {
    id: string;
    name: string;
    page_data: string;
    position_type: 'before' | 'after';
}

interface PagePlacementSectionProps {
    title: string;
    libraryPages: PageLibraryItem[];
    selectedPageIds: string[];
    onUpdateSelectedPages: (pageIds: string[]) => void;
}

const PagePlacementSection: React.FC<PagePlacementSectionProps> = ({
    title,
    libraryPages,
    selectedPageIds,
    onUpdateSelectedPages
}) => {
    const [selectedPages, setSelectedPages] = useState<PageLibraryItem[]>([]);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    useEffect(() => {
        if (selectedPageIds.length === 0) {
            setSelectedPages([]);
            return;
        }
        const pages = selectedPageIds
            .map(id => libraryPages.find(p => p.id === id))
            .filter((p): p is PageLibraryItem => p !== undefined);
        setSelectedPages(pages);
    }, [selectedPageIds, libraryPages]);

    const handleTogglePageSelection = (pageId: string) => {
        if (selectedPageIds.includes(pageId)) {
            onUpdateSelectedPages(selectedPageIds.filter(id => id !== pageId));
        } else {
            onUpdateSelectedPages([...selectedPageIds, pageId]);
        }
    };

    const handleRemoveFromSelection = (pageId: string) => {
        onUpdateSelectedPages(selectedPageIds.filter(id => id !== pageId));
    };

    const handleDragStart = (index: number) => setDraggedIndex(index);
    const handleDragEnter = (index: number) => {
        if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
    };
    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        e.stopPropagation();
        if (draggedIndex !== null && draggedIndex !== index) setDragOverIndex(index);
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
        setDraggedIndex(null);
        setDragOverIndex(null);
    };
    const handleDragEnd = () => {
        setDraggedIndex(null);
        setDragOverIndex(null);
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="mb-4 border-b-2 border-gray-300 pb-4">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <p className="text-sm text-gray-600 mt-1">
                    {selectedPages.length > 0
                        ? `${selectedPages.length} page${selectedPages.length !== 1 ? 's' : ''} will be included in PDF`
                        : 'No pages selected - select from the library above'}
                </p>
            </div>

            {/* Selected Pages */}
            <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                    Pages Included ({selectedPages.length})
                </h3>
                {selectedPages.length > 0 ? (
                    <>
                        <p className="text-sm text-blue-800 mb-3">
                            These pages will appear in the generated PDF. Drag to reorder.
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
                    <p className="text-sm text-blue-700">Select pages from the library above to add them here.</p>
                )}
            </div>

            {/* Select from library */}
            <div className="p-4 bg-gray-100 border-2 border-gray-300 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                    Select from library — click to add to {title}
                </h3>
                {libraryPages.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {libraryPages.map((page) => {
                            const isSelected = selectedPageIds.includes(page.id);
                            return (
                                <div
                                    key={page.id}
                                    onClick={() => handleTogglePageSelection(page.id)}
                                    className={`relative group border-2 rounded-lg overflow-hidden shadow cursor-pointer transition-all hover:scale-[1.02] ${
                                        isSelected
                                            ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-300'
                                            : 'border-gray-300 hover:border-blue-400'
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
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-sm text-gray-500">No pages in library. Add pages above first.</p>
                )}
            </div>
        </div>
    );
};

export default PagePlacementSection;
