# Diagnostic script to identify why the Gemini API key is not being injected
# This checks each step in the chain: Secret -> Cloud Run -> Entrypoint -> config.js

$PROJECT_ID = "investment-proposal-prod"
$REGION = "us-central1"
$SERVICE_NAME = "frontend"
$SECRET_NAME = "VITE_GEMINI_API_KEY_SECRET"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "API Key Injection Diagnostic" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Set the project
gcloud config set project $PROJECT_ID 2>&1 | Out-Null

Write-Host "Step 1: Checking if secret exists..." -ForegroundColor Yellow
$secretCheck = gcloud secrets describe $SECRET_NAME 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Secret exists" -ForegroundColor Green
    $secretInfo = gcloud secrets describe $SECRET_NAME --format="json" | ConvertFrom-Json
    Write-Host "   Latest version: $($secretInfo.latestVersion)" -ForegroundColor Gray
} else {
    Write-Host "❌ Secret does NOT exist!" -ForegroundColor Red
    Write-Host "   This is the root cause. Create the secret first." -ForegroundColor Yellow
    exit 1
}
Write-Host ""

Write-Host "Step 2: Checking Cloud Run service configuration..." -ForegroundColor Yellow
$serviceConfig = gcloud run services describe $SERVICE_NAME --region $REGION --format="json" 2>&1 | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to get service configuration" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Service exists: $($serviceConfig.status.url)" -ForegroundColor Green
Write-Host ""

# Check environment variables and secrets
Write-Host "Step 3: Checking environment variables and secrets..." -ForegroundColor Yellow
$container = $serviceConfig.spec.template.spec.containers[0]
$hasSecret = $false
$hasEnvVar = $false

if ($container.env) {
    foreach ($env in $container.env) {
        if ($env.name -eq "VITE_GEMINI_API_KEY") {
            if ($env.valueFrom -and $env.valueFrom.secretKeyRef) {
                $hasSecret = $true
                Write-Host "✅ Secret is mounted as environment variable" -ForegroundColor Green
                Write-Host "   Secret name: $($env.valueFrom.secretKeyRef.name)" -ForegroundColor Gray
                Write-Host "   Secret key: $($env.valueFrom.secretKeyRef.key)" -ForegroundColor Gray
                Write-Host "   Secret version: $($env.valueFrom.secretKeyRef.version)" -ForegroundColor Gray
            } elseif ($env.value) {
                $hasEnvVar = $true
                Write-Host "⚠️  VITE_GEMINI_API_KEY is set as plain text (not from secret)" -ForegroundColor Yellow
            } else {
                Write-Host "❌ VITE_GEMINI_API_KEY is defined but has no value or source!" -ForegroundColor Red
            }
        }
    }
}

if (-not $hasSecret -and -not $hasEnvVar) {
    Write-Host "❌ VITE_GEMINI_API_KEY is NOT configured in Cloud Run!" -ForegroundColor Red
    Write-Host "   This is the problem. The secret exists but isn't mounted." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "   The cloudbuild.yaml should use:" -ForegroundColor Cyan
    Write-Host "     --update-secrets VITE_GEMINI_API_KEY=$SECRET_NAME:latest" -ForegroundColor White
} else {
    Write-Host ""
}
Write-Host ""

Write-Host "Step 4: Checking Cloud Run logs for entrypoint script output..." -ForegroundColor Yellow
Write-Host "   (This will show the last 50 log entries from the entrypoint script)" -ForegroundColor Gray
Write-Host ""

$logs = gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND textPayload=~'Entrypoint Script'" --limit 50 --format="value(textPayload,jsonPayload.message)" 2>&1

if ($logs) {
    Write-Host "Recent entrypoint script logs:" -ForegroundColor Cyan
    $logs | Select-Object -First 20 | ForEach-Object {
        Write-Host "   $_" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  No entrypoint script logs found" -ForegroundColor Yellow
    Write-Host "   This might mean the script isn't running or logs aren't being captured" -ForegroundColor Gray
}
Write-Host ""

Write-Host "Step 5: Checking for VITE_GEMINI_API_KEY in logs..." -ForegroundColor Yellow
$keyLogs = gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=$SERVICE_NAME AND (textPayload=~'VITE_GEMINI_API_KEY' OR jsonPayload.message=~'VITE_GEMINI_API_KEY')" --limit 20 --format="value(textPayload,jsonPayload.message)" 2>&1

if ($keyLogs) {
    Write-Host "Recent API key related logs:" -ForegroundColor Cyan
    $keyLogs | Select-Object -First 10 | ForEach-Object {
        # Redact actual API key values for security
        $safeLog = $_ -replace 'AIzaSy[A-Za-z0-9_-]{30,}', 'AIzaSy[REDACTED]'
        Write-Host "   $safeLog" -ForegroundColor Gray
    }
} else {
    Write-Host "⚠️  No API key related logs found" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Step 6: Manual verification steps..." -ForegroundColor Yellow
Write-Host ""
Write-Host "To verify what's actually being served, open your browser console and run:" -ForegroundColor Cyan
Write-Host "   window.__DIAGNOSTICS__.checkConfig()" -ForegroundColor White
Write-Host ""
Write-Host "Or check the actual config.js file being served:" -ForegroundColor Cyan
Write-Host "   Open: $($serviceConfig.status.url)/config.js" -ForegroundColor White
Write-Host "   (This should show the actual API key, not 'REPLACE_WITH_API_KEY')" -ForegroundColor Gray
Write-Host ""

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

if (-not $hasSecret) {
    Write-Host "❌ ROOT CAUSE: Secret is not mounted in Cloud Run service" -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix: Update cloudbuild.yaml to ensure --update-secrets is used correctly" -ForegroundColor Yellow
    Write-Host "   The deployment step should include:" -ForegroundColor Cyan
    Write-Host "     --update-secrets VITE_GEMINI_API_KEY=$SECRET_NAME:latest" -ForegroundColor White
} else {
    Write-Host "✅ Secret is properly configured" -ForegroundColor Green
    Write-Host ""
    Write-Host "If the API key still isn't working, check:" -ForegroundColor Yellow
    Write-Host "   1. Cloud Run logs for entrypoint script errors" -ForegroundColor Gray
    Write-Host "   2. The actual config.js file being served (see Step 6)" -ForegroundColor Gray
    Write-Host "   3. Browser console for window.__ENV__ value" -ForegroundColor Gray
}

Write-Host ""
