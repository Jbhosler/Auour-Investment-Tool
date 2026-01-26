import { ReportData } from '../types';
import { diagnosticLogger } from '../utils/diagnosticLogger';
// Use static import - Vite will handle bundling and code-splitting automatically
import { GoogleGenerativeAI } from '@google/generative-ai';

// PHASE 1 DIAGNOSTIC: Module-level logging to verify module loads
console.error('📦📦📦 geminiService.ts MODULE LOADED 📦📦📦');
console.error('📦 GoogleGenerativeAI imported:', typeof GoogleGenerativeAI);
try {
    localStorage.setItem('gemini_service_module_loaded', JSON.stringify({
        timestamp: new Date().toISOString(),
        message: 'geminiService.ts module loaded successfully',
        googleGenerativeAIType: typeof GoogleGenerativeAI
    }));
    console.error('✅ Stored module load test to localStorage');
} catch (e) {
    console.error('❌ Failed to store module load test:', e);
}

const formatPercent = (val: number | null) => val !== null ? `${(val * 100).toFixed(2)}%` : 'N/A';
const formatDrawdown = (d: any) => `${formatPercent(d.drawdown)} (from ${d.peakDate} to ${d.troughDate})`;
const formatCurrency = (value: string) => {
    if (!value) return 'N/A';
    const number = parseFloat(value.replace(/[^0-9.-]+/g,""));
    if (isNaN(number)) return 'N/A';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(number);
};


