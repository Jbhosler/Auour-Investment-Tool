# Deployment Instructions - Secondary Portfolio Feature

## Pre-Deployment Checklist

### 1. Set Up TICKER_API_KEY Secret

The secondary portfolio feature requires an Alpha Vantage API key. Set it up in Secret Manager:

```powershell
# Create the secret (you'll be prompted to enter the API key)
echo -n "YOUR_ALPHA_VANTAGE_API_KEY" | gcloud secrets create ticker-api-key --data-file=-

# Or if the secret already exists, add a new version:
echo -n "YOUR_ALPHA_VANTAGE_API_KEY" | gcloud secrets versions add ticker-api-key --data-file=-
```

**Get your Alpha Vantage API key:**
- Sign up at: https://www.alphavantage.co/support/#api-key
- Free tier allows 5 API calls per minute and 500 calls per day

### 2. Verify Database Schema

The database migration will run automatically on backend startup, but you can verify:

```powershell
# Connect to your Cloud SQL instance
gcloud sql connect investment-proposal-db --user=app_user

# In psql, check if the column exists:
\d proposals
# Should show: secondary_portfolio_config | jsonb
```

## Deployment Steps

### Step 1: Deploy Backend

```powershell
cd backend
.\deploy-backend.ps1
```

The script will:
- Build and push the Docker image
- Deploy to Cloud Run
- Automatically add TICKER_API_KEY from Secret Manager (if it exists)
- Connect to Cloud SQL

**Verify TICKER_API_KEY is set:**
```powershell
gcloud run services describe backend --region us-central1 --format="get(spec.template.spec.containers[0].env)"
```

You should see `TICKER_API_KEY` in the environment variables.

### Step 2: Deploy Frontend

The frontend uses Cloud Build (via `frontend/cloudbuild.yaml`). Deploy via:

**Option A: Trigger Cloud Build (if connected to GitHub)**
- Push your changes to the repository
- Cloud Build will automatically trigger and deploy

**Option B: Manual Cloud Build**
```powershell
cd frontend
gcloud builds submit --config cloudbuild.yaml
```

**Verify deployment:**
```powershell
gcloud run services describe frontend --region us-central1 --format="get(status.url)"
```

### Step 3: Test the Feature

1. Open your frontend URL
2. Navigate to Proposal Details form
3. Toggle "Compare Secondary Portfolio"
4. Add ticker symbols (e.g., AAPL, MSFT, GOOGL)
5. Set weights to total 100%
6. Generate report
7. Verify secondary portfolio appears in:
   - Performance Table (third column)
   - Growth Chart (green line)
   - Rolling Returns Chart (green bars)
   - Drawdown Table (third column)

## Troubleshooting

### Issue: "TICKER_API_KEY environment variable not set"

**Solution:**
1. Verify the secret exists:
   ```powershell
   gcloud secrets list | findstr ticker
   ```

2. If missing, create it:
   ```powershell
   echo -n "YOUR_API_KEY" | gcloud secrets create ticker-api-key --data-file=-
   ```

3. Redeploy backend:
   ```powershell
   cd backend
   .\deploy-backend.ps1
   ```

### Issue: "Alpha Vantage API rate limit exceeded"

**Solution:**
- Free tier: 5 calls/minute, 500 calls/day
- If you hit limits, wait or upgrade to a paid Alpha Vantage plan
- The diagnostic logger will show rate limit errors in Cloud Run logs

### Issue: Secondary portfolio not appearing in charts

**Check:**
1. Backend logs for errors:
   ```powershell
   gcloud run services logs read backend --region us-central1 --limit 50
   ```

2. Frontend console for API errors (check browser DevTools)

3. Verify ticker symbols are valid (use uppercase, e.g., AAPL not aapl)

### Issue: Database column missing

**Solution:**
The migration runs automatically on backend startup. Check logs:
```powershell
gcloud run services logs read backend --region us-central1 | findstr "secondary_portfolio_config"
```

You should see: `✅ Added secondary_portfolio_config column to proposals`

If not, manually add it:
```powershell
gcloud sql connect investment-proposal-db --user=app_user
# Then in psql:
ALTER TABLE proposals ADD COLUMN secondary_portfolio_config JSONB;
```

## Post-Deployment Verification

### 1. Check Backend Health
```powershell
$BACKEND_URL = (gcloud run services describe backend --region us-central1 --format="value(status.url)")
curl "$BACKEND_URL/health"
```

### 2. Check Diagnostic Logs
```powershell
# View recent Alpha Vantage API calls
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.message=~'Alpha Vantage'" --limit 20 --format json
```

### 3. Test Secondary Portfolio Endpoint
```powershell
# Test with a simple request (replace with your actual backend URL)
$body = @{
    tickers = @(@{ticker="AAPL"; weight=100})
    weights = @(100)
    primaryReturnsDateRange = @{
        startDate = "2020-01"
        endDate = "2024-12"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "$BACKEND_URL/api/secondary-portfolio" -Method POST -Body $body -ContentType "application/json"
```

## Monitoring

### Set Up Alerts

1. **Alpha Vantage API Errors:**
   ```powershell
   gcloud logging metrics create alpha-vantage-errors \
     --description="Alpha Vantage API errors" \
     --log-filter='resource.type="cloud_run_revision" AND jsonPayload.message=~"Alpha Vantage.*error"'
   ```

2. **Secondary Portfolio Failures:**
   ```powershell
   gcloud logging metrics create secondary-portfolio-failures \
     --description="Secondary portfolio fetch failures" \
     --log-filter='resource.type="cloud_run_revision" AND jsonPayload.message=~"fetchSecondaryPortfolioReturns.*failed"'
   ```

## Cost Considerations

- **Alpha Vantage Free Tier:** 5 calls/minute, 500 calls/day
- **Cloud Run:** Pay per request (minimal cost for API calls)
- **Cloud SQL:** No additional cost for JSONB column

**Estimated additional monthly cost:** $0-5 (depending on usage)

## Rollback Instructions

If you need to rollback:

1. **Remove TICKER_API_KEY from backend:**
   ```powershell
   gcloud run services update backend --region us-central1 --remove-env-vars TICKER_API_KEY
   ```

2. **Or redeploy previous version:**
   ```powershell
   gcloud run services update-traffic backend --region us-central1 --to-revisions PREVIOUS_REVISION=100
   ```

The feature will gracefully fail (users will see an error message) but won't break the app.
