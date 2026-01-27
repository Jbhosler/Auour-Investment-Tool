# Frontend Deployment Script for Cloud Run
# This script uses Cloud Build to build and deploy the frontend

$PROJECT_ID = "investment-proposal-prod"
$REGION = "us-central1"
$SERVICE_NAME = "frontend"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Frontend Deployment to Cloud Run" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Set the project
Write-Host "Setting GCP project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Verify Cloud Build API is enabled
Write-Host ""
Write-Host "Verifying Cloud Build API is enabled..." -ForegroundColor Yellow
gcloud services enable cloudbuild.googleapis.com 2>&1 | Out-Null

# Verify Secret Manager access for Gemini API key
Write-Host ""
Write-Host "Checking for VITE_GEMINI_API_KEY_SECRET..." -ForegroundColor Yellow
try {
    $secrets = gcloud secrets list --format="value(name)" 2>&1
    if ($secrets -match "VITE_GEMINI_API_KEY_SECRET") {
        Write-Host "✅ VITE_GEMINI_API_KEY_SECRET found" -ForegroundColor Green
    } else {
        Write-Host "⚠️  WARNING: VITE_GEMINI_API_KEY_SECRET not found!" -ForegroundColor Yellow
        Write-Host "   The build will fail if this secret doesn't exist." -ForegroundColor Yellow
        Write-Host "   Create it with:" -ForegroundColor Yellow
        Write-Host "   echo -n 'YOUR_GEMINI_API_KEY' | gcloud secrets create VITE_GEMINI_API_KEY_SECRET --data-file=-" -ForegroundColor Gray
        Write-Host ""
        $continue = Read-Host "Continue anyway? (y/n)"
        if ($continue -ne "y") {
            exit 1
        }
    }
} catch {
    Write-Host "⚠️  Could not verify secrets. Continuing..." -ForegroundColor Yellow
}

# Submit Cloud Build
Write-Host ""
Write-Host "Submitting Cloud Build job..." -ForegroundColor Yellow
Write-Host "This will:" -ForegroundColor Gray
Write-Host "  1. Build the Docker image with Vite" -ForegroundColor Gray
Write-Host "  2. Push to Container Registry" -ForegroundColor Gray
Write-Host "  3. Deploy to Cloud Run" -ForegroundColor Gray
Write-Host ""
Write-Host "This may take 5-10 minutes..." -ForegroundColor Gray
Write-Host ""

# Submit the build using cloudbuild.yaml
# Note: $PROJECT_NUMBER is automatically available as a Cloud Build substitution
gcloud builds submit --config cloudbuild.yaml

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Deployment Successful!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    
    # Get the service URL
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Frontend URL: $SERVICE_URL" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Open in browser:" -ForegroundColor Yellow
        Write-Host "  $SERVICE_URL" -ForegroundColor Gray
        Write-Host ""
    } else {
        Write-Host "⚠️  Could not retrieve frontend URL. Check Cloud Run console." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "ERROR: Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Common issues:" -ForegroundColor Yellow
    Write-Host "  1. VITE_GEMINI_API_KEY_SECRET not found or not accessible" -ForegroundColor Gray
    Write-Host "  2. Cloud Build service account needs Secret Manager access" -ForegroundColor Gray
    Write-Host "  3. Check build logs in GCP Console" -ForegroundColor Gray
    Write-Host ""
    exit 1
}
