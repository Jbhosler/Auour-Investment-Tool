# API Key Injection Diagnostic Plan

## Problem
The Gemini API key is not being injected into `config.js`. The frontend shows:
- `window.__ENV__` exists (config.js is loaded)
- `window.__ENV__.VITE_GEMINI_API_KEY` is either missing or contains `'REPLACE_WITH_API_KEY'`

## Chain of Execution

1. **Secret exists in Secret Manager** → `VITE_GEMINI_API_KEY_SECRET`
2. **Secret is mounted in Cloud Run** → As environment variable `VITE_GEMINI_API_KEY`
3. **Entrypoint script runs** → Reads `$VITE_GEMINI_API_KEY` and replaces placeholder in `config.js`
4. **Nginx serves config.js** → Frontend loads it and sets `window.__ENV__`
5. **Frontend code reads** → `window.__ENV__.VITE_GEMINI_API_KEY`

## Diagnostic Steps

### Step 1: Verify Secret Exists
```powershell
gcloud secrets describe VITE_GEMINI_API_KEY_SECRET
```

### Step 2: Check Cloud Run Service Configuration
```powershell
gcloud run services describe frontend --region us-central1 --format="yaml(spec.template.spec.containers[0].env)"
```

Look for:
- `VITE_GEMINI_API_KEY` should be listed
- It should have `valueFrom.secretKeyRef` (not `value`)

### Step 3: Check Cloud Run Logs
```powershell
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=frontend" --limit 50 --format json
```

Look for:
- "Entrypoint Script Starting"
- "VITE_GEMINI_API_KEY is set" or "WARNING: VITE_GEMINI_API_KEY environment variable is not set!"
- "SUCCESS: Replacement completed" or "ERROR: Replacement failed"

### Step 4: Check What's Actually Being Served
Open in browser:
- `https://[your-frontend-url]/config.js`
- Should show actual API key, not `REPLACE_WITH_API_KEY`

Or in browser console:
```javascript
window.__DIAGNOSTICS__.checkConfig()
console.log(window.__ENV__)
```

### Step 5: Verify Secret Permissions
```powershell
# Get project number
$PROJECT_NUMBER = gcloud projects describe investment-proposal-prod --format="value(projectNumber)"

# Check if service account has access
gcloud secrets get-iam-policy VITE_GEMINI_API_KEY_SECRET
```

The service account `$PROJECT_NUMBER-compute@developer.gserviceaccount.com` needs `roles/secretmanager.secretAccessor`.

## Common Issues

### Issue 1: Secret Not Mounted in Cloud Run
**Symptom:** `gcloud run services describe` shows no `VITE_GEMINI_API_KEY` in env vars
**Fix:** The `--update-secrets` in cloudbuild.yaml might not be working. Check:
- Secret name matches exactly: `VITE_GEMINI_API_KEY_SECRET`
- Format is correct: `VITE_GEMINI_API_KEY=VITE_GEMINI_API_KEY_SECRET:latest`

### Issue 2: Entrypoint Script Not Running
**Symptom:** No entrypoint script logs in Cloud Run logs
**Fix:** Check Dockerfile ENTRYPOINT is set correctly

### Issue 3: Secret Not Available to Entrypoint
**Symptom:** Logs show "WARNING: VITE_GEMINI_API_KEY environment variable is not set!"
**Fix:** 
- Verify secret is mounted (Step 2)
- Check service account permissions (Step 5)
- Verify secret exists and has a version

### Issue 4: Replacement Failing
**Symptom:** Logs show "ERROR: Replacement failed - placeholder still present!"
**Fix:** Check `sed -i` command works in Alpine Linux (should work, but verify)

### Issue 5: Wrong config.js Being Served
**Symptom:** `/config.js` shows placeholder but logs show replacement succeeded
**Fix:** Check nginx configuration and file paths

## Quick Fix Script

Run `diagnose-api-key.ps1` to automatically check all of the above.
