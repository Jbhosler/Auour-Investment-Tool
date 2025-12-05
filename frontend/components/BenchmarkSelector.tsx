
import React, { useMemo } from 'react';
import { Benchmark, Allocation } from '../types';
import { PlusCircleIcon, TrashIcon } from './icons/Icons';

interface BenchmarkSelectorProps {
    benchmarks: Benchmark[];
    allocations: Allocation[];
    setAllocations: React.Dispatch<React.SetStateAction<Allocation[]>>;
}

const BenchmarkSelector: React.FC<BenchmarkSelectorProps> = ({ benchmarks, allocations, setAllocations }) => {

    const totalAllocation = useMemo(() =>
        allocations.reduce((sum, alloc) => sum + (alloc.weight || 0), 0),
    [allocations]);

    const handleBenchmarkChange = (index: number, newBenchmarkId: string) => {
        if (allocations.some(a => a.strategyId === newBenchmarkId)) {
            alert("This benchmark is already used in the benchmark portfolio.");
            return;
        }
        const newAllocations = [...allocations];
        newAllocations[index].strategyId = newBenchmarkId;
        setAllocations(newAllocations);
    };

    const handleWeightChange = (index: number, weight: number) => {
        const newWeight = isNaN(weight) ? 0 : Math.max(0, Math.min(100, weight));
        const newAllocations = [...allocations];
        newAllocations[index].weight = newWeight;
        setAllocations(newAllocations);
    };

    const addBenchmarkRow = () => {
        const usedBenchmarkIds = allocations.map(a => a.strategyId);
        const availableBenchmark = benchmarks.find(b => !usedBenchmarkIds.includes(b.id));
        if (availableBenchmark) {
            setAllocations([...allocations, { strategyId: availableBenchmark.id, weight: 0 }]);
        }
    };

    const removeBenchmarkRow = (index: number) => {
        const newAllocations = allocations.filter((_, i) => i !== index);
        setAllocations(newAllocations);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Benchmark Allocation</label>
                <div className="space-y-3">
                    {allocations.map((alloc, index) => (
                        <div key={index} className="flex items-center space-x-2">
                            <select
                                value={alloc.strategyId}
                                onChange={e => handleBenchmarkChange(index, e.target.value)}
                                className="block w-2/3 py-2 border-gray-300 rounded-md shadow-sm"
                            >
                                {benchmarks.map(b => (
                                    <option key={b.id} value={b.id} disabled={allocations.some(a => a.strategyId === b.id && a.strategyId !== alloc.strategyId)}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                            <input
                                type="number"
                                value={alloc.weight}
                                onChange={e => handleWeightChange(index, parseInt(e.target.value, 10))}
                                className="block w-1/3 text-center py-2 border-gray-300 rounded-md shadow-sm"
                                min="0"
                                max="100"
                            />
                            <span className="text-gray-500">%</span>
                            <button onClick={() => removeBenchmarkRow(index)} className="text-red-500 hover:text-red-700">
                                <TrashIcon />
                            </button>
                        </div>
                    ))}
                </div>
                 <div className="mt-4">
                    <button
                        onClick={addBenchmarkRow}
                        disabled={allocations.length >= benchmarks.length}
                        className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm disabled:text-gray-400"
                    >
                        <PlusCircleIcon />
                        <span>Add Benchmark</span>
                    </button>
                </div>
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-center">
                <span className={`font-bold text-lg ${totalAllocation === 100 ? 'text-green-600' : 'text-red-600'}`}>
                    Total Allocation: {totalAllocation}%
                </span>
            </div>
        </div>
    );
};

export default BenchmarkSelector;
