# Pre-Build Checks

This document explains how to check for common build issues before deploying.

## Quick Check

Run the pre-build check script:

```powershell
.\check-before-build.ps1
```

This will:
1. ✅ Run TypeScript type checking
2. ✅ Verify all component files exist
3. ✅ Check that required icons are exported

## Manual Checks

### 1. TypeScript Type Checking

```powershell
npm run type-check
```

This will catch:
- Missing imports
- Type errors
- Unresolved module references

### 2. Local Build Test

```powershell
npm run build
```

This will:
- Catch build-time errors
- Verify all imports resolve
- Test the actual build process

### 3. Check Specific Issues

#### Missing Component Files
```powershell
# Check if commonly imported components exist
Test-Path components/AccountSelector.tsx
Test-Path components/HouseholdSummary.tsx
Test-Path components/UnifiedPageManager.tsx
```

#### Missing Icon Exports
```powershell
# Check Icons.tsx for required exports
Select-String -Path "components/icons/Icons.tsx" -Pattern "export const (CheckIcon|EditIcon|TrashIcon)"
```

## Recommended Workflow

Before deploying:

1. **Run pre-build checks:**
   ```powershell
   .\check-before-build.ps1
   ```

2. **If checks pass, test local build:**
   ```powershell
   npm run build
   ```

3. **If local build succeeds, deploy:**
   ```powershell
   gcloud builds submit --config cloudbuild.yaml --timeout=30m
   ```

## Common Issues to Watch For

### Missing Component Files
- `AccountSelector.tsx` - Used in `App.tsx`
- `HouseholdSummary.tsx` - Used in `App.tsx`
- `UnifiedPageManager.tsx` - Used in `AdminPanel.tsx`

### Missing Icon Exports
- `CheckIcon` - Used in `PdfPageManager.tsx`
- `EditIcon` - Used in `PageLibraryManager.tsx`
- `PencilIcon` - Should use `EditIcon` instead

### Import Errors
- Check that all imports match actual file names
- Verify exports match imports
- Ensure file extensions are correct (.tsx vs .ts)

## Integration with CI/CD

You can add these checks to your deployment process:

```yaml
# In cloudbuild.yaml, add a pre-build step:
steps:
  - name: 'node:18-alpine'
    entrypoint: 'npm'
    args: ['run', 'type-check']
    dir: 'frontend'
  
  - name: 'gcr.io/cloud-builders/docker'
    # ... rest of build steps
```
