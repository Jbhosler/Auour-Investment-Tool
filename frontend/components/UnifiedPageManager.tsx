import React from 'react';
import PdfPageManager from './PdfPageManager';

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
    return (
        <div className="space-y-6">
            <PdfPageManager
                title="Pages Before Report"
                positionType="before"
                selectedPageIds={selectedBeforePageIds}
                onUpdateSelectedPages={onUpdateSelectedBeforePages}
            />
            
            <PdfPageManager
                title="Pages After Report"
                positionType="after"
                selectedPageIds={selectedAfterPageIds}
                onUpdateSelectedPages={onUpdateSelectedAfterPages}
            />
        </div>
    );
};

export default UnifiedPageManager;
