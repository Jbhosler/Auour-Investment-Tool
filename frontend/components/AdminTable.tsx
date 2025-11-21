import React from 'react';
import { Strategy, Benchmark } from '../types';
import { EditIcon, TrashIcon } from './icons/Icons';

interface AdminTableProps {
    data: (Strategy | Benchmark)[];
    onEdit: (item: Strategy | Benchmark) => void;
    onDelete: (id: string) => void;
}

const AdminTable: React.FC<AdminTableProps> = ({ data, onEdit, onDelete }) => {
    
    return (
        <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="py-3 px-6">Name</th>
                        <th scope="col" className="py-3 px-6 text-right">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {data.length > 0 ? data.map((item, index) => (
                        <tr key={item.id} className={index % 2 === 0 ? 'bg-white border-b' : 'bg-gray-50 border-b'}>
                            <td className="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">{item.name}</td>
                            <td className="py-4 px-6 text-right space-x-4">
                                <button onClick={() => onEdit(item)} className="font-medium text-blue-600 hover:underline">
                                    <EditIcon />
                                </button>
                                <button onClick={() => onDelete(item.id)} className="font-medium text-red-600 hover:underline">
                                    <TrashIcon />
                                </button>
                            </td>
                        </tr>
                    )) : (
                        <tr className="bg-white border-b">
                            <td colSpan={2} className="py-4 px-6 text-center text-gray-400">No items found.</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default AdminTable;