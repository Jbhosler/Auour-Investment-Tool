# Backend Deployment Script for Cloud Run
# This script builds and deploys the backend to Google Cloud Run

$PROJECT_ID = "investment-proposal-prod"
$REGION = "us-central1"
$SERVICE_NAME = "backend"
$IMAGE_NAME = "gcr.io/$PROJECT_ID/$SERVICE_NAME"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Backend Deployment to Cloud Run" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Set the project
Write-Host "Setting GCP project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

# Build and push the Docker image
Write-Host ""
Write-Host "Building and pushing Docker image..." -ForegroundColor Yellow
Write-Host "This may take several minutes..." -ForegroundColor Gray
gcloud builds submit --tag $IMAGE_NAME

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "ERROR: Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Build completed successfully!" -ForegroundColor Green
Write-Host ""

# Deploy to Cloud Run
Write-Host "Deploying to Cloud Run..." -ForegroundColor Yellow
Write-Host ""

# Check if Cloud SQL instance exists and get connection name
$CLOUD_SQL_INSTANCE = ""
try {
    $instances = gcloud sql instances list --format="value(name)" 2>&1
    if ($instances) {
        $CLOUD_SQL_INSTANCE = $instances | Select-Object -First 1
        Write-Host "Found Cloud SQL instance: $CLOUD_SQL_INSTANCE" -ForegroundColor Green
    }
} catch {
    Write-Host "No Cloud SQL instance found or error checking instances" -ForegroundColor Yellow
}

# Build deployment command
# Note: PORT is automatically set by Cloud Run, don't include it
$deployCmd = "gcloud run deploy $SERVICE_NAME " +
    "--image $IMAGE_NAME " +
    "--platform managed " +
    "--region $REGION " +
    "--allow-unauthenticated " +
    "--set-env-vars `"NODE_ENV=production`" " +
    "--memory 512Mi " +
    "--cpu 1 " +
    "--min-instances 0 " +
    "--max-instances 10"

# Add Cloud SQL connection if instance exists
if ($CLOUD_SQL_INSTANCE) {
    $deployCmd += " --add-cloudsql-instances $CLOUD_SQL_INSTANCE"
    Write-Host "Will connect to Cloud SQL instance: $CLOUD_SQL_INSTANCE" -ForegroundColor Green
}

# Add DATABASE_URL secret if it exists
try {
    $secrets = gcloud secrets list --format="value(name)" 2>&1
    if ($secrets -match "database-url") {
        $deployCmd += " --set-secrets `"DATABASE_URL=database-url:latest`""
        Write-Host "Will use DATABASE_URL from Secret Manager" -ForegroundColor Green
    }
} catch {
    Write-Host "Note: DATABASE_URL secret not found. You may need to set it manually." -ForegroundColor Yellow
}

# Add TICKER_API_KEY secret if it exists (for Alpha Vantage)
try {
    $secrets = gcloud secrets list --format="value(name)" 2>&1
    if ($secrets -match "ticker-api-key") {
        $deployCmd += " --set-secrets `"TICKER_API_KEY=ticker-api-key:latest`""
        Write-Host "Will use TICKER_API_KEY from Secret Manager" -ForegroundColor Green
    } else {
        Write-Host "Note: TICKER_API_KEY secret not found. Secondary portfolio feature will not work." -ForegroundColor Yellow
        Write-Host "      Create it with: gcloud secrets create ticker-api-key --data-file=-" -ForegroundColor Yellow
    }
} catch {
    Write-Host "Note: TICKER_API_KEY secret not found. Secondary portfolio feature will not work." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Deployment command:" -ForegroundColor Cyan
Write-Host $deployCmd -ForegroundColor Gray
Write-Host ""

# Execute deployment
Invoke-Expression $deployCmd

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Deployment Successful!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    
    # Get the service URL
    $SERVICE_URL = gcloud run services describe $SERVICE_NAME --region $REGION --format="value(status.url)" 2>&1
    Write-Host "Backend URL: $SERVICE_URL" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Test the health endpoint:" -ForegroundColor Yellow
    Write-Host "  curl $SERVICE_URL/health" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Deployment failed!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    exit 1
}
