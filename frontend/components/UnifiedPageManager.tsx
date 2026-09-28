import React, { useCallback, useEffect, useState } from 'react';
import PageLibraryManager from './PageLibraryManager';
import PagePlacementSection, { PageLibraryItem } from './PagePlacementSection';
import { apiService } from '../services/apiService';

interface UnifiedPageManagerProps {
    selectedBeforePageIds: string[];
    selectedAfterPageIds: string[];
    onUpdateSelectedBeforePages: (pageIds: string[]) => void;
    onUpdateSelectedAfterPages: (pageIds: string[]) => void;
}

const UnifiedPageManager: React.FC<UnifiedPageManagerProps> = ({
    selectedBeforePageIds,
    selectedAfterPageIds,
    onUpdateSelectedBeforePages,
    onUpdateSelectedAfterPages
}) => {
    const [libraryPages, setLibraryPages] = useState<PageLibraryItem[]>([]);

    const loadLibrary = useCallback(async () => {
        try {
            const data = await apiService.getPageLibrary();
            setLibraryPages(data);
        } catch (error) {
            console.error('Error loading page library:', error);
            setLibraryPages([]);
        }
    }, []);

    useEffect(() => {
        loadLibrary();
    }, [loadLibrary]);

    const handlePageDeleted = useCallback(async () => {
        const updated = await apiService.getPageLibrary();
        setLibraryPages(updated);
        // Remove deleted pages from both selections
        const remainingIds = new Set(updated.map(p => p.id));
        const beforeRemaining = selectedBeforePageIds.filter(id => remainingIds.has(id));
        const afterRemaining = selectedAfterPageIds.filter(id => remainingIds.has(id));
        if (beforeRemaining.length !== selectedBeforePageIds.length) {
            onUpdateSelectedBeforePages(beforeRemaining);
        }
        if (afterRemaining.length !== selectedAfterPageIds.length) {
            onUpdateSelectedAfterPages(afterRemaining);
        }
    }, [selectedBeforePageIds, selectedAfterPageIds, onUpdateSelectedBeforePages, onUpdateSelectedAfterPages]);

    return (
        <div className="space-y-8">
            {/* Single Static Page Library */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Static Page Library</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Add PDF pages to the library. Then assign them to the front or back of the analysis below.
                </p>
                <PageLibraryManager
                    onPageAdded={loadLibrary}
                    onPageUpdated={loadLibrary}
                    onPageDeleted={handlePageDeleted}
                />
            </div>

            {/* Front and Back placement sections - both use the same library */}
            <div className="space-y-6">
                <PagePlacementSection
                    title="Front of Analysis"
                    libraryPages={libraryPages}
                    selectedPageIds={selectedBeforePageIds}
                    onUpdateSelectedPages={onUpdateSelectedBeforePages}
                />
                <PagePlacementSection
                    title="Back of Analysis"
                    libraryPages={libraryPages}
                    selectedPageIds={selectedAfterPageIds}
                    onUpdateSelectedPages={onUpdateSelectedAfterPages}
                />
            </div>
        </div>
    );
};

export default UnifiedPageManager;
