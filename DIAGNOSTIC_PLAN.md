# Diagnostic Plan for Gemini AI Service Error

## Error: "(intermediate value).getGenerativeModel is not a function"

## Potential Root Causes:
1. **API Key Not Injected at Runtime** - `window.__ENV__.VITE_GEMINI_API_KEY` is still placeholder
2. **Import Failure** - `GoogleGenerativeAI` class not imported correctly in production bundle
3. **Constructor Failure** - Invalid API key causing constructor to return unexpected value
4. **Bundling Issue** - Vite/Rollup not properly including the Google Generative AI library
5. **Timing Issue** - `config.js` not loaded before the service tries to use it

## Diagnostic Steps:

### Step 1: Add Comprehensive Logging
Add detailed console logs at each critical point:
- Check if `window.__ENV__` exists
- Check if API key is retrieved
- Check if `GoogleGenerativeAI` is imported
- Check if constructor succeeds
- Check if instance has `getGenerativeModel` method

### Step 2: Verify Runtime Injection
- Check Cloud Run logs to see if entrypoint script replaced the placeholder
- Verify `config.js` is loaded in browser
- Check browser console for `window.__ENV__` value

### Step 3: Test Import in Browser Console
- Manually test: `import('@google/generative-ai').then(m => console.log(m.GoogleGenerativeAI))`
- Check if the module is available in the bundle

### Step 4: Check Bundle Contents
- Verify `@google/generative-ai` is included in production bundle
- Check for any tree-shaking issues

### Step 5: Verify Environment Variable
- Check Cloud Run service has `VITE_GEMINI_API_KEY` environment variable set
- Verify the secret is accessible

## Implementation:
Add diagnostic code that will:
1. Log all intermediate values
2. Catch and log any errors at each step
3. Provide clear error messages indicating which step failed
4. Test the import separately before using it