export const generateProposalSummary = async (reportData: ReportData, clientAge: string, annualDistribution: string, riskTolerance: string): Promise<string> => {
    // Logging for debugging (console only, no alerts in production)
    console.error('🚀 generateProposalSummary called');
    console.error('🚀 ReportData exists:', !!reportData);
    console.error('🚀 clientAge:', clientAge);
    console.error('🚀 annualDistribution:', annualDistribution);
    console.error('🚀 riskTolerance:', riskTolerance);
    
    // Try to log to localStorage directly (bypass diagnostic logger)
    try {
        const immediateLog = {
            timestamp: new Date().toISOString(),
            message: 'generateProposalSummary called',
            hasReportData: !!reportData
        };
        localStorage.setItem('last_diagnostic', JSON.stringify(immediateLog));
        console.log('✅ Stored immediate log to localStorage');
    } catch (e) {
        console.error('❌ Failed to store immediate log:', e);
    }
    
    // Now try diagnostic logger
    try {
        diagnosticLogger.info('🚀 generateProposalSummary called', { 
            hasReportData: !!reportData,
            clientAge,
            annualDistribution,
            riskTolerance 
        });
        console.log('✅ diagnosticLogger.info called');
    } catch (e) {
        console.error('❌ diagnosticLogger.info failed:', e);
    }
    
    try {
        // Step 0: Verify config.js is loaded
        diagnosticLogger.info('Step 0: Verifying config.js is loaded');
        const configScriptLoaded = typeof (window as any).__ENV__ !== 'undefined';
        diagnosticLogger.info('config.js loaded check', { 
            configScriptLoaded,
            windowEnvExists: typeof (window as any).__ENV__ !== 'undefined'
        });
        
        if (!configScriptLoaded) {
            diagnosticLogger.error('❌ config.js not loaded!', {
                windowEnv: (window as any).__ENV__,
                windowKeys: Object.keys(window).filter(k => k.includes('ENV'))
            });
            return "Configuration not loaded. Please refresh the page and try again.";
        }
        
        // Step 1: Check window.__ENV__
        diagnosticLogger.info('Step 1: Checking window.__ENV__');
        const windowEnv = (window as any).__ENV__;
        diagnosticLogger.info('window.__ENV__ check', {
            windowEnvExists: !!windowEnv,
            windowEnvKeys: windowEnv ? Object.keys(windowEnv) : [],
            windowEnvValue: windowEnv
        });
        
        // Step 2: Check API key retrieval
        diagnosticLogger.info('Step 2: Retrieving API key');
        const runtimeKey = windowEnv?.VITE_GEMINI_API_KEY;
        // Use import.meta.env which Vite replaces automatically during build
        const buildTimeKey = import.meta.env.VITE_GEMINI_API_KEY || undefined;
        // @ts-ignore - Fallback to define replacement if import.meta.env didn't work
        const defineKey = typeof __GEMINI_API_KEY__ !== 'undefined' && __GEMINI_API_KEY__ !== '""' && __GEMINI_API_KEY__ !== ''
            ? __GEMINI_API_KEY__
            : undefined;
        // Prefer build-time key over runtime key if runtime key is placeholder
        // Runtime injection (via config.js) takes precedence, but only if it's not the placeholder
        const apiKey = (runtimeKey && runtimeKey !== 'REPLACE_WITH_API_KEY') 
            ? runtimeKey 
            : (buildTimeKey || defineKey);
        
        // Enhanced diagnostics - log each value separately for clarity
        console.error('🔍 API Key Debug - runtimeKey:', runtimeKey ? `${runtimeKey.substring(0, 10)}... (length: ${runtimeKey.length})` : 'undefined');
        console.error('🔍 API Key Debug - buildTimeKey (import.meta.env):', buildTimeKey ? `${buildTimeKey.substring(0, 10)}... (length: ${buildTimeKey.length})` : 'undefined');
        console.error('🔍 API Key Debug - import.meta.env.VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY ? `${import.meta.env.VITE_GEMINI_API_KEY.substring(0, 10)}... (length: ${import.meta.env.VITE_GEMINI_API_KEY.length})` : 'undefined');
        console.error('🔍 API Key Debug - defineKey (__GEMINI_API_KEY__):', defineKey ? `${defineKey.substring(0, 10)}... (length: ${defineKey.length})` : 'undefined');
        console.error('🔍 API Key Debug - __GEMINI_API_KEY__ exists?', typeof __GEMINI_API_KEY__ !== 'undefined' ? 'YES' : 'NO');
        console.error('🔍 API Key Debug - finalApiKey:', apiKey ? `${apiKey.substring(0, 10)}... (length: ${apiKey.length})` : 'undefined');
        console.error('🔍 API Key Debug - finalApiKey length:', apiKey?.length || 0);
        
        diagnosticLogger.info('API key retrieval', {
            hasRuntimeKey: !!runtimeKey,
            runtimeKeyLength: runtimeKey?.length,
            runtimeKeyPrefix: runtimeKey ? runtimeKey.substring(0, 10) : 'none',
            runtimeKeyIsPlaceholder: runtimeKey === 'REPLACE_WITH_API_KEY',
            hasBuildTimeKey: !!buildTimeKey,
            buildTimeKeyLength: buildTimeKey?.length,
            buildTimeKeyType: typeof buildTimeKey,
            buildTimeKeyValue: buildTimeKey ? `${buildTimeKey.substring(0, 10)}...` : 'none',
            __GEMINI_API_KEY__Exists: typeof __GEMINI_API_KEY__ !== 'undefined',
            finalApiKeyExists: !!apiKey,
            finalApiKeyLength: apiKey?.length,
            finalApiKeyIsPlaceholder: apiKey === 'REPLACE_WITH_API_KEY'
        });
        
        if (!apiKey || apiKey === 'REPLACE_WITH_API_KEY' || apiKey === '""' || apiKey === '') {
            diagnosticLogger.error('❌ API Key not available or is placeholder', {
                apiKey,
                apiKeyLength: apiKey?.length,
                apiKeyType: typeof apiKey,
                runtimeKey,
                buildTimeKey,
                __GEMINI_API_KEY__: typeof __GEMINI_API_KEY__ !== 'undefined' ? __GEMINI_API_KEY__ : 'undefined'
            });
            return "VITE_GEMINI_API_KEY environment variable not set. Please configure it to use the AI summary feature.";
        }
        
        // Step 3: Verify GoogleGenerativeAI is available (now using static import)
        console.error('🔵 Step 3: Checking GoogleGenerativeAI (static import)...');
        diagnosticLogger.info('Step 3: Verifying GoogleGenerativeAI is available');
        
        console.error('🔵 GoogleGenerativeAI type:', typeof GoogleGenerativeAI);
        console.error('🔵 GoogleGenerativeAI exists:', !!GoogleGenerativeAI);
        
        if (!GoogleGenerativeAI || typeof GoogleGenerativeAI !== 'function') {
            console.error('🔴 GoogleGenerativeAI is NOT a function!');
            console.error('🔴 Value:', GoogleGenerativeAI);
            diagnosticLogger.error('❌ GoogleGenerativeAI import failed', {
                GoogleGenerativeAI,
                type: typeof GoogleGenerativeAI
            });
            return "Failed to import Google Generative AI library. Please check the installation.";
        }
        
        console.error('🔵 GoogleGenerativeAI is valid function!');
        diagnosticLogger.info('GoogleGenerativeAI verified', {
            GoogleGenerativeAIType: typeof GoogleGenerativeAI,
            GoogleGenerativeAIExists: !!GoogleGenerativeAI,
            isFunction: typeof GoogleGenerativeAI === 'function'
        });
        
        // Step 4: Create GoogleGenerativeAI instance
        diagnosticLogger.info('Step 4: Creating GoogleGenerativeAI instance');
        let genAI;
        try {
            console.error('🔵 Creating GoogleGenerativeAI instance with API key...');
            // Check if constructor accepts options (for API version configuration)
            // Try with just API key first (default behavior)
            genAI = new GoogleGenerativeAI(apiKey);
            
            // Log the genAI instance to see what properties/methods it has
            console.error('🔵 genAI instance created:', {
                type: typeof genAI,
                constructor: genAI?.constructor?.name,
                keys: Object.keys(genAI || {}),
                hasGetGenerativeModel: 'getGenerativeModel' in (genAI || {}),
                hasListModels: 'listModels' in (genAI || {})
            });
            diagnosticLogger.info('Constructor succeeded', {
                genAIType: typeof genAI,
                genAIExists: !!genAI,
                genAIConstructor: genAI?.constructor?.name,
                genAIKeys: genAI ? Object.keys(genAI) : [],
                genAIPrototypeMethods: genAI ? Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)) : []
            });
        } catch (constructorError: any) {
            diagnosticLogger.error('❌ Constructor failed', {
                errorMessage: constructorError?.message,
                errorStack: constructorError?.stack,
                errorName: constructorError?.name,
                error: constructorError
            });
            return `Failed to create Google Generative AI instance: ${constructorError?.message || 'Unknown error'}`;
        }
        
        // Step 5: Check getGenerativeModel method
        diagnosticLogger.info('Step 5: Checking getGenerativeModel method');
        diagnosticLogger.info('getGenerativeModel check', {
            genAIExists: genAI !== undefined && genAI !== null,
            genAIType: typeof genAI,
            hasGetGenerativeModel: 'getGenerativeModel' in (genAI || {}),
            getGenerativeModelType: typeof genAI?.getGenerativeModel,
            genAIPrototypeMethods: genAI ? Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)) : [],
            genAIOwnProperties: genAI ? Object.getOwnPropertyNames(genAI) : [],
            genAIAllKeys: genAI ? Object.keys(genAI) : []
        });
        
        if (!genAI || typeof genAI.getGenerativeModel !== 'function') {
            diagnosticLogger.error('❌ getGenerativeModel is not a function', {
                genAI,
                genAIType: typeof genAI,
                hasMethod: !!genAI?.getGenerativeModel,
                methodType: typeof genAI?.getGenerativeModel,
                genAIPrototype: Object.getPrototypeOf(genAI),
                genAIAllProperties: genAI ? Object.getOwnPropertyNames(genAI) : [],
                genAIPrototypeProperties: genAI ? Object.getOwnPropertyNames(Object.getPrototypeOf(genAI)) : []
            });
            return "getGenerativeModel is not available. This may indicate a bundling issue.";
        }
        
        // Step 6: Create model - THIS IS WHERE THE ERROR HAPPENS
        diagnosticLogger.info('Step 6: Creating model - ABOUT TO CALL getGenerativeModel');
        diagnosticLogger.info('Pre-call check', {
            genAIExists: !!genAI,
            genAIType: typeof genAI,
            getGenerativeModelExists: 'getGenerativeModel' in (genAI || {}),
            getGenerativeModelType: typeof genAI?.getGenerativeModel,
            genAIStringified: JSON.stringify(genAI, null, 2).substring(0, 500)
        });
        
        let model;
        try {
            // Add explicit check right before the call
            if (!genAI || typeof genAI.getGenerativeModel !== 'function') {
                diagnosticLogger.error('❌ getGenerativeModel check failed RIGHT BEFORE CALL', {
                    genAI,
                    genAIType: typeof genAI,
                    hasMethod: !!genAI?.getGenerativeModel,
                    methodType: typeof genAI?.getGenerativeModel,
                    genAIKeys: genAI ? Object.keys(genAI) : [],
                    genAIPrototype: genAI ? Object.getPrototypeOf(genAI) : null,
                    genAIAllProperties: genAI ? Object.getOwnPropertyNames(genAI) : []
                });
                throw new Error('getGenerativeModel is not a function right before call');
            }
            
            diagnosticLogger.info('Calling getGenerativeModel now...');
            
            // CRITICAL: Store method reference before calling to avoid minification issues
            const getModelMethod = genAI.getGenerativeModel;
            console.error('🔴 getModelMethod type:', typeof getModelMethod);
            console.error('🔴 getModelMethod:', getModelMethod);
            console.error('🔴 genAI:', genAI);
            console.error('🔴 genAI.getGenerativeModel:', genAI.getGenerativeModel);
            
            if (typeof getModelMethod !== 'function') {
                throw new Error(`getGenerativeModel is not a function. Type: ${typeof getModelMethod}, Value: ${getModelMethod}`);
            }
            
            // OPTIMIZATION: Check for cached working model first to avoid unnecessary API calls
            // This prevents rate limit issues from repeated model discovery
            const CACHE_KEY_WORKING_MODEL = 'gemini_working_model';
            const CACHE_KEY_AVAILABLE_MODELS = 'gemini_available_models';
            const CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
            
            let cachedWorkingModel: string | null = null;
            let availableModels: string[] = [];
            
            try {
                const cachedModelData = localStorage.getItem(CACHE_KEY_WORKING_MODEL);
                if (cachedModelData) {
                    const parsed = JSON.parse(cachedModelData);
                    const age = Date.now() - parsed.timestamp;
                    if (age < CACHE_EXPIRY_MS) {
                        cachedWorkingModel = parsed.model;
                        console.error(`✅ Using cached working model: ${cachedWorkingModel}`);
                        diagnosticLogger.info('Using cached working model', { model: cachedWorkingModel });
                    }
                }
                
                const cachedModelsData = localStorage.getItem(CACHE_KEY_AVAILABLE_MODELS);
                if (cachedModelsData) {
                    const parsed = JSON.parse(cachedModelsData);
                    const age = Date.now() - parsed.timestamp;
                    if (age < CACHE_EXPIRY_MS) {
                        availableModels = parsed.models || [];
                        console.error(`✅ Using cached available models (${availableModels.length} models)`);
                    }
                }
            } catch (cacheError: any) {
                console.error('⚠️ Cache read error (non-critical):', cacheError?.message);
            }
            
            // Only make API calls if we don't have cached data
            if (!cachedWorkingModel && availableModels.length === 0) {
                console.error('🔵 No cache found - discovering models via API (this happens once per day)...');
                diagnosticLogger.info('Discovering models via API (no cache)');
                
                // Try direct REST API call to list models (only if no cache)
                try {
                    const listModelsUrl = `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`;
                    const response = await fetch(listModelsUrl);
                    const data = await response.json();
                    
                    if (response.ok && data?.models) {
                        // Extract model names - they come in format "models/gemini-pro" or just "gemini-pro"
                        availableModels = data.models
                            .map((m: any) => {
                                const name = m.name || m.displayName || String(m);
                                return name.replace(/^models\//, '');
                            })
                            .filter((name: string) => name && name.toLowerCase().includes('gemini'));
                        
                        // Cache the available models
                        try {
                            localStorage.setItem(CACHE_KEY_AVAILABLE_MODELS, JSON.stringify({
                                models: availableModels,
                                timestamp: Date.now()
                            }));
                        } catch (e) {
                            console.error('⚠️ Failed to cache models:', e);
                        }
                        
                        console.error(`🔵 Found ${availableModels.length} available Gemini models via API`);
                    }
                } catch (directApiError: any) {
                    console.error('⚠️ Direct API test exception (non-critical):', directApiError?.message);
                }
            } else {
                console.error('✅ Using cached model data - skipping API discovery calls');
            }
            
            // Call using stored reference
            // Try multiple model names - start with most stable/universal models first
            // The error suggests v1beta API doesn't support newer models - try older ones first
            // If we got available models from listModels, try those first
            const defaultModelsToTry = [
                'gemini-pro',            // Original stable model (most likely to work with any API key)
                'gemini-1.5-pro',        // Older but stable
                'gemini-1.5-flash',      // Flash version
                'gemini-2.0-flash-exp',  // Latest experimental
                'gemini-2.5-flash',      // Latest stable flash
                'gemini-2.5-pro'         // Latest stable pro
            ];
            
            // If we got available models, prioritize those
            const modelNamesToTry = availableModels.length > 0 
                ? [...availableModels, ...defaultModelsToTry.filter(m => !availableModels.includes(m))]
                : defaultModelsToTry;
            
            let lastError: any = null;
            let successfulModel: string | null = null;
            
            // If we have a cached working model, use it directly (skip discovery)
            if (cachedWorkingModel) {
                try {
                    console.error(`✅ Using cached working model: ${cachedWorkingModel}`);
                    model = getModelMethod.call(genAI, { model: cachedWorkingModel });
                    successfulModel = cachedWorkingModel;
                    diagnosticLogger.info(`✅ Using cached model: ${cachedWorkingModel}`, {
                        modelType: typeof model,
                        modelExists: !!model
                    });
                } catch (cachedModelError: any) {
                    console.error(`⚠️ Cached model ${cachedWorkingModel} failed, clearing cache and discovering...`);
                    // Clear invalid cache
                    try {
                        localStorage.removeItem(CACHE_KEY_WORKING_MODEL);
                    } catch (e) {
                        // Ignore
                    }
                    cachedWorkingModel = null; // Fall through to discovery
                    model = null; // Reset model so we try discovery
                }
            }
            
            // Only try models if we don't have a working cached model
            if (!model) {
                console.error(`🔵 Will try ${modelNamesToTry.length} models:`, modelNamesToTry);
                
                for (const modelName of modelNamesToTry) {
                    try {
                        diagnosticLogger.info(`Trying model: ${modelName}`);
                        console.error(`🔵 Attempting to create model: ${modelName}`);
                        model = getModelMethod.call(genAI, { model: modelName });
                        successfulModel = modelName;
                        
                        // Cache the working model for future use
                        try {
                            localStorage.setItem(CACHE_KEY_WORKING_MODEL, JSON.stringify({
                                model: modelName,
                                timestamp: Date.now()
                            }));
                            console.error(`✅ Cached working model: ${modelName}`);
                        } catch (e) {
                            console.error('⚠️ Failed to cache working model:', e);
                        }
                        
                        diagnosticLogger.info(`✅ Successfully created model: ${modelName}`, {
                            modelType: typeof model,
                            modelExists: !!model
                        });
                        console.error(`✅ Model ${modelName} created successfully!`);
                        break; // Success, exit loop
                    } catch (modelError: any) {
                        lastError = modelError;
                        const errorMsg = modelError?.message || 'Unknown error';
                        diagnosticLogger.info(`❌ Model ${modelName} failed`, {
                            errorMessage: errorMsg,
                            errorName: modelError?.name,
                            errorCode: modelError?.code
                        });
                        console.error(`❌ Model ${modelName} failed: ${errorMsg}`);
                        
                        // Check if error mentions v1beta - this is the root cause
                        if (errorMsg.includes('v1beta')) {
                            console.error('⚠️ ERROR: Library is using v1beta API, but models require v1 API!');
                            diagnosticLogger.error('v1beta API version issue detected', {
                                error: errorMsg,
                                suggestion: 'Library may need update or API version configuration'
                            });
                        }
                        // Continue to next model
                    }
                }
            }
            
            if (!model) {
                // All models failed - provide detailed error
                const errorDetails = {
                    lastError: lastError?.message,
                    lastErrorName: lastError?.name,
                    lastErrorCode: lastError?.code,
                    modelsTried: modelNamesToTry,
                    availableModelsFromList: availableModels,
                    apiKeyLength: apiKey?.length,
                    apiKeyPrefix: apiKey ? apiKey.substring(0, 10) : 'none',
                    apiVersionIssue: lastError?.message?.includes('v1beta') ? 'Library using v1beta API, models require v1 API' : null
                };
                diagnosticLogger.error('❌ All model names failed', errorDetails);
                
                const errorMessage = lastError?.message?.includes('v1beta')
                    ? `API Version Issue: Library is using v1beta API, but models require v1 API. This is likely a library version or configuration issue. Last error: ${lastError?.message}`
                    : `All model names failed. Last error: ${lastError?.message || 'Unknown'}. Models tried: ${modelNamesToTry.join(', ')}`;
                
                throw new Error(errorMessage);
            }
            
            console.error(`✅ Using model: ${successfulModel}`);
            diagnosticLogger.info('Model created successfully', {
                modelType: typeof model,
                modelExists: !!model
            });
        } catch (modelError: any) {
            diagnosticLogger.error('❌ Model creation failed', {
                errorMessage: modelError?.message,
                errorStack: modelError?.stack,
                errorName: modelError?.name,
                error: modelError,
                genAIAtError: genAI,
                genAITypeAtError: typeof genAI
            });
            return `Failed to create model: ${modelError?.message || 'Unknown error'}`;
        }
        
        diagnosticLogger.info('✅ All diagnostic checks passed');
        
        // Now proceed with the actual API call using the validated genAI and model
        const clientContext = (clientAge || annualDistribution || riskTolerance) ? `
    **Client Context:**
    - Client Age: ${clientAge || 'Not Provided'}
    - Desired Annual Distribution: ${formatCurrency(annualDistribution) || 'Not Provided'}
    - Risk Tolerance: ${riskTolerance || 'Not Provided'}
    
    Incorporate this context into your analysis, particularly when discussing risk and suitability.` : '';

        const returnLabel = reportData.portfolio.returnType === 'IRR' ? 'IRR' : 'Return';
        const annualizedReturnLabel = `Annualized ${returnLabel}`;

        const prompt = `
    You are an experienced fiduciary financial adviser at Auour Investments writing an executive summary for an investment proposal.

    Write a concise executive summary comparing a proposed investment portfolio to its stated benchmark using the provided historical results and risk metrics.

    REQUIREMENTS:
    - Do NOT include greetings, salutations, or meta commentary
    - Begin directly with substantive analysis
    - Limit to 2 to 3 short paragraphs (150 to 200 words total)
    - Write in clear, client-appropriate language (intelligent but not technical)
    - Do not reference raw tables or specific data inputs explicitly

    FOCUS AREAS (IN ORDER OF PRIORITY):
    1. Emphasize how the proposed portfolio improves the *quality* of returns relative to the benchmark, not just headline performance.
    2. Highlight Auour's core strengths:
       - Mitigation of large drawdowns
       - Improved downside resilience across market regimes
       - Competitive long-term return potential with lower volatility
    3. When relevant, explain how reduced drawdowns and volatility improve investor outcomes through:
       - Better compounding
       - Higher likelihood of staying invested during market stress
    4. If Monte Carlo results are included, frame them in terms of:
       - Improved range of outcomes
       - Reduced probability of adverse scenarios
    5. If other non-Auour strategies are present, integrate them naturally, while clearly attributing portfolio structure, risk management philosophy, and outcome orientation to Auour Investments.

    TONE & POSITIONING:
    - Fiduciary, disciplined, and risk-aware
    - Outcome-focused rather than product-focused
    - Confident but not promotional
    - Emphasize process and consistency over short-term market timing

    Do not overstate certainty. Do not make predictions. Focus on historical evidence and portfolio construction logic.

    ${clientContext}

    **Proposed Portfolio: ${reportData.portfolio.name}**
    - 1-Year ${returnLabel}: ${formatPercent(reportData.portfolio.returns['1 Year'])}
    - 3-Year ${annualizedReturnLabel}: ${formatPercent(reportData.portfolio.returns['3 Year'])}
    - 5-Year ${annualizedReturnLabel}: ${formatPercent(reportData.portfolio.returns['5 Year'])}
    - 10-Year ${annualizedReturnLabel}: ${formatPercent(reportData.portfolio.returns['10 Year'])}
    - Annualized Volatility: ${formatPercent(reportData.portfolio.volatility)}
    - Percent of Positive Rolling 12-Month Periods: ${reportData.portfolio.rollingReturnsAnalysis.percentPositive.toFixed(1)}%
    - Top 3 Drawdowns: 
        1. ${reportData.portfolio.drawdowns.length > 0 ? formatDrawdown(reportData.portfolio.drawdowns[0]) : 'N/A'}
        2. ${reportData.portfolio.drawdowns.length > 1 ? formatDrawdown(reportData.portfolio.drawdowns[1]) : 'N/A'}
        3. ${reportData.portfolio.drawdowns.length > 2 ? formatDrawdown(reportData.portfolio.drawdowns[2]) : 'N/A'}

    **Benchmark: ${reportData.benchmark.name}**
    - 1-Year ${returnLabel}: ${formatPercent(reportData.benchmark.returns['1 Year'])}
    - 3-Year ${annualizedReturnLabel}: ${formatPercent(reportData.benchmark.returns['3 Year'])}
    - 5-Year ${annualizedReturnLabel}: ${formatPercent(reportData.benchmark.returns['5 Year'])}
    - 10-Year ${annualizedReturnLabel}: ${formatPercent(reportData.benchmark.returns['10 Year'])}
    - Annualized Volatility: ${formatPercent(reportData.benchmark.volatility)}
    - Percent of Positive Rolling 12-Month Periods: ${reportData.benchmark.rollingReturnsAnalysis.percentPositive.toFixed(1)}%
    - Top 3 Drawdowns: 
        1. ${reportData.benchmark.drawdowns.length > 0 ? formatDrawdown(reportData.benchmark.drawdowns[0]) : 'N/A'}
        2. ${reportData.benchmark.drawdowns.length > 1 ? formatDrawdown(reportData.benchmark.drawdowns[1]) : 'N/A'}
        3. ${reportData.benchmark.drawdowns.length > 2 ? formatDrawdown(reportData.benchmark.drawdowns[2]) : 'N/A'}

    Generate the executive summary following the requirements and focus areas above. Start directly with the analysis content - no greetings or introductory sentences.
        `;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text();
        } catch (error: any) {
            diagnosticLogger.error("Error generating summary", {
                errorMessage: error?.message,
                errorStack: error?.stack,
                errorCode: error?.error?.code || error?.status,
                error: error
            });
            
            // Provide user-friendly error messages based on error type
            if (error?.error?.code === 503 || error?.status === 503 || error?.message?.includes('overloaded')) {
                return "The AI service is currently overloaded. Please try again in a few moments. This is a temporary issue with Google's Gemini API service.";
            }
            
            if (error?.error?.code === 429 || error?.status === 429) {
                // Rate limit exceeded - provide helpful guidance
                const retryAfter = error?.error?.details?.[0]?.retryDelay || error?.headers?.['retry-after'] || 'a few minutes';
                return `Rate limit exceeded. The Gemini API has rate limits to prevent abuse. Please wait ${retryAfter} and try again. If this persists, you may need to check your API quota in Google Cloud Console.`;
            }
            
            if (error?.error?.code === 401 || error?.status === 401) {
                return "Authentication failed. Please check that the API key is configured correctly.";
            }
            
            if (error?.error?.code === 400 || error?.status === 400) {
                return "Invalid request. Please check the input data and try again.";
            }
            
            // Generic error message
            const errorMessage = error?.error?.message || error?.message || 'Unknown error';
            return `An error occurred while generating the AI summary: ${errorMessage}. Please try again later.`;
        }
    } catch (error: any) {
        diagnosticLogger.error('❌ Unexpected error in diagnostic checks', {
            errorMessage: error?.message,
            errorStack: error?.stack,
            errorName: error?.name,
            error: error
        });
        return `An unexpected error occurred: ${error?.message || 'Unknown error'}`;
    }
};
