
import React from 'react';
import { Benchmark } from '../types';

interface BenchmarkSelectorProps {
    benchmarks: Benchmark[];
    selectedBenchmarkId: string;
    setSelectedBenchmarkId: React.Dispatch<React.SetStateAction<string>>;
}

const BenchmarkSelector: React.FC<BenchmarkSelectorProps> = ({ benchmarks, selectedBenchmarkId, setSelectedBenchmarkId }) => {
    return (
        <div className="space-y-2">
            <label htmlFor="benchmark-select" className="block text-sm font-medium text-gray-700">Comparison Benchmark</label>
            <select
                id="benchmark-select"
                value={selectedBenchmarkId}
                onChange={(e) => setSelectedBenchmarkId(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
                {benchmarks.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                ))}
            </select>
        </div>
    );
};

export default BenchmarkSelector;
