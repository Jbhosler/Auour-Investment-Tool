# Fix Secret Manager Permissions for Cloud Run
# This grants the Cloud Run service account access to the ticker-api-key secret

$PROJECT_ID = "investment-proposal-prod"
$PROJECT_NUMBER = "559675342331"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
$SECRET_NAME = "ticker-api-key"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Granting Secret Manager Permissions" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Setting GCP project to $PROJECT_ID..." -ForegroundColor Yellow
gcloud config set project $PROJECT_ID

Write-Host ""
Write-Host "Granting Secret Manager Secret Accessor role to Cloud Run service account..." -ForegroundColor Yellow
Write-Host "Service Account: $SERVICE_ACCOUNT" -ForegroundColor Gray
Write-Host "Secret: $SECRET_NAME" -ForegroundColor Gray
Write-Host ""

# Grant the Secret Manager Secret Accessor role
gcloud secrets add-iam-policy-binding $SECRET_NAME `
    --member="serviceAccount:$SERVICE_ACCOUNT" `
    --role="roles/secretmanager.secretAccessor"

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host "Permissions Granted Successfully!" -ForegroundColor Green
    Write-Host "=========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now redeploy the backend:" -ForegroundColor Yellow
    Write-Host "  cd backend" -ForegroundColor Gray
    Write-Host "  .\deploy-backend.ps1" -ForegroundColor Gray
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "ERROR: Failed to grant permissions!" -ForegroundColor Red
    Write-Host "Check the error messages above for details." -ForegroundColor Yellow
    exit 1
}
