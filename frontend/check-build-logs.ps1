# Check the latest Cloud Build logs to see if the secret was passed

Write-Host "Checking latest Cloud Build logs..." -ForegroundColor Yellow
Write-Host ""

# Get the latest build ID
$buildId = gcloud builds list --limit=1 --format="value(id)" 2>&1

if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($buildId)) {
    Write-Host "ERROR: Could not get build ID" -ForegroundColor Red
    exit 1
}

Write-Host "Latest build ID: $buildId" -ForegroundColor Cyan
Write-Host ""
Write-Host "Checking for secret and Vite config output..." -ForegroundColor Yellow
Write-Host ""

# Get the build logs and search for relevant lines
$logs = gcloud builds log $buildId 2>&1

# Check for secret retrieval
Write-Host "=== Secret Retrieval ===" -ForegroundColor Cyan
$secretLines = $logs | Select-String -Pattern "GEMINI_KEY|secret|Secret Manager" -CaseSensitive:$false
if ($secretLines) {
    $secretLines | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  ⚠️  No secret-related logs found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Vite Config Output ===" -ForegroundColor Cyan
$viteLines = $logs | Select-String -Pattern "Vite config.*VITE_GEMINI_API_KEY" -CaseSensitive:$false
if ($viteLines) {
    $viteLines | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
    
    # Check if the key was available
    $hasKey = $viteLines | Select-String -Pattern "available: true" -CaseSensitive:$false
    $hasLength = $viteLines | Select-String -Pattern "length: [1-9]" -CaseSensitive:$false
    
    if ($hasKey -and $hasLength) {
        Write-Host ""
        Write-Host "  ✅ Vite received the API key during build" -ForegroundColor Green
    } else {
        Write-Host ""
        Write-Host "  ❌ Vite did NOT receive the API key (or it was empty)" -ForegroundColor Red
        Write-Host "  This means the secret wasn't passed correctly to the Docker build" -ForegroundColor Yellow
    }
} else {
    Write-Host "  ⚠️  No Vite config logs found" -ForegroundColor Yellow
    Write-Host "  This might mean the build failed before reaching the Vite build step" -ForegroundColor Gray
}

Write-Host ""
Write-Host "=== Docker Build Args ===" -ForegroundColor Cyan
$dockerLines = $logs | Select-String -Pattern "build-arg.*GEMINI|VITE_GEMINI" -CaseSensitive:$false
if ($dockerLines) {
    $dockerLines | ForEach-Object { Write-Host "  $_" -ForegroundColor Gray }
} else {
    Write-Host "  ⚠️  No Docker build-arg logs found" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Full build logs available at:" -ForegroundColor Yellow
Write-Host "  https://console.cloud.google.com/cloud-build/builds/$buildId" -ForegroundColor Cyan
Write-Host ""
