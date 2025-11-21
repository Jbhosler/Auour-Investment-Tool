# Diagnosis Plan: "getGenerativeModel is not a function" Error

## Problem Statement
- **Error**: `(intermediate value).getGenerativeModel is not a function`
- **When**: When clicking "Generate Summary" button
- **Environment**: Production (Cloud Run deployment)
- **Observation**: No console logs appearing (diagnostic code not visible)

## System Architecture (from README)
1. **Runtime Injection**: API key injected at container startup via `docker-entrypoint.sh`
2. **Config Flow**: `public/config.js` → Docker entrypoint replaces placeholder → `window.__ENV__.VITE_GEMINI_API_KEY`
3. **Service Flow**: `geminiService.ts` reads from `window.__ENV__` → Creates `GoogleGenerativeAI` instance → Calls `getGenerativeModel()`

## Hypothesis Testing Plan

### Hypothesis 1: API Key Not Injected Correctly
**Test**: Verify the API key is actually in `config.js` at runtime
- **Method**: 
  1. Open deployed frontend in browser
  2. Open DevTools Console
  3. Type: `window.__ENV__`
  4. Check if `VITE_GEMINI_API_KEY` exists and is not "REPLACE_WITH_API_KEY"
- **Expected**: Should show object with `VITE_GEMINI_API_KEY` containing actual key (39 chars)
- **If fails**: Check Cloud Run logs for entrypoint script output

### Hypothesis 2: Import/Bundling Issue
**Test**: Verify `GoogleGenerativeAI` is imported correctly in production bundle
- **Method**:
  1. In browser console, check if module is available
  2. Type: `import('@google/generative-ai').then(m => console.log('GoogleGenerativeAI:', m.GoogleGenerativeAI, 'Type:', typeof m.GoogleGenerativeAI))`
  3. Check Network tab for bundle files - verify `@google/generative-ai` is included
- **Expected**: Should log the class constructor function
- **If fails**: Bundling issue - library not included or tree-shaken incorrectly

### Hypothesis 3: Constructor Returns Unexpected Value
**Test**: Verify the constructor actually creates a valid instance
- **Method**: Add logging BEFORE calling getGenerativeModel to check:
  - What `genAI` actually is
  - What type it is
  - What methods it has
- **Expected**: `genAI` should be an object with `getGenerativeModel` method
- **If fails**: Constructor is failing silently or returning wrong type

### Hypothesis 4: Console Logs Being Suppressed
**Test**: Verify diagnostic code is actually running
- **Method**: 
  1. Add a simple `console.log('FUNCTION CALLED')` at the very start of the function
  2. Check if ANY logs appear when clicking button
  3. Check console filter settings (make sure "All levels" is selected)
- **Expected**: Should see "FUNCTION CALLED" immediately
- **If fails**: Function not being called, or console filtered

### Hypothesis 5: Error Happening Before Diagnostic Code
**Test**: Check if error is thrown during import or module loading
- **Method**: 
  1. Check browser console for any errors on page load
  2. Check Network tab for failed module loads
  3. Check if error stack trace shows where it's coming from
- **Expected**: Should see where in the code the error originates
- **If fails**: Error might be in a different file or during bundle initialization

## Diagnostic Steps (In Order)

### Step 1: Verify Function is Called
- Add `console.log('🚀 generateProposalSummary START')` at function entry
- Click "Generate Summary"
- **Check**: Do you see this log? If NO → function not being called or console filtered

### Step 2: Verify config.js is Loaded
- In browser console: `console.log('window.__ENV__:', window.__ENV__)`
- **Check**: Does it exist? What does it contain?
- **If missing**: config.js not loading or entrypoint script failed

### Step 3: Verify API Key Value
- In browser console: `console.log('API Key:', window.__ENV__?.VITE_GEMINI_API_KEY)`
- **Check**: 
  - Is it undefined?
  - Is it "REPLACE_WITH_API_KEY"?
  - What is its length? (should be 39)
- **If wrong**: Runtime injection failed

### Step 4: Verify Import Works
- In browser console: Test dynamic import
- **Check**: Can we import the module? What does it export?
- **If fails**: Bundling issue

### Step 5: Test Constructor in Console
- In browser console: Manually test creating instance
- `import('@google/generative-ai').then(m => { const gen = new m.GoogleGenerativeAI('test'); console.log('Instance:', gen, 'Methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(gen))); })`
- **Check**: Does constructor work? What methods does instance have?
- **If fails**: Import or constructor issue

### Step 6: Check Cloud Run Logs
- Run: `gcloud run services logs read frontend --region us-central1 --limit 50`
- **Check**: 
  - Does entrypoint script show "SUCCESS: Replacement completed"?
  - What is the API key length shown? (should be 39, not 16)
  - Any errors in entrypoint script?
- **If wrong**: Environment variable not set correctly in Cloud Run

### Step 7: Check Bundle Contents
- Inspect the production bundle in browser DevTools → Sources
- **Check**: Is `@google/generative-ai` code present in the bundle?
- **If missing**: Tree-shaking removed it or bundling issue

## Root Cause Analysis Questions

1. **When did this start?** 
   - User said "it was working yesterday" - what changed?

2. **Is it environment-specific?**
   - Does it work locally?
   - Only fails in production?

3. **What's the exact error context?**
   - Full error message
   - Stack trace
   - Line number in minified code

4. **What changed recently?**
   - Recent deployments?
   - Code changes?
   - Dependency updates?

## Implementation Strategy

### Phase 1: Non-Invasive Checks (No Code Changes)
1. Check browser console for `window.__ENV__`
2. Check Cloud Run logs for entrypoint script
3. Test dynamic import in browser console
4. Check bundle contents in DevTools

### Phase 2: Minimal Diagnostic Code
1. Add single console.log at function start
2. Add check for window.__ENV__ before using it
3. Add try-catch around constructor
4. Add explicit method check before calling

### Phase 3: Fix Based on Findings
- Only after we identify the root cause
- Make targeted fix
- Test and verify

## Success Criteria
- Diagnostic logs appear in console
- Root cause identified
- Fix implemented and verified
- Error resolved

## Notes
- User said "no errors in console" - this suggests diagnostic code might not be running
- Error message suggests the issue is at the `getGenerativeModel` call
- Need to verify the deployed code actually has the diagnostic logging

