
import React, { useState } from 'react';
import { Strategy, Benchmark, MonthlyReturn, AssetAllocation } from '../types';
import AdminTable from './AdminTable';
import AddEditModal from './AddEditModal';
import { PlusCircleIcon } from './icons/Icons';
import UnifiedPageManager from './UnifiedPageManager';
import FirmLogoManager from './FirmLogoManager';

interface AdminPanelProps {
    strategies: Strategy[];
    benchmarks: Benchmark[];
    onAddStrategy: (name: string, returns: MonthlyReturn[], assetAllocation: AssetAllocation) => void;
    onUpdateStrategy: (id: string, name: string, assetAllocation: AssetAllocation) => void;
    onDeleteStrategy: (id: string) => void;
    onAddBenchmark: (name: string, returns: MonthlyReturn[]) => void;
    onUpdateBenchmark: (id: string, name: string) => void;
    onDeleteBenchmark: (id: string) => void;
    selectedBeforePageIds: string[];
    selectedAfterPageIds: string[];
    onUpdateSelectedBeforePages: (pageIds: string[]) => void;
    onUpdateSelectedAfterPages: (pageIds: string[]) => void;
    firmLogo: string | null;
    secondaryLogo: string | null;
    onSetFirmLogo: (logo: string | null) => void;
    onSetSecondaryLogo: (logo: string | null) => void;
}

type ModalState = {
    isOpen: boolean;
    type: 'Strategy' | 'Benchmark' | null;
    itemToEdit: Strategy | Benchmark | null;
}

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const [modalState, setModalState] = useState<ModalState>({ isOpen: false, type: null, itemToEdit: null });

    const openModal = (type: 'Strategy' | 'Benchmark', itemToEdit: Strategy | Benchmark | null = null) => {
        setModalState({ isOpen: true, type, itemToEdit });
    };

    const closeModal = () => {
        setModalState({ isOpen: false, type: null, itemToEdit: null });
    };

    const handleSave = (data: { name: string; assetAllocation?: AssetAllocation; returns?: MonthlyReturn[] | null; }) => {
        const { type, itemToEdit } = modalState;

        if (type === 'Strategy' && data.assetAllocation) {
            if (itemToEdit) {
                props.onUpdateStrategy(itemToEdit.id, data.name, data.assetAllocation);
            } else if (data.returns) {
                props.onAddStrategy(data.name, data.returns, data.assetAllocation);
            }
        } else if (type === 'Benchmark') {
            if (itemToEdit) {
                props.onUpdateBenchmark(itemToEdit.id, data.name);
            } else if (data.returns) {
                props.onAddBenchmark(data.name, data.returns);
            }
        }
        closeModal();
    };

    return (
        <div className="space-y-12">
            {modalState.isOpen && modalState.type && (
                <AddEditModal
                    isOpen={modalState.isOpen}
                    onClose={closeModal}
                    onSave={handleSave}
                    itemToEdit={modalState.itemToEdit}
                    type={modalState.type}
                />
            )}
            
            <FirmLogoManager
                logo={props.firmLogo}
                secondaryLogo={props.secondaryLogo}
                onSetLogo={props.onSetFirmLogo}
                onSetSecondaryLogo={props.onSetSecondaryLogo}
            />

            <UnifiedPageManager
                selectedBeforePageIds={props.selectedBeforePageIds}
                selectedAfterPageIds={props.selectedAfterPageIds}
                onUpdateSelectedBeforePages={props.onUpdateSelectedBeforePages}
                onUpdateSelectedAfterPages={props.onUpdateSelectedAfterPages}
            />
            
            {/* Strategies Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">Manage Strategies</h2>
                    <button onClick={() => openModal('Strategy')} className="flex items-center space-x-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">
                        <PlusCircleIcon />
                        <span>Add Strategy</span>
                    </button>
                </div>
                <AdminTable
                    data={props.strategies}
                    onEdit={(item) => openModal('Strategy', item)}
                    onDelete={(id) => props.onDeleteStrategy(id)}
                />
            </div>

            {/* Benchmarks Section */}
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex justify-between items-center mb-4 border-b pb-2">
                    <h2 className="text-2xl font-bold text-gray-800">Manage Benchmarks</h2>
                    <button onClick={() => openModal('Benchmark')} className="flex items-center space-x-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700">
                        <PlusCircleIcon />
                        <span>Add Benchmark</span>
                    </button>
                </div>
                <AdminTable
                    data={props.benchmarks}
                    onEdit={(item) => openModal('Benchmark', item)}
                    onDelete={(id) => props.onDeleteBenchmark(id)}
                />
            </div>
        </div>
    );
};

export default AdminPanel;
