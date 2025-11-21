import React from 'react';
import { PlusCircleIcon, TrashIcon } from './icons/Icons';

interface FirmLogoManagerProps {
    logo: string | null;
    onSetLogo: (logo: string | null) => void;
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
};

const FirmLogoManager: React.FC<FirmLogoManagerProps> = ({ logo, onSetLogo }) => {
    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            try {
                if(file.size > 2 * 1024 * 1024) { // 2MB limit
                    alert("File size should not exceed 2MB.");
                    return;
                }
                const base64 = await fileToBase64(file);
                onSetLogo(base64);
            } catch (error) {
                console.error("Error converting file to base64", error);
                alert("Could not load image file.");
            }
        }
        event.target.value = ''; // Reset input
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4 border-b pb-2">Manage Firm Logo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Current Logo</h3>
                    <div className="w-full h-32 border-2 border-dashed border-gray-300 rounded-md flex items-center justify-center bg-gray-50">
                        {logo ? (
                            <img src={logo} alt="Firm Logo" className="max-h-full max-w-full object-contain" />
                        ) : (
                            <p className="text-gray-500">No logo uploaded</p>
                        )}
                    </div>
                </div>
                <div className="space-y-3">
                    <label className="flex items-center justify-center w-full space-x-2 bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-700 cursor-pointer">
                        <PlusCircleIcon />
                        <span>Upload New Logo</span>
                        <input
                            type="file"
                            className="hidden"
                            accept="image/png, image/jpeg, image/svg+xml"
                            onChange={handleFileChange}
                        />
                    </label>
                    {logo && (
                         <button 
                            onClick={() => onSetLogo(null)}
                            className="flex items-center justify-center w-full space-x-2 bg-red-600 text-white font-semibold py-2 px-4 rounded-lg hover:bg-red-700 cursor-pointer"
                        >
                            <TrashIcon />
                            <span>Remove Logo</span>
                        </button>
                    )}
                    <p className="text-xs text-gray-500 text-center">Recommended: PNG or SVG with transparent background. Max file size: 2MB.</p>
                </div>
            </div>
        </div>
    );
};

export default FirmLogoManager;