# API Key Deployment Fix - Revised Plan

## Problem
The secret `VITE_GEMINI_API_KEY_SECRET` exists in Google Secret Manager and was working before, but after recent deployments, the API key is not being injected into `config.js`.

## Root Cause Analysis

The issue is likely in how `--update-secrets` works in Cloud Build vs direct `gcloud run deploy` commands.

### Current Approach (Cloud Build)
```yaml
- '--update-secrets'
- 'VITE_GEMINI_API_KEY=VITE_GEMINI_API_KEY_SECRET:latest'
```

### Potential Issues

1. **`--update-secrets` may not work correctly in Cloud Build context**
   - Cloud Build might not have proper permissions to update secrets
   - The flag might be ignored or fail silently

2. **The `secretEnv` and `availableSecrets` sections are for Cloud Build, not Cloud Run**
   - These make the secret available to the build step itself
   - They don't mount the secret in the deployed Cloud Run service

3. **The secret might need to be set differently**
   - Direct `gcloud run deploy` uses `--set-secrets` (not `--update-secrets`)
   - Cloud Build might need a different approach

## Solution Options

### Option 1: Use `--set-secrets` instead of `--update-secrets`
Change the cloudbuild.yaml to use `--set-secrets` which explicitly sets the secret (rather than updating):

```yaml
- '--set-secrets'
- 'VITE_GEMINI_API_KEY=VITE_GEMINI_API_KEY_SECRET:latest'
```

### Option 2: Remove `secretEnv` and `availableSecrets` (they're not needed)
These sections are only needed if the Cloud Build step itself needs the secret. Since we're using runtime injection via entrypoint script, we don't need them:

```yaml
# Remove these sections - they're not needed for runtime injection
# secretEnv: ['_GEMINI_API_KEY']
# availableSecrets: ...
```

### Option 3: Use direct gcloud command instead of Cloud Build
Deploy directly using `gcloud run deploy` which has proven to work:

```bash
gcloud run deploy frontend \
  --image gcr.io/investment-proposal-prod/frontend:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 256Mi \
  --timeout 300 \
  --update-env-vars VITE_API_URL=https://backend-phd2mjs6qa-uc.a.run.app/api \
  --set-secrets VITE_GEMINI_API_KEY=VITE_GEMINI_API_KEY_SECRET:latest
```

## Recommended Fix

**Immediate fix:** Try Option 1 first (change `--update-secrets` to `--set-secrets`)

**If that doesn't work:** Use Option 3 (deploy directly with gcloud command) to verify the secret mounting works, then we can fix the Cloud Build approach.

## Verification Steps

After applying the fix:

1. **Check Cloud Run service configuration:**
   ```powershell
   gcloud run services describe frontend --region us-central1 --format="yaml(spec.template.spec.containers[0].env)"
   ```
   Should show `VITE_GEMINI_API_KEY` with `valueFrom.secretKeyRef`

2. **Check Cloud Run logs:**
   ```powershell
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=frontend" --limit 20
   ```
   Should show "VITE_GEMINI_API_KEY is set" from entrypoint script

3. **Check what's served:**
   Open `https://[frontend-url]/config.js` in browser
   Should show actual API key, not `REPLACE_WITH_API_KEY`
