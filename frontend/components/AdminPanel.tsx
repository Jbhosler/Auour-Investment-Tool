
import React, { useState } from 'react';
import { Strategy, Benchmark, MonthlyReturn, AssetAllocation } from '../types';
import AdminTable from './AdminTable';
import AddEditModal from './AddEditModal';
import { PlusCircleIcon } from './icons/Icons';
import PdfPageManager from './PdfPageManager';
import FirmLogoManager from './FirmLogoManager';
import DefaultDataExporter from './DefaultDataExporter';

interface AdminPanelProps {
    strategies: Strategy[];
    benchmarks: Benchmark[];
    onAddStrategy: (name: string, returns: MonthlyReturn[], assetAllocation: AssetAllocation) => void;
    onUpdateStrategy: (id: string, name: string, assetAllocation: AssetAllocation) => void;
    onDeleteStrategy: (id: string) => void;
    onAddBenchmark: (name: string, returns: MonthlyReturn[]) => void;
    onUpdateBenchmark: (id: string, name: string) => void;
    onDeleteBenchmark: (id: string) => void;
    beforeOutputPages: string[];
    pagesAfterOutput: string[];
    onAddBeforeOutputPage: (pageData: string) => void;
    onDeleteBeforeOutputPage: (index: number) => void;
    onReorderBeforeOutputPage: (startIndex: number, endIndex: number) => void;
    onAddPageAfterOutput: (pageData: string) => void;
    onDeletePageAfterOutput: (index: number) => void;
    onReorderPageAfterOutput: (startIndex: number, endIndex: number) => void;
    firmLogo: string | null;
    onSetFirmLogo: (logo: string | null) => void;
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
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Set as Default Configuration</h2>
                <p className="text-sm text-gray-600 mb-4">
                    Make the current set of strategies and benchmarks the new default for the entire application.
                </p>
                <DefaultDataExporter strategies={props.strategies} benchmarks={props.benchmarks} />
                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-md">
                    <h4 className="font-semibold text-gray-700">How to use:</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-600 mt-2 space-y-1">
                        <li>Customize strategies and benchmarks using the tools below.</li>
                        <li>Click "Generate New Default Data File" and copy the generated code.</li>
                        <li>Open the file <code className="bg-gray-200 text-red-600 px-1 rounded">data/mockData.ts</code> in your project.</li>
                        <li>Replace the entire content of that file with the code you copied.</li>
                        <li>Your new configuration is now the permanent default for the application.</li>
                    </ol>
                </div>
            </div>


            <FirmLogoManager
                logo={props.firmLogo}
                onSetLogo={props.onSetFirmLogo}
            />

            <PdfPageManager
                title="Manage Before Output Pages"
                pages={props.beforeOutputPages}
                onAddPage={props.onAddBeforeOutputPage}
                onDeletePage={props.onDeleteBeforeOutputPage}
                onReorderPage={props.onReorderBeforeOutputPage}
            />

            <PdfPageManager
                title="Manage Pages After Output"
                pages={props.pagesAfterOutput}
                onAddPage={props.onAddPageAfterOutput}
                onDeletePage={props.onDeletePageAfterOutput}
                onReorderPage={props.onReorderPageAfterOutput}
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
