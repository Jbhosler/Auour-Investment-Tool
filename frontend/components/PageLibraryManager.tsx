import React, { useEffect, useState } from 'react';
import { PlusCircleIcon, TrashIcon, EditIcon } from './icons/Icons';
import { apiService } from '../services/apiService';
import PdfThumbnail from './PdfThumbnail';

interface PageLibraryItem {
    id: string;
    name: string;
    page_data: string;
    position_type: 'before' | 'after';
    created_at?: string;
    updated_at?: string;
}

interface PageLibraryManagerProps {
    onPageAdded?: () => void;
    onPageUpdated?: () => void;
    onPageDeleted?: () => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const PageLibraryManager: React.FC<PageLibraryManagerProps> = ({ onPageAdded, onPageUpdated, onPageDeleted }) => {
    const [pages, setPages] = useState<PageLibraryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState('');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newPageName, setNewPageName] = useState('');
    const [newPageFile, setNewPageFile] = useState<File | null>(null);

    useEffect(() => {
        loadPages();
    }, []);

    const loadPages = async () => {
        try {
            setLoading(true);
            // Load all pages regardless of position_type for unified library
            const data = await apiService.getPageLibrary();
            setPages(data);
        } catch (error) {
            console.error('Error loading page library:', error);
            alert('Failed to load page library');
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setNewPageFile(file);
        }
        event.target.value = '';
    };

    const handleAddPage = async () => {
        if (!newPageName.trim() || !newPageFile) {
            alert('Please provide a name and select a PDF file');
            return;
        }

        try {
            const base64 = await fileToBase64(newPageFile);
            // Use 'before' as default position_type (it's not used in unified library but required by API)
            await apiService.createPageInLibrary({
                name: newPageName.trim(),
                page_data: base64,
                position_type: 'before' // Default; placement is chosen when assigning to front/back
            });
            
            setNewPageName('');
            setNewPageFile(null);
            setShowAddModal(false);
            await loadPages();
            if (onPageAdded) onPageAdded();
        } catch (error) {
            console.error('Error adding page:', error);
            alert('Failed to add page to library');
        }
    };

    const handleStartEdit = (page: PageLibraryItem) => {
        setEditingId(page.id);
        setEditingName(page.name);
    };

    const handleSaveEdit = async (id: string) => {
        if (!editingName.trim()) {
            alert('Page name cannot be empty');
            return;
        }

        try {
            await apiService.updatePageInLibrary(id, { name: editingName.trim() });
            setEditingId(null);
            setEditingName('');
            await loadPages();
            if (onPageUpdated) onPageUpdated();
        } catch (error) {
            console.error('Error updating page:', error);
            alert('Failed to update page');
        }
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditingName('');
    };

    const handleDeletePage = async (id: string) => {
        if (!confirm('Are you sure you want to delete this page from the library?')) {
            return;
        }

        try {
            await apiService.deletePageFromLibrary(id);
            await loadPages();
            if (onPageDeleted) onPageDeleted();
        } catch (error) {
            console.error('Error deleting page:', error);
            alert('Failed to delete page from library');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4 border-b pb-2">
                <button
                    onClick={() => setShowAddModal(true)}
                    className="flex items-center space-x-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700"
                >
                    <PlusCircleIcon />
                    <span>Add Page</span>
                </button>
            </div>

            {showAddModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">Add Page to Library</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Page Name
                                </label>
                                <input
                                    type="text"
                                    value={newPageName}
                                    onChange={(e) => setNewPageName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Enter page name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    PDF File
                                </label>
                                <input
                                    type="file"
                                    accept="application/pdf"
                                    onChange={handleFileChange}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                {newPageFile && (
                                    <p className="mt-2 text-sm text-gray-600">{newPageFile.name}</p>
                                )}
                            </div>
                        </div>
                        <div className="flex justify-end space-x-3 mt-6">
                            <button
                                onClick={() => {
                                    setShowAddModal(false);
                                    setNewPageName('');
                                    setNewPageFile(null);
                                }}
                                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleAddPage}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                            >
                                Add Page
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-8 text-gray-500">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <p>Loading pages...</p>
                </div>
            ) : pages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {pages.map((page) => (
                        <div
                            key={page.id}
                            className="relative group border rounded-md overflow-hidden shadow"
                        >
                            <PdfThumbnail pageData={page.page_data} />
                            <div className="p-2 bg-white">
                                {editingId === page.id ? (
                                    <div className="space-y-2">
                                        <input
                                            type="text"
                                            value={editingName}
                                            onChange={(e) => setEditingName(e.target.value)}
                                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter') {
                                                    handleSaveEdit(page.id);
                                                } else if (e.key === 'Escape') {
                                                    handleCancelEdit();
                                                }
                                            }}
                                        />
                                        <div className="flex space-x-1">
                                            <button
                                                onClick={() => handleSaveEdit(page.id)}
                                                className="flex-1 px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="flex-1 px-2 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-xs font-medium text-gray-800 truncate" title={page.name}>
                                            {page.name}
                                        </p>
                                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center">
                                            <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleStartEdit(page)}
                                                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700"
                                                    aria-label="Edit page name"
                                                    title="Edit name"
                                                >
                                                    <EditIcon />
                                                </button>
                                                <button
                                                    onClick={() => handleDeletePage(page.id)}
                                                    className="p-2 bg-red-600 text-white rounded-full hover:bg-red-700"
                                                    aria-label="Delete page"
                                                    title="Delete from library"
                                                >
                                                    <TrashIcon />
                                                </button>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-300 rounded-lg">
                    <p>No pages in library. Add PDF files to create a library of reusable pages.</p>
                </div>
            )}
        </div>
    );
};

export default PageLibraryManager;
