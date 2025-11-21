# Diagnostic Plan Summary

## What We're Diagnosing
Error: `"(intermediate value).getGenerativeModel is not a function"`

## Diagnostic Code Added
The `generateProposalSummary` function now includes comprehensive logging that will:

1. **Verify config.js is loaded** - Checks if `window.__ENV__` exists
2. **Check API key retrieval** - Logs both runtime and build-time key sources
3. **Validate GoogleGenerativeAI import** - Verifies the class is imported correctly
4. **Test constructor** - Attempts to create instance and catches any errors
5. **Verify getGenerativeModel method** - Checks if the method exists before calling
6. **Test model creation** - Attempts to create the model

## How to Use

### Step 1: Build and Deploy
```bash
cd frontend
npm run build
cd ..
gcloud builds submit --config frontend/cloudbuild.yaml
```

### Step 2: Test in Browser
1. Open the deployed frontend URL
2. Open browser DevTools Console (F12)
3. Try to generate an AI summary
4. Look for the diagnostic group: `🔍 Gemini Service Diagnostic`

### Step 3: Review Diagnostic Output
The console will show:
- ✅ Green checkmarks for successful steps
- ❌ Red X marks for failed steps
- Detailed information about each step

### Step 4: Check Cloud Run Logs
```bash
gcloud run services logs read frontend --region us-central1 --limit 50
```
Look for entrypoint script output showing:
- Whether API key replacement succeeded
- The first 100 chars of config.js after replacement

## What to Look For

### If Step 0 fails:
- `config.js` is not being loaded
- Check nginx configuration
- Verify config.js is in the dist folder

### If Step 1 fails:
- `window.__ENV__` doesn't exist
- config.js script not executed
- Check script loading order in index.html

### If Step 2 shows placeholder:
- API key not injected at runtime
- Check Cloud Run environment variable: `VITE_GEMINI_API_KEY`
- Check Cloud Run logs for entrypoint script errors
- Verify secret is accessible

### If Step 3 fails:
- `GoogleGenerativeAI` is not imported
- Check if `@google/generative-ai` is in node_modules
- Verify bundle includes the library
- May need to check Vite bundling configuration

### If Step 4 fails:
- Constructor is failing
- API key might be invalid format
- Check constructor error message

### If Step 5 fails:
- Instance created but missing `getGenerativeModel` method
- This indicates a bundling/import issue
- The library might be partially imported

## Expected Output (Success)
```
🔍 Gemini Service Diagnostic
  Step 0: ✅ config.js loaded
  Step 1: ✅ window.__ENV__ exists
  Step 2: ✅ API key retrieved (length: 39)
  Step 3: ✅ GoogleGenerativeAI imported (type: function)
  Step 4: ✅ Instance created
  Step 5: ✅ getGenerativeModel method exists
  Step 6: ✅ Model created
✅ All diagnostic checks passed
```

## Next Steps After Diagnosis
Once we identify which step fails, we can:
1. Fix the specific issue
2. Remove diagnostic code
3. Deploy the fix

