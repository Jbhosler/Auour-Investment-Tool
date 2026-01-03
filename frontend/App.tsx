
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Strategy, Benchmark, ReportData, Allocation, PerformanceMetrics, MonthlyReturn, AssetAllocation, Account } from './types';
import { blendPortfolios, calculateMetrics } from './services/performanceCalculator';
import { apiService } from './services/apiService';
import { useApiState, useSettingsState } from './hooks/useApiState';
import StrategySelector from './components/StrategySelector';
import BenchmarkSelector from './components/BenchmarkSelector';
import ReportOutput from './components/ReportOutput';
import { AiSummary } from './components/AiSummary';
import AdminPanel from './components/AdminPanel';
import AllocationCharts from './components/AllocationCharts';
import ProposalDetailsForm from './components/ProposalDetailsForm';
import AccountSelector from './components/AccountSelector';
import HouseholdSummary from './components/HouseholdSummary';

const App: React.FC = () => {
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [isHouseholdMode, setIsHouseholdMode] = useState(false);
    const [householdView, setHouseholdView] = useState<'account' | 'summary'>('account');
    
    // Use API state instead of localStorage
    const [strategies, setStrategies, strategiesState] = useApiState('strategies', []);
    const [benchmarks, setBenchmarks, benchmarksState] = useApiState('benchmarks', []);
    const [settings, updateSettings, settingsState] = useSettingsState();

    // Household and account management
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

    // Shared household-level data
    const [adviserName, setAdviserName] = useState<string>('');
    const [clientName, setClientName] = useState<string>('');

    // Helper to get current account
    const currentAccount = useMemo(() => {
        if (!selectedAccountId) return null;
        return accounts.find(acc => acc.id === selectedAccountId) || null;
    }, [accounts, selectedAccountId]);

    // Track if we've initialized accounts to prevent loops
    const accountsInitialized = useRef(false);
    
    // Initialize with a default account if none exist
    useEffect(() => {
        if (!accountsInitialized.current && accounts.length === 0) {
            accountsInitialized.current = true;
            const defaultAccount: Account = {
                id: `account-${Date.now()}`,
                accountName: 'Account 1',
                portfolioAllocations: [],
                benchmarkAllocations: [],
                selectedBenchmarkId: benchmarks.length > 0 ? benchmarks[0].id : '',
                reportData: null,
                aiSummary: '',
                investmentAmount: '',
                clientAge: '',
                annualDistribution: '',
                riskTolerance: '',
                adviserFee: ''
            };
            setAccounts([defaultAccount]);
            setSelectedAccountId(defaultAccount.id);
        } else if (!selectedAccountId && accounts.length > 0) {
            setSelectedAccountId(accounts[0].id);
        }
    }, [accounts.length, selectedAccountId, benchmarks.length]);

    // Computed values for current account
    const totalAllocation = useMemo(() => {
        if (!currentAccount) return 0;
        return currentAccount.portfolioAllocations.reduce((sum, alloc) => sum + (alloc.weight || 0), 0);
    }, [currentAccount]);

    const totalBenchmarkAllocation = useMemo(() => {
        if (!currentAccount) return 0;
        return currentAccount.benchmarkAllocations.reduce((sum, alloc) => sum + (alloc.weight || 0), 0);
    }, [currentAccount]);

    const benchmarkMetricsMap = useMemo(() => {
        const map = new Map<string, PerformanceMetrics>();
        benchmarks.forEach(b => {
            map.set(b.id, calculateMetrics(b.returns));
        });
        return map;
    }, [benchmarks]);
    
    // Helper function to update an account
    const updateAccount = useCallback((accountId: string, updates: Partial<Account>) => {
        setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, ...updates } : acc));
    }, []);

    // Track last processed state to prevent infinite loops
    const lastProcessedState = useRef<{
        accountId: string | null;
        portfolioAllocations: string;
        totalAllocation: number;
        strategiesLength: number;
        benchmarksLength: number;
    }>({
        accountId: null,
        portfolioAllocations: '',
        totalAllocation: 0,
        strategiesLength: 0,
        benchmarksLength: 0
    });

    // Auto-select best-fit benchmark for current account
    useEffect(() => {
        if (!currentAccount) {
            if (lastProcessedState.current.accountId !== null) {
                lastProcessedState.current = {
                    accountId: null,
                    portfolioAllocations: '',
                    totalAllocation: 0,
                    strategiesLength: strategies.length,
                    benchmarksLength: benchmarks.length
                };
            }
            return;
        }

        const portfolioAllocationsKey = JSON.stringify(currentAccount.portfolioAllocations);
        const stateKey = {
            accountId: currentAccount.id,
            portfolioAllocations: portfolioAllocationsKey,
            totalAllocation,
            strategiesLength: strategies.length,
            benchmarksLength: benchmarks.length
        };

        // Skip if we've already processed this exact state
        if (
            lastProcessedState.current.accountId === stateKey.accountId &&
            lastProcessedState.current.portfolioAllocations === stateKey.portfolioAllocations &&
            lastProcessedState.current.totalAllocation === stateKey.totalAllocation &&
            lastProcessedState.current.strategiesLength === stateKey.strategiesLength &&
            lastProcessedState.current.benchmarksLength === stateKey.benchmarksLength
        ) {
            return;
        }

        if (totalAllocation !== 100 || currentAccount.portfolioAllocations.length === 0) {
            if (currentAccount.reportData !== null) {
                updateAccount(currentAccount.id, { reportData: null });
            }
            lastProcessedState.current = stateKey;
            return;
        }

        // Defensively check for missing strategies and filter them out
        const validAllocations = currentAccount.portfolioAllocations.filter(alloc => 
            strategies.find(s => s.id === alloc.strategyId)
        );

        // If there are invalid allocations, clean them up silently
        if (validAllocations.length !== currentAccount.portfolioAllocations.length) {
            const invalidIds = currentAccount.portfolioAllocations
                .filter(alloc => !strategies.find(s => s.id === alloc.strategyId))
                .map(alloc => alloc.strategyId);
            console.warn('Removed invalid strategy allocations:', invalidIds);
            
            // Recalculate weights if needed
            if (validAllocations.length > 0) {
                const totalWeight = validAllocations.reduce((sum, alloc) => sum + alloc.weight, 0);
                if (totalWeight !== 100 && totalWeight > 0) {
                    // Normalize weights to sum to 100%
                    const normalizedAllocations = validAllocations.map(alloc => ({
                        ...alloc,
                        weight: Math.round((alloc.weight / totalWeight) * 100)
                    }));
                    // Adjust last one to ensure exact 100%
                    const normalizedTotal = normalizedAllocations.reduce((sum, alloc) => sum + alloc.weight, 0);
                    if (normalizedTotal !== 100 && normalizedAllocations.length > 0) {
                        normalizedAllocations[normalizedAllocations.length - 1].weight += (100 - normalizedTotal);
                    }
                    updateAccount(currentAccount.id, { portfolioAllocations: normalizedAllocations });
                    lastProcessedState.current = {
                        accountId: currentAccount.id,
                        portfolioAllocations: JSON.stringify(normalizedAllocations),
                        totalAllocation: 100,
                        strategiesLength: strategies.length,
                        benchmarksLength: benchmarks.length
                    };
                    return;
                } else {
                    updateAccount(currentAccount.id, { portfolioAllocations: validAllocations });
                    lastProcessedState.current = {
                        accountId: currentAccount.id,
                        portfolioAllocations: JSON.stringify(validAllocations),
                        totalAllocation,
                        strategiesLength: strategies.length,
                        benchmarksLength: benchmarks.length
                    };
                    return;
                }
            } else {
                updateAccount(currentAccount.id, { portfolioAllocations: [] });
                lastProcessedState.current = {
                    accountId: currentAccount.id,
                    portfolioAllocations: '[]',
                    totalAllocation: 0,
                    strategiesLength: strategies.length,
                    benchmarksLength: benchmarks.length
                };
                return;
            }
        }

        // Now that we know they all exist, we can safely create the list
        const selectedStrategies = currentAccount.portfolioAllocations.map(alloc => {
            const strategy = strategies.find(s => s.id === alloc.strategyId);
            if (!strategy) return null;
            return {
                ...strategy,
                weight: alloc.weight / 100
            };
        }).filter((s): s is NonNullable<typeof s> => s !== null);

        // Get adviser fee for calculations
        const adviserFeeNum = parseFloat(currentAccount.adviserFee) || 0;
        
        const portfolioReturns = blendPortfolios(selectedStrategies, adviserFeeNum);
        const portfolioMetrics = calculateMetrics(portfolioReturns);
        const portfolioVolatility = portfolioMetrics.volatility;

        if (portfolioVolatility === null || benchmarks.length === 0) {
            lastProcessedState.current = stateKey;
            return;
        }

        let bestFitBenchmarkId: string | null = null;
        let minVolatilityDiff = Infinity;

        benchmarks.forEach(benchmark => {
            const benchMetrics = benchmarkMetricsMap.get(benchmark.id);
            if (benchMetrics?.volatility !== null) {
                const diff = Math.abs(portfolioVolatility - benchMetrics.volatility!);
                if (diff < minVolatilityDiff) {
                    minVolatilityDiff = diff;
                    bestFitBenchmarkId = benchmark.id;
                }
            }
        });

        if (bestFitBenchmarkId && bestFitBenchmarkId !== currentAccount.selectedBenchmarkId) {
            updateAccount(currentAccount.id, { selectedBenchmarkId: bestFitBenchmarkId });
        }
        
        lastProcessedState.current = stateKey;
    }, [currentAccount?.id, currentAccount?.portfolioAllocations, currentAccount?.selectedBenchmarkId, currentAccount?.adviserFee, totalAllocation, strategies, benchmarks, benchmarkMetricsMap, updateAccount]);
    
    // Track last benchmark validation to prevent loops
    const lastBenchmarkValidation = useRef<{
        accountId: string | null;
        benchmarkIds: string;
    }>({
        accountId: null,
        benchmarkIds: ''
    });

    useEffect(() => {
        if (!currentAccount || benchmarks.length === 0) {
            if (lastBenchmarkValidation.current.accountId !== null) {
                lastBenchmarkValidation.current = {
                    accountId: null,
                    benchmarkIds: ''
                };
            }
            return;
        }

        const benchmarkIds = benchmarks.map(b => b.id).sort().join(',');
        const currentBenchmarkId = currentAccount.selectedBenchmarkId;

        // Skip if we've already processed this state
        if (
            lastBenchmarkValidation.current.accountId === currentAccount.id &&
            lastBenchmarkValidation.current.benchmarkIds === benchmarkIds &&
            (currentBenchmarkId === '' || benchmarks.some(b => b.id === currentBenchmarkId))
        ) {
            return;
        }

        if (!benchmarks.some(b => b.id === currentBenchmarkId)) {
            updateAccount(currentAccount.id, { selectedBenchmarkId: benchmarks[0].id });
        }

        lastBenchmarkValidation.current = {
            accountId: currentAccount.id,
            benchmarkIds
        };
    }, [currentAccount?.id, currentAccount?.selectedBenchmarkId, benchmarks, updateAccount]);

    // Computed allocation data for current account
    const strategyAllocationData = useMemo(() => {
        if (!currentAccount) return [];
        return currentAccount.portfolioAllocations
            .map(alloc => {
                const strategy = strategies.find(s => s.id === alloc.strategyId);
                return {
                    name: strategy ? strategy.name : 'Unknown Strategy',
                    value: alloc.weight,
                };
            })
            .filter(item => item.value > 0.01);
    }, [currentAccount?.portfolioAllocations, strategies]);

    const categoryAllocationData = useMemo(() => {
        if (!currentAccount) return [];
        const totals: { [key: string]: number } = {
            'Equity': 0,
            'Fixed Income': 0,
            'Alternatives': 0,
        };

        currentAccount.portfolioAllocations.forEach(alloc => {
            const strategy = strategies.find(s => s.id === alloc.strategyId);
            if (strategy && strategy.assetAllocation) {
                const portfolioWeight = alloc.weight / 100;
                totals['Equity'] += portfolioWeight * (strategy.assetAllocation.equity / 100);
                totals['Fixed Income'] += portfolioWeight * (strategy.assetAllocation.fixedIncome / 100);
                totals['Alternatives'] += portfolioWeight * (strategy.assetAllocation.alternatives / 100);
            }
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value: value * 100 }))
            .filter(item => item.value > 0.01);
    }, [currentAccount?.portfolioAllocations, strategies]);

    // Benchmark allocation data (similar to strategy allocation data)
    const benchmarkAllocationData = useMemo(() => {
        if (!currentAccount) return [];
        return currentAccount.benchmarkAllocations
            .map(alloc => {
                const benchmark = benchmarks.find(b => b.id === alloc.strategyId);
                return {
                    name: benchmark ? benchmark.name : 'Unknown Benchmark',
                    value: alloc.weight,
                };
            })
            .filter(item => item.value > 0.01);
    }, [currentAccount?.benchmarkAllocations, benchmarks]);

    const benchmarkCategoryAllocationData = useMemo(() => {
        if (!currentAccount) return [];
        const totals: { [key: string]: number } = {
            'Equity': 0,
            'Fixed Income': 0,
            'Alternatives': 0,
        };

        currentAccount.benchmarkAllocations.forEach(alloc => {
            const benchmark = benchmarks.find(b => b.id === alloc.strategyId);
            if (benchmark && benchmark.assetAllocation) {
                const benchmarkWeight = alloc.weight / 100;
                totals['Equity'] += benchmarkWeight * (benchmark.assetAllocation.equity / 100);
                totals['Fixed Income'] += benchmarkWeight * (benchmark.assetAllocation.fixedIncome / 100);
                totals['Alternatives'] += benchmarkWeight * (benchmark.assetAllocation.alternatives / 100);
            }
        });

        return Object.entries(totals)
            .map(([name, value]) => ({ name, value: value * 100 }))
            .filter(item => item.value > 0.01);
    }, [currentAccount?.benchmarkAllocations, benchmarks]);

    const handleGenerateReport = useCallback(async () => {
        if (!currentAccount) return;
        
        if (totalAllocation !== 100) {
            alert("Total portfolio allocation must be 100%.");
            return;
        }

        if (totalBenchmarkAllocation !== 100) {
            alert("Total benchmark allocation must be 100%.");
            return;
        }

        const selectedStrategies = currentAccount.portfolioAllocations.map(alloc => {
            const strategy = strategies.find(s => s.id === alloc.strategyId);
            if (!strategy) throw new Error("Strategy not found");
            return {
                ...strategy,
                weight: alloc.weight / 100
            };
        });

        // Use benchmark allocations if available, otherwise fall back to selectedBenchmarkId
        let benchmarkReturns: MonthlyReturn[];
        let benchmarkName: string;
        
        if (currentAccount.benchmarkAllocations.length > 0) {
            const selectedBenchmarks = currentAccount.benchmarkAllocations.map(alloc => {
                const benchmark = benchmarks.find(b => b.id === alloc.strategyId);
                if (!benchmark) throw new Error("Benchmark not found");
                return {
                    ...benchmark,
                    weight: alloc.weight / 100
                };
            });
            benchmarkReturns = blendPortfolios(selectedBenchmarks);
            // Create a combined name for blended benchmarks
            benchmarkName = currentAccount.benchmarkAllocations.length === 1 
                ? benchmarks.find(b => b.id === currentAccount.benchmarkAllocations[0].strategyId)?.name || 'Benchmark'
                : 'Blended Benchmark';
        } else {
            // Fallback to single benchmark selection
            const benchmark = benchmarks.find(b => b.id === currentAccount.selectedBenchmarkId);
            if (!benchmark) {
                alert("Please select a benchmark.");
                return;
            }
            benchmarkReturns = benchmark.returns;
            benchmarkName = benchmark.name;
        }

        // Parse adviser fee (annual percentage)
        const adviserFeeNum = parseFloat(currentAccount.adviserFee) || 0;
        
        // Apply adviser fee to portfolio returns (but not benchmark - benchmarks are already net of their fees)
        const portfolioReturns = blendPortfolios(selectedStrategies, adviserFeeNum);
        const investmentAmountNum = parseFloat(currentAccount.investmentAmount) || 0;
        const annualDistributionNum = parseFloat(currentAccount.annualDistribution) || 0;
        const clientAgeNum = parseFloat(currentAccount.clientAge) || 0;
        const portfolioMetrics = calculateMetrics(portfolioReturns, investmentAmountNum, annualDistributionNum, clientAgeNum);
        const benchmarkMetrics = calculateMetrics(benchmarkReturns, investmentAmountNum, annualDistributionNum, clientAgeNum);

        const report: ReportData = {
            portfolio: {
                ...portfolioMetrics,
                name: 'Portfolio'
            },
            benchmark: {
                ...benchmarkMetrics,
                name: benchmarkName
            }
        };

        updateAccount(currentAccount.id, { reportData: report });

        // Save proposal
        try {
            await apiService.createProposal({
                adviser_name: adviserName,
                client_name: clientName,
                investment_amount: currentAccount.investmentAmount,
                client_age: currentAccount.clientAge,
                annual_distribution: currentAccount.annualDistribution,
                risk_tolerance: currentAccount.riskTolerance,
                allocations: currentAccount.portfolioAllocations,
                selected_benchmark_id: currentAccount.selectedBenchmarkId,
                ai_summary: currentAccount.aiSummary
            });
        } catch (error) {
            console.error('Error saving proposal:', error);
        }
    }, [
        currentAccount, totalAllocation, totalBenchmarkAllocation, strategies, benchmarks,
        adviserName, clientName, updateAccount
    ]);

    // Admin handlers with API
 const handleAddStrategy = async (name: string, returns: MonthlyReturn[], assetAllocation: AssetAllocation) => {
    try {
        const strategy = {
            name,
            returns,
            assetAllocation
        };
        const newStrategy = await apiService.createStrategy(strategy);
        setStrategies([...strategies, newStrategy]);
    } catch (error) {
        alert('Failed to add strategy');
    }
};

    const handleUpdateStrategy = async (id: string, name: string, assetAllocation: AssetAllocation) => {
        try {
            // Find the existing strategy to preserve returns
            const existingStrategy = strategies.find(s => s.id === id);
            if (!existingStrategy) {
                alert('Strategy not found');
                return;
            }
            
            // Update with name and assetAllocation, preserving existing returns
            const updated = await apiService.updateStrategy(id, {
                name,
                returns: existingStrategy.returns, // Preserve existing returns
                assetAllocation
            });
            setStrategies(strategies.map(s => s.id === id ? { ...s, ...updated } : s));
        } catch (error) {
            console.error('Failed to update strategy:', error);
            alert('Failed to update strategy. Please check the console for details.');
        }
    };

    const handleDeleteStrategy = async (id: string) => {
        try {
            await apiService.deleteStrategy(id);
            setStrategies(strategies.filter(s => s.id !== id));
            // Remove deleted strategy from all accounts' portfolio allocations
            setAccounts(accounts.map(account => {
                const updatedAllocations = account.portfolioAllocations.filter(alloc => alloc.strategyId !== id);
                if (updatedAllocations.length === account.portfolioAllocations.length) {
                    return account; // No change needed
                }
                
                // Recalculate weights if needed to maintain 100% total
                if (updatedAllocations.length > 0) {
                    const totalWeight = updatedAllocations.reduce((sum, alloc) => sum + alloc.weight, 0);
                    if (totalWeight !== 100 && totalWeight > 0) {
                        // Normalize weights to sum to 100%
                        const normalizedAllocations = updatedAllocations.map(alloc => ({
                            ...alloc,
                            weight: Math.round((alloc.weight / totalWeight) * 100)
                        }));
                        // Adjust last one to ensure exact 100%
                        const normalizedTotal = normalizedAllocations.reduce((sum, alloc) => sum + alloc.weight, 0);
                        if (normalizedTotal !== 100 && normalizedAllocations.length > 0) {
                            normalizedAllocations[normalizedAllocations.length - 1].weight += (100 - normalizedTotal);
                        }
                        return { ...account, portfolioAllocations: normalizedAllocations };
                    } else {
                        return { ...account, portfolioAllocations: updatedAllocations };
                    }
                } else {
                    // No allocations left
                    return { ...account, portfolioAllocations: [] };
                }
            }));
        } catch (error) {
            console.error('Failed to delete strategy:', error);
            alert('Failed to delete strategy. Please check the console for details.');
        }
    };

 const handleAddBenchmark = async (name: string, returns: MonthlyReturn[]) => {
    try {
        const benchmark = {
            name,
            returns
        };
        const newBenchmark = await apiService.createBenchmark(benchmark);
        setBenchmarks([...benchmarks, newBenchmark]);
    } catch (error) {
        alert('Failed to add benchmark');
    }
};

    const handleUpdateBenchmark = async (id: string, name: string) => {
        try {
            // Find the existing benchmark to preserve returns
            const existingBenchmark = benchmarks.find(b => b.id === id);
            if (!existingBenchmark) {
                alert('Benchmark not found');
                return;
            }
            
            // Update with name, preserving existing returns
            const updated = await apiService.updateBenchmark(id, {
                name,
                returns: existingBenchmark.returns // Preserve existing returns
            });
            setBenchmarks(benchmarks.map(b => b.id === id ? { ...b, ...updated } : b));
        } catch (error) {
            console.error('Failed to update benchmark:', error);
            alert('Failed to update benchmark. Please check the console for details.');
        }
    };

    const handleDeleteBenchmark = async (id: string) => {
        try {
            await apiService.deleteBenchmark(id);
            setBenchmarks(benchmarks.filter(b => b.id !== id));
            // Update all accounts that used this benchmark
            const remainingBenchmarks = benchmarks.filter(b => b.id !== id);
            setAccounts(accounts.map(account => {
                // Update benchmark allocations
                const updatedBenchmarkAllocations = account.benchmarkAllocations.filter(alloc => alloc.strategyId !== id);
                
                // Update selectedBenchmarkId if it was the deleted one
                let newSelectedBenchmarkId = account.selectedBenchmarkId;
                if (account.selectedBenchmarkId === id && remainingBenchmarks.length > 0) {
                    newSelectedBenchmarkId = remainingBenchmarks[0].id;
                }
                
                return {
                    ...account,
                    benchmarkAllocations: updatedBenchmarkAllocations.length > 0 ? updatedBenchmarkAllocations : 
                        (remainingBenchmarks.length > 0 ? [{ strategyId: remainingBenchmarks[0].id, weight: 100 }] : []),
                    selectedBenchmarkId: newSelectedBenchmarkId === id && remainingBenchmarks.length > 0 
                        ? remainingBenchmarks[0].id 
                        : newSelectedBenchmarkId
                };
            }));
        } catch (error) {
            console.error('Failed to delete benchmark:', error);
            alert('Failed to delete benchmark. Please check the console for details.');
        }
    };

    const handleUpdateSelectedBeforePages = async (pageIds: string[]) => {
        await updateSettings({ 
            ...settings, 
            selected_before_page_ids: pageIds 
        });
    };

    const handleUpdateSelectedAfterPages = async (pageIds: string[]) => {
        await updateSettings({ 
            ...settings, 
            selected_after_page_ids: pageIds 
        });
    };

    const handleSetFirmLogo = async (logoData: string | null) => {
        await updateSettings({ ...settings, logo_data: logoData });
    };

    const handleSetSecondaryLogo = async (logoData: string | null) => {
        await updateSettings({ ...settings, secondary_logo_data: logoData });
    };

    // Account management handlers
    const handleAddAccount = useCallback(() => {
        const newAccount: Account = {
            id: `account-${Date.now()}`,
            accountName: `Account ${accounts.length + 1}`,
            portfolioAllocations: [],
            benchmarkAllocations: [],
            selectedBenchmarkId: '',
            reportData: null,
            aiSummary: '',
            investmentAmount: '',
            clientAge: '',
            annualDistribution: '',
            riskTolerance: '',
            adviserFee: ''
        };
        setAccounts([...accounts, newAccount]);
        setSelectedAccountId(newAccount.id);
    }, [accounts]);

    const handleDeleteAccount = useCallback((accountId: string) => {
        if (accounts.length <= 1) {
            alert('Cannot delete the last account. At least one account is required.');
            return;
        }
        const updatedAccounts = accounts.filter(acc => acc.id !== accountId);
        setAccounts(updatedAccounts);
        if (selectedAccountId === accountId) {
            setSelectedAccountId(updatedAccounts[0]?.id || null);
        }
    }, [accounts, selectedAccountId]);

    const handleSelectAccount = useCallback((accountId: string) => {
        setSelectedAccountId(accountId);
    }, []);

    if (strategiesState.loading || benchmarksState.loading || settingsState.loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading application...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 font-sans">
            <header className="bg-white shadow-md">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Investment Proposal Generator</h1>
                        <p className="text-gray-600 mt-1">Create compelling, data-driven investment proposals for your clients.</p>
                    </div>
                     <div className="flex items-center space-x-4">
                        {!isAdminMode && (
                            <>
                                <span className="text-sm font-medium text-gray-700">Household View</span>
                                <label htmlFor="household-toggle" className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="household-toggle" className="sr-only peer" checked={isHouseholdMode} onChange={() => setIsHouseholdMode(!isHouseholdMode)} />
                                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </>
                        )}
                        <span className="text-sm font-medium text-gray-700">{isAdminMode ? 'Admin Mode' : 'Adviser View'}</span>
                        <label htmlFor="admin-toggle" className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" id="admin-toggle" className="sr-only peer" checked={isAdminMode} onChange={() => setIsAdminMode(!isAdminMode)} />
                            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-4 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </header>

            <main className="container mx-auto p-4 sm:p-6 lg:p-8">
                {isAdminMode ? (
                     <AdminPanel
                        strategies={strategies}
                        benchmarks={benchmarks}
                        onAddStrategy={handleAddStrategy}
                        onUpdateStrategy={handleUpdateStrategy}
                        onDeleteStrategy={handleDeleteStrategy}
                        onAddBenchmark={handleAddBenchmark}
                        onUpdateBenchmark={handleUpdateBenchmark}
                        onDeleteBenchmark={handleDeleteBenchmark}
                        selectedBeforePageIds={settings.selected_before_page_ids || []}
                        selectedAfterPageIds={settings.selected_after_page_ids || []}
                        onUpdateSelectedBeforePages={handleUpdateSelectedBeforePages}
                        onUpdateSelectedAfterPages={handleUpdateSelectedAfterPages}
                        firmLogo={settings.logo_data}
                        secondaryLogo={settings.secondary_logo_data}
                        onSetFirmLogo={handleSetFirmLogo}
                        onSetSecondaryLogo={handleSetSecondaryLogo}
                    />
                ) : (
                    isHouseholdMode ? (
                        <div className="space-y-6">
                            <div className="bg-white p-4 rounded-lg shadow-lg">
                                <div className="flex space-x-4 mb-4">
                                    <button
                                        onClick={() => setHouseholdView('account')}
                                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                            householdView === 'account'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        Individual Accounts
                                    </button>
                                    <button
                                        onClick={() => setHouseholdView('summary')}
                                        className={`px-4 py-2 rounded-md font-medium transition-colors ${
                                            householdView === 'summary'
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                        }`}
                                    >
                                        Household Summary
                                    </button>
                                </div>
                            </div>

                            {householdView === 'summary' ? (
                                <HouseholdSummary
                                    accounts={accounts}
                                    strategies={strategies}
                                    benchmarks={benchmarks}
                                />
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                    <div className="lg:col-span-1 space-y-8">
                                        <AccountSelector
                                            accounts={accounts}
                                            selectedAccountId={selectedAccountId}
                                            onSelectAccount={handleSelectAccount}
                                            onAddAccount={handleAddAccount}
                                            onDeleteAccount={handleDeleteAccount}
                                        />
                                        {currentAccount && (
                                            <>
                                                <ProposalDetailsForm
                                                    adviserName={adviserName}
                                                    setAdviserName={setAdviserName}
                                                    clientName={clientName}
                                                    setClientName={setClientName}
                                                    investmentAmount={currentAccount.investmentAmount}
                                                    setInvestmentAmount={(val) => updateAccount(currentAccount.id, { investmentAmount: val })}
                                                    clientAge={currentAccount.clientAge}
                                                    setClientAge={(val) => updateAccount(currentAccount.id, { clientAge: val })}
                                                    annualDistribution={currentAccount.annualDistribution}
                                                    setAnnualDistribution={(val) => updateAccount(currentAccount.id, { annualDistribution: val })}
                                                    riskTolerance={currentAccount.riskTolerance}
                                                    setRiskTolerance={(val) => updateAccount(currentAccount.id, { riskTolerance: val })}
                                                    adviserFee={currentAccount.adviserFee}
                                                    setAdviserFee={(val) => updateAccount(currentAccount.id, { adviserFee: val })}
                                                />
                                                <div className="bg-white p-6 rounded-lg shadow-lg">
                                                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Account: {currentAccount.accountName}</h2>
                                                    <input
                                                        type="text"
                                                        value={currentAccount.accountName}
                                                        onChange={(e) => updateAccount(currentAccount.id, { accountName: e.target.value })}
                                                        className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm mb-4"
                                                        placeholder="Account Name"
                                                    />
                                                    <h3 className="text-lg font-semibold mb-4">1. Configure Portfolio</h3>
                                                    {strategies.length > 0 ? (
                                                        <StrategySelector
                                                            strategies={strategies}
                                                            allocations={currentAccount.portfolioAllocations}
                                                            setAllocations={(allocs) => updateAccount(currentAccount.id, { portfolioAllocations: allocs })}
                                                        />
                                                    ) : <p className="text-gray-500">No strategies available. Please add one in the Admin Panel.</p>}
                                                </div>
                                                
                                                {totalAllocation > 0 && (
                                                    <AllocationCharts
                                                        strategyAllocationData={strategyAllocationData}
                                                        categoryAllocationData={categoryAllocationData}
                                                    />
                                                )}

                                                <div className="bg-white p-6 rounded-lg shadow-lg">
                                                    <h2 className="text-xl font-semibold mb-1 border-b pb-2">2. Select Benchmark</h2>
                                                    <p className="text-sm text-gray-500 my-3">A benchmark is automatically suggested based on portfolio volatility. You can override it below.</p>
                                                    {benchmarks.length > 0 ? (
                                                        <BenchmarkSelector
                                                            benchmarks={benchmarks}
                                                            allocations={currentAccount.benchmarkAllocations}
                                                            setAllocations={(allocs) => updateAccount(currentAccount.id, { benchmarkAllocations: allocs })}
                                                        />
                                                    ) : <p className="text-gray-500">No benchmarks available. Please add one in the Admin Panel.</p>}
                                                </div>

                                                <button
                                                    onClick={handleGenerateReport}
                                                    disabled={totalAllocation !== 100 || totalBenchmarkAllocation !== 100 || strategies.length === 0 || benchmarks.length === 0}
                                                    className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 shadow-md text-lg"
                                                >
                                                    Generate Report
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    <div className="lg:col-span-2">
                                        {currentAccount?.reportData ? (
                                           <div className="space-y-8">
                                                <AiSummary 
                                                    reportData={currentAccount.reportData} 
                                                    summary={currentAccount.aiSummary} 
                                                    onSummaryUpdate={(summary) => updateAccount(currentAccount.id, { aiSummary: summary })} 
                                                    clientAge={currentAccount.clientAge}
                                                    annualDistribution={currentAccount.annualDistribution}
                                                    riskTolerance={currentAccount.riskTolerance}
                                                    investmentAmount={currentAccount.investmentAmount}
                                                    clientName={clientName}
                                                    adviserName={adviserName}
                                                />
                                                <ReportOutput
                                                  reportData={currentAccount.reportData}
                                                  selectedBeforePageIds={settings.selected_before_page_ids || []}
                                                  selectedAfterPageIds={settings.selected_after_page_ids || []}
                                                  aiSummary={currentAccount.aiSummary}
                                                  firmLogo={settings.logo_data}
                                                  secondaryLogo={settings.secondary_logo_data}
                                                  adviserName={adviserName}
                                                  clientName={clientName}
                                                  investmentAmount={currentAccount.investmentAmount}
                                                  clientAge={currentAccount.clientAge}
                                                  annualDistribution={currentAccount.annualDistribution}
                                                  riskTolerance={currentAccount.riskTolerance}
                                                  strategyAllocationData={strategyAllocationData}
                                                  categoryAllocationData={categoryAllocationData}
                                                  benchmarkAllocationData={benchmarkAllocationData}
                                                  benchmarkCategoryAllocationData={benchmarkCategoryAllocationData}
                                                />
                                           </div>
                                        ) : (
                                            <div className="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-lg h-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                                <h3 className="text-2xl font-semibold text-gray-700 mt-6">Your Report Awaits</h3>
                                                <p className="text-gray-500 mt-2 text-center">Configure your portfolio and select a benchmark, then click "Generate Report" to see the analysis.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-8">
                                <ProposalDetailsForm
                                    adviserName={adviserName}
                                    setAdviserName={setAdviserName}
                                    clientName={clientName}
                                    setClientName={setClientName}
                                    investmentAmount={currentAccount?.investmentAmount || ''}
                                    setInvestmentAmount={(val) => currentAccount && updateAccount(currentAccount.id, { investmentAmount: val })}
                                    clientAge={currentAccount?.clientAge || ''}
                                    setClientAge={(val) => currentAccount && updateAccount(currentAccount.id, { clientAge: val })}
                                    annualDistribution={currentAccount?.annualDistribution || ''}
                                    setAnnualDistribution={(val) => currentAccount && updateAccount(currentAccount.id, { annualDistribution: val })}
                                    riskTolerance={currentAccount?.riskTolerance || ''}
                                    setRiskTolerance={(val) => currentAccount && updateAccount(currentAccount.id, { riskTolerance: val })}
                                    adviserFee={currentAccount?.adviserFee || ''}
                                    setAdviserFee={(val) => currentAccount && updateAccount(currentAccount.id, { adviserFee: val })}
                                />
                                {currentAccount && (
                                    <>
                                        <div className="bg-white p-6 rounded-lg shadow-lg">
                                            <h2 className="text-xl font-semibold mb-4 border-b pb-2">1. Configure Portfolio</h2>
                                            {strategies.length > 0 ? (
                                                <StrategySelector
                                                    strategies={strategies}
                                                    allocations={currentAccount.portfolioAllocations}
                                                    setAllocations={(allocs) => updateAccount(currentAccount.id, { portfolioAllocations: allocs })}
                                                />
                                            ) : <p className="text-gray-500">No strategies available. Please add one in the Admin Panel.</p>}
                                        </div>
                                        
                                        {totalAllocation > 0 && (
                                            <AllocationCharts
                                                strategyAllocationData={strategyAllocationData}
                                                categoryAllocationData={categoryAllocationData}
                                            />
                                        )}

                                        <div className="bg-white p-6 rounded-lg shadow-lg">
                                            <h2 className="text-xl font-semibold mb-1 border-b pb-2">2. Select Benchmark</h2>
                                            <p className="text-sm text-gray-500 my-3">A benchmark is automatically suggested based on portfolio volatility. You can override it below.</p>
                                            {benchmarks.length > 0 ? (
                                                <BenchmarkSelector
                                                    benchmarks={benchmarks}
                                                    allocations={currentAccount.benchmarkAllocations}
                                                    setAllocations={(allocs) => updateAccount(currentAccount.id, { benchmarkAllocations: allocs })}
                                                />
                                            ) : <p className="text-gray-500">No benchmarks available. Please add one in the Admin Panel.</p>}
                                        </div>

                                        <button
                                            onClick={handleGenerateReport}
                                            disabled={totalAllocation !== 100 || totalBenchmarkAllocation !== 100 || strategies.length === 0 || benchmarks.length === 0}
                                            className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors duration-300 shadow-md text-lg"
                                        >
                                            Generate Report
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="lg:col-span-2">
                                {currentAccount?.reportData ? (
                                   <div className="space-y-8">
                                        <AiSummary 
                                            reportData={currentAccount.reportData} 
                                            summary={currentAccount.aiSummary} 
                                            onSummaryUpdate={(summary) => updateAccount(currentAccount.id, { aiSummary: summary })} 
                                            clientAge={currentAccount.clientAge}
                                            annualDistribution={currentAccount.annualDistribution}
                                            riskTolerance={currentAccount.riskTolerance}
                                            investmentAmount={currentAccount.investmentAmount}
                                            clientName={clientName}
                                            adviserName={adviserName}
                                        />
                                        <ReportOutput
                                          reportData={currentAccount.reportData}
                                          selectedBeforePageIds={settings.selected_before_page_ids || []}
                                          selectedAfterPageIds={settings.selected_after_page_ids || []}
                                          aiSummary={currentAccount.aiSummary}
                                          firmLogo={settings.logo_data}
                                          secondaryLogo={settings.secondary_logo_data}
                                          adviserName={adviserName}
                                          clientName={clientName}
                                          investmentAmount={currentAccount.investmentAmount}
                                          clientAge={currentAccount.clientAge}
                                          annualDistribution={currentAccount.annualDistribution}
                                          riskTolerance={currentAccount.riskTolerance}
                                          strategyAllocationData={strategyAllocationData}
                                          categoryAllocationData={categoryAllocationData}
                                          benchmarkAllocationData={benchmarkAllocationData}
                                          benchmarkCategoryAllocationData={benchmarkCategoryAllocationData}
                                        />
                                   </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center bg-white p-8 rounded-lg shadow-lg h-full">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V7a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h3 className="text-2xl font-semibold text-gray-700 mt-6">Your Report Awaits</h3>
                                        <p className="text-gray-500 mt-2 text-center">Configure your portfolio and select a benchmark, then click "Generate Report" to see the analysis.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                 )}
            </main>
        </div>
    );
};

export default App;
