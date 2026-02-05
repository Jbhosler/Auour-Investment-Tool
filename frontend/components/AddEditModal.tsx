import React, { useState, useEffect } from 'react';
import { Strategy, Benchmark, MonthlyReturn, AssetAllocation, SecondaryPortfolioTicker } from '../types';
import { parseReturnsCSV } from '../utils/csvParser';
import { apiService } from '../services/apiService';
import { CloseIcon } from './icons/Icons';

/** Returns a 10-year date range in YYYY-MM for fetching portfolio returns. */
function getDefaultReturnsDateRange(): { startDate: string; endDate: string } {
    const end = new Date();
    end.setMonth(end.getMonth() - 1);
    const endStr = end.toISOString().slice(0, 7);
    const start = new Date();
    start.setMonth(start.getMonth() - 120);
    const startStr = start.toISOString().slice(0, 7);
    return { startDate: startStr, endDate: endStr };
}

interface AddEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { name: string; assetAllocation?: AssetAllocation; returns?: MonthlyReturn[] | null; }) => void;
    itemToEdit: Strategy | Benchmark | null;
    type: 'Strategy' | 'Benchmark';
}

type StrategyInputMode = 'csv' | 'tickers';

const AddEditModal: React.FC<AddEditModalProps> = ({ isOpen, onClose, onSave, itemToEdit, type }) => {
    const [name, setName] = useState('');
    const [equity, setEquity] = useState(100);
    const [fixedIncome, setFixedIncome] = useState(0);
    const [alternatives, setAlternatives] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [error, setError] = useState('');
    const [isParsing, setIsParsing] = useState(false);
    const [strategyInputMode, setStrategyInputMode] = useState<StrategyInputMode>('csv');
    const [tickers, setTickers] = useState<SecondaryPortfolioTicker[]>([]);
    const [isFetchingTickers, setIsFetchingTickers] = useState(false);

    const isEditMode = !!itemToEdit;
    const totalAllocation = equity + fixedIncome + alternatives;
    const tickerTotalWeight = tickers.reduce((sum, t) => sum + (t.weight ?? 0), 0);
    const showTickerOption = type === 'Strategy' && !isEditMode;

    useEffect(() => {
        if (itemToEdit) {
            setName(itemToEdit.name);
            if (type === 'Strategy' && (itemToEdit as Strategy).assetAllocation) {
                const { equity, fixedIncome, alternatives } = (itemToEdit as Strategy).assetAllocation;
                setEquity(equity);
                setFixedIncome(fixedIncome);
                setAlternatives(alternatives);
            }
        } else {
            setName('');
            setEquity(100);
            setFixedIncome(0);
            setAlternatives(0);
            if (showTickerOption) {
                setStrategyInputMode('csv');
                setTickers([]);
            }
        }
        setFile(null);
        setError('');
    }, [itemToEdit, isOpen, type, showTickerOption]);

    if (!isOpen) return null;

    const handleNumericChange = (setter: React.Dispatch<React.SetStateAction<number>>, value: string) => {
        const num = parseInt(value, 10);
        setter(isNaN(num) ? 0 : Math.max(0, Math.min(100, num)));
    };

    const handleAddTicker = () => {
        setTickers([...tickers, { ticker: '', weight: 0 }]);
    };

    const handleRemoveTicker = (index: number) => {
        setTickers(tickers.filter((_, i) => i !== index));
    };

    const handleTickerChange = (index: number, field: 'ticker' | 'weight', value: string | number) => {
        const updated = [...tickers];
        updated[index] = { ...updated[index], [field]: value };
        setTickers(updated);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        const trimmedName = name.trim();

        if (!trimmedName) {
            setError('Name is required.');
            return;
        }

        const dataToSave: { name: string; assetAllocation?: AssetAllocation; returns?: MonthlyReturn[] | null; } = { name: trimmedName };
        
        if (type === 'Strategy') {
             if (totalAllocation !== 100) {
                setError('Asset allocation percentages must sum to 100.');
                return;
            }
            dataToSave.assetAllocation = { equity, fixedIncome, alternatives };
        }

        if (isEditMode) {
            onSave(dataToSave);
        } else {
            if (showTickerOption && strategyInputMode === 'tickers') {
                const validTickers = tickers.filter(t => (t.ticker || '').trim()).map(t => ({ ticker: (t.ticker || '').trim().toUpperCase(), weight: t.weight ?? 0 }));
                if (validTickers.length === 0) {
                    setError('Add at least one mutual fund ticker.');
                    return;
                }
                const validWeightSum = validTickers.reduce((s, t) => s + t.weight, 0);
                if (Math.abs(validWeightSum - 100) > 0.01) {
                    setError(`Ticker weights must total 100% (current: ${validWeightSum.toFixed(2)}%).`);
                    return;
                }
                const normalized = validTickers;
                setIsFetchingTickers(true);
                try {
                    const { startDate, endDate } = getDefaultReturnsDateRange();
                    const res = await apiService.fetchSecondaryPortfolioReturns(normalized, { startDate, endDate });
                    const returns: MonthlyReturn[] = res.returns || [];
                    if (returns.length === 0) {
                        setError('No returns data returned for the given tickers. Check symbols and try again.');
                        return;
                    }
                    dataToSave.returns = returns;
                    onSave(dataToSave);
                } catch (err: any) {
                    setError(err?.message || 'Failed to fetch returns from tickers. Check ticker symbols and try again.');
                } finally {
                    setIsFetchingTickers(false);
                }
            } else {
                if (!file) {
                    setError('Upload a CSV file or use "Create from tickers" to enter mutual fund tickers.');
                    return;
                }
                setIsParsing(true);
                try {
                    const returns = await parseReturnsCSV(file, trimmedName);
                    dataToSave.returns = returns;
                    onSave(dataToSave);
                } catch (err: any) {
                    setError(err.message);
                } finally {
                    setIsParsing(false);
                }
            }
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800">{isEditMode ? 'Edit' : 'Add'} {type}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <CloseIcon />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">{type} Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            required
                        />
                    </div>

                    {type === 'Strategy' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700">Asset Allocation</label>
                            <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-3">
                                <div className="flex items-center space-x-2">
                                    <label htmlFor="equity" className="w-28 text-sm text-gray-600">Equity</label>
                                    <input type="number" id="equity" value={equity} onChange={e => handleNumericChange(setEquity, e.target.value)} className="block w-full text-center py-1 border-gray-300 rounded-md shadow-sm" min="0" max="100" />
                                    <span className="text-gray-500">%</span>
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <label htmlFor="fixedIncome" className="w-28 text-sm text-gray-600">Fixed Income</label>
                                    <input type="number" id="fixedIncome" value={fixedIncome} onChange={e => handleNumericChange(setFixedIncome, e.target.value)} className="block w-full text-center py-1 border-gray-300 rounded-md shadow-sm" min="0" max="100" />
                                     <span className="text-gray-500">%</span>
                                </div>
                                 <div className="flex items-center space-x-2">
                                    <label htmlFor="alternatives" className="w-28 text-sm text-gray-600">Alternatives</label>
                                    <input type="number" id="alternatives" value={alternatives} onChange={e => handleNumericChange(setAlternatives, e.target.value)} className="block w-full text-center py-1 border-gray-300 rounded-md shadow-sm" min="0" max="100" />
                                    <span className="text-gray-500">%</span>
                                </div>
                                <div className={`text-right font-bold text-sm pr-1 ${totalAllocation === 100 ? 'text-green-600' : 'text-red-600'}`}>
                                    Total: {totalAllocation}%
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {!isEditMode && (
                        <>
                            {showTickerOption && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">How to add returns</label>
                                    <div className="flex gap-4">
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="strategyInputMode"
                                                checked={strategyInputMode === 'csv'}
                                                onChange={() => setStrategyInputMode('csv')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">Upload CSV</span>
                                        </label>
                                        <label className="inline-flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="radio"
                                                name="strategyInputMode"
                                                checked={strategyInputMode === 'tickers'}
                                                onChange={() => setStrategyInputMode('tickers')}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <span className="text-sm">Enter mutual fund tickers</span>
                                        </label>
                                    </div>
                                </div>
                            )}
                            {(!showTickerOption || strategyInputMode === 'csv') && (
                                <div>
                                    <label htmlFor="file" className="block text-sm font-medium text-gray-700">Monthly Returns (CSV)</label>
                                    <input
                                        type="file"
                                        id="file"
                                        onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                        className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        accept=".csv"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">CSV must have 'date' (mm/01/yyyy) and a column header that matches this item's name. Returns should be in decimal format (e.g., 0.021 for 2.1%).</p>
                                </div>
                            )}
                            {showTickerOption && strategyInputMode === 'tickers' && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Mutual fund tickers & weights</label>
                                        <button
                                            type="button"
                                            onClick={handleAddTicker}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                                        >
                                            + Add Ticker
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mb-2">Enter ticker symbols and allocation weights (must total 100%). Returns are fetched for the last 10 years.</p>
                                    {tickers.length === 0 && (
                                        <p className="text-sm text-gray-500 italic py-2">Click "Add Ticker" to add mutual funds.</p>
                                    )}
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                        {tickers.map((row, index) => (
                                            <div key={index} className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={row.ticker}
                                                    onChange={(e) => handleTickerChange(index, 'ticker', e.target.value.toUpperCase())}
                                                    placeholder="Ticker"
                                                    className="flex-1 border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm focus:ring-blue-500 focus:border-blue-500"
                                                />
                                                <div className="w-20 flex items-center">
                                                    <input
                                                        type="number"
                                                        value={row.weight ?? ''}
                                                        onChange={(e) => handleTickerChange(index, 'weight', parseFloat(e.target.value) || 0)}
                                                        placeholder="%"
                                                        min={0}
                                                        max={100}
                                                        step={0.01}
                                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-1.5 px-2 text-sm pr-6 focus:ring-blue-500 focus:border-blue-500"
                                                    />
                                                    <span className="text-gray-500 text-xs -ml-6">%</span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveTicker(index)}
                                                    className="p-1.5 text-red-600 hover:text-red-800"
                                                    aria-label="Remove ticker"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    {tickers.length > 0 && (
                                        <div className={`mt-2 text-sm font-medium ${Math.abs(tickerTotalWeight - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                                            Total: {tickerTotalWeight.toFixed(2)}%
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {error && <p className="text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}
                    
                    <div className="flex justify-end space-x-4">
                        <button type="button" onClick={onClose} className="py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </button>
                        <button type="submit" disabled={isParsing || isFetchingTickers} className="py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400">
                            {isFetchingTickers ? 'Fetching returns...' : isParsing ? 'Parsing...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddEditModal;