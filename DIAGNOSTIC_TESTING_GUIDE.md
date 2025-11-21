# Diagnostic Testing Guide

## Overview
This document describes the diagnostic tests added to help identify why the "Generate Summary" button isn't working in production.

## Phase 1 Diagnostics Added

### 1. Page Load Diagnostics (`frontend/index.tsx`)
- **What it does**: Logs when the page starts loading and catches any global errors
- **What to look for**:
  - Console: `🚀🚀🚀 PAGE LOADING - index.tsx executing 🚀🚀🚀`
  - localStorage key: `page_load_start`
  - Any `global_error` or `unhandled_rejection` entries
  - `react_render_complete` or `react_render_error` entries

### 2. Module Load Diagnostics (`frontend/services/geminiService.ts`)
- **What it does**: Logs when the geminiService module is loaded
- **What to look for**:
  - Console: `📦📦📦 geminiService.ts MODULE LOADED 📦📦📦`
  - localStorage key: `gemini_service_module_loaded`

### 3. Component Render Diagnostics
- **App Component** (`frontend/App.tsx`):
  - Console: `🏠🏠🏠 App COMPONENT RENDERED 🏠🏠🏠`
  - localStorage key: `app_component_rendered`

- **AiSummary Component** (`frontend/components/AiSummary.tsx`):
  - Console: `🎨🎨🎨 AiSummary COMPONENT RENDERED 🎨🎨🎨`
  - localStorage key: `ai_summary_component_rendered`

### 4. Button Click Diagnostics (`frontend/components/AiSummary.tsx`)
- **What it does**: Alert and console log directly in the button's onClick handler (before calling handleGenerateSummary)
- **What to look for**:
  - Alert popup: "✅ BUTTON CLICKED - onClick handler is working!"
  - Console: `✅✅✅ BUTTON onClick FIRED - handler is wired correctly ✅✅✅`
  - localStorage key: `button_click_test`

### 5. Browser Console Utilities (`frontend/index.html`)
- **What it does**: Exposes diagnostic utilities to `window.__DIAGNOSTICS__`
- **Available methods**:
  - `window.__DIAGNOSTICS__.testDynamicImport()` - Tests dynamic import of @google/generative-ai
  - `window.__DIAGNOSTICS__.checkLocalStorage()` - Checks all localStorage diagnostic entries
  - `window.__DIAGNOSTICS__.checkConfig()` - Checks window.__ENV__ configuration
  - `window.__DIAGNOSTICS__.runAll()` - Runs all diagnostics

## How to Test

### Step 1: Open Browser DevTools
1. Open the deployed site: `https://frontend-559675342331.us-central1.run.app`
2. Open DevTools (F12)
3. Go to Console tab
4. Check for any red errors on page load

### Step 2: Check Page Load
Look for these console messages in order:
1. `🚀🚀🚀 PAGE LOADING - index.tsx executing 🚀🚀🚀`
2. `✅ React imports successful`
3. `✅ Root element found`
4. `✅ React root created`
5. `✅ React render called successfully`
6. `🏠🏠🏠 App COMPONENT RENDERED 🏠🏠🏠`
7. `📦📦📦 geminiService.ts MODULE LOADED 📦📦📦`
8. `🎨🎨🎨 AiSummary COMPONENT RENDERED 🎨🎨🎨`

**If any are missing**, note which one is the last to appear - that's where the failure is.

### Step 3: Check localStorage
In browser console, run:
```javascript
window.__DIAGNOSTICS__.checkLocalStorage()
```

This will show which diagnostic entries were successfully stored.

### Step 4: Test Button Click
1. Click the "Generate Summary" button
2. **Expected**: Alert popup appears saying "✅ BUTTON CLICKED - onClick handler is working!"
3. **If alert appears**: Button wiring is correct, issue is in handleGenerateSummary or generateProposalSummary
4. **If alert does NOT appear**: Button onClick handler is not wired correctly or React event system has issues

### Step 5: Test Dynamic Import (Phase 2)
In browser console, run:
```javascript
window.__DIAGNOSTICS__.testDynamicImport()
```

This will:
- Test if the dynamic import of `@google/generative-ai` works
- Show what the module contains
- Test if `GoogleGenerativeAI` class exists
- Test if `getGenerativeModel` method exists

**If this fails**, the issue is with the library bundling/loading.

### Step 6: Check Configuration
In browser console, run:
```javascript
window.__DIAGNOSTICS__.checkConfig()
```

This will show if `window.__ENV__` is loaded and if the API key is present.

## Interpreting Results

### Scenario 1: No logs appear at all
- **Possible causes**:
  - JavaScript is disabled
  - Console is filtered/hidden
  - Bundle is not loading
  - Network error loading scripts

### Scenario 2: Page load logs appear, but module logs don't
- **Possible causes**:
  - Module import error
  - Circular dependency
  - Build issue with geminiService.ts

### Scenario 3: All logs appear, but button click alert doesn't
- **Possible causes**:
  - Button onClick handler not wired
  - React event system issue
  - Button is disabled
  - CSS z-index issue (button not clickable)

### Scenario 4: Button alert appears, but handleGenerateSummary logs don't
- **Possible causes**:
  - Error in handleGenerateSummary before logging
  - React re-render issue
  - Event propagation stopped

### Scenario 5: handleGenerateSummary logs appear, but generateProposalSummary logs don't
- **Possible causes**:
  - Function not being called
  - Import error with geminiService
  - Error before first log statement

### Scenario 6: generateProposalSummary logs appear, but dynamic import fails
- **Possible causes**:
  - Network error loading chunk
  - CORS issue
  - Module resolution error
  - Library bundling issue

## Next Steps Based on Results

1. **If button alert doesn't appear**: Check React component wiring and event handlers
2. **If dynamic import test fails**: Proceed to Phase 4 Option D (backend proxy) or investigate bundling
3. **If all diagnostics pass but error persists**: Proceed to Phase 3 (verify deployed bundle) and Phase 5 (deep debugging)

## Files Modified

1. `frontend/index.tsx` - Page load diagnostics and error handlers
2. `frontend/services/geminiService.ts` - Module load diagnostics
3. `frontend/components/AiSummary.tsx` - Component render and button click diagnostics
4. `frontend/App.tsx` - App component render diagnostics
5. `frontend/index.html` - Browser console diagnostic utilities

## Notes

- All diagnostics use `console.error()` for maximum visibility (red in console)
- All diagnostics also store to localStorage for persistence
- Global error handlers catch any unhandled errors
- Diagnostic utilities are available in browser console for manual testing

