# Pre-build Check Script
# This script checks for common issues before building

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Pre-Build Checks" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

$errors = 0

# Check 1: TypeScript type checking
Write-Host "1. Running TypeScript type check..." -ForegroundColor Yellow
npm run type-check
if ($LASTEXITCODE -ne 0) {
    Write-Host "   ❌ TypeScript errors found!" -ForegroundColor Red
    $errors++
} else {
    Write-Host "   ✅ TypeScript check passed" -ForegroundColor Green
}
Write-Host ""

# Check 2: Verify all imports can be resolved (basic check)
Write-Host "2. Checking for missing component files..." -ForegroundColor Yellow
$missingFiles = @()

# Check for commonly imported components
$componentsToCheck = @(
    "components/AccountSelector.tsx",
    "components/HouseholdSummary.tsx",
    "components/UnifiedPageManager.tsx"
)

foreach ($component in $componentsToCheck) {
    if (-not (Test-Path $component)) {
        $missingFiles += $component
        Write-Host "   ❌ Missing: $component" -ForegroundColor Red
    }
}

if ($missingFiles.Count -eq 0) {
    Write-Host "   ✅ All component files exist" -ForegroundColor Green
} else {
    $errors++
}
Write-Host ""

# Check 3: Verify icon exports
Write-Host "3. Checking icon exports..." -ForegroundColor Yellow
$iconsFile = "components/icons/Icons.tsx"
if (Test-Path $iconsFile) {
    $iconsContent = Get-Content $iconsFile -Raw
    $requiredIcons = @("CheckIcon", "EditIcon", "TrashIcon", "PlusCircleIcon")
    $missingIcons = @()
    
    foreach ($icon in $requiredIcons) {
        if ($iconsContent -notmatch "export const $icon") {
            $missingIcons += $icon
            Write-Host "   ❌ Missing export: $icon" -ForegroundColor Red
        }
    }
    
    if ($missingIcons.Count -eq 0) {
        Write-Host "   ✅ All required icons are exported" -ForegroundColor Green
    } else {
        $errors++
    }
} else {
    Write-Host "   ❌ Icons file not found!" -ForegroundColor Red
    $errors++
}
Write-Host ""

# Summary
Write-Host "=========================================" -ForegroundColor Cyan
if ($errors -eq 0) {
    Write-Host "✅ All checks passed! Ready to build." -ForegroundColor Green
    Write-Host ""
    Write-Host "Run: npm run build" -ForegroundColor Yellow
    exit 0
} else {
    Write-Host "❌ Found $errors issue(s). Please fix before building." -ForegroundColor Red
    Write-Host ""
    Write-Host "Fix the issues above, then run this script again." -ForegroundColor Yellow
    exit 1
}
