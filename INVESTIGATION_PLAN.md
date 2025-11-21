# Comprehensive Investigation Plan: getGenerativeModel Error

## Current Status
- ✅ Library is correctly bundled (verified in dist/assets/index-*.js)
- ✅ GoogleGenerativeAI class exists (minified as `ea`)
- ✅ getGenerativeModel method exists in library
- ✅ Diagnostic code is in bundle (alert, console.error calls visible)
- ❌ NO console logs appearing when function is called
- ❌ Error: `(intermediate value).getGenerativeModel is not a function`
- ❌ localStorage shows null (no diagnostic logs stored)

## Critical Finding
The error message `(intermediate value).getGenerativeModel is not a function` suggests:
- The error is happening in MINIFIED code
- It might be a chained call that got minified: `(new GoogleGenerativeAI()).getGenerativeModel()`
- OR the constructor is returning undefined/null

## Investigation Steps

### Step 1: Verify Function is Actually Being Called
**Action**: Check if the alert() appears when button is clicked
- If NO alert → Function not being called OR browser using cached code
- If YES alert → Function IS being called, but console logs aren't showing

### Step 2: Check Browser Cache
**Action**: 
- Clear browser cache completely
- Try incognito/private window
- Check Network tab to see if bundle is being loaded fresh

### Step 3: Verify Deployed Bundle Matches Local
**Action**: Download the actual deployed bundle and compare with local build
- Check if diagnostic code is present
- Check if GoogleGenerativeAI is present
- Check minified variable names match

### Step 4: Test Library Import in Browser Console
**Action**: Run this in browser console on deployed site:
```javascript
// Test 1: Check if module can be imported
import('@google/generative-ai').then(m => {
  console.log('Module loaded:', m);
  console.log('GoogleGenerativeAI:', m.GoogleGenerativeAI);
  console.log('Type:', typeof m.GoogleGenerativeAI);
  
  // Test 2: Try to create instance
  const test = new m.GoogleGenerativeAI('test-key');
  console.log('Instance:', test);
  console.log('getGenerativeModel type:', typeof test.getGenerativeModel);
  console.log('getGenerativeModel:', test.getGenerativeModel);
  
  // Test 3: Try to call it
  try {
    const model = test.getGenerativeModel({ model: 'gemini-1.5-flash' });
    console.log('SUCCESS: Model created:', model);
  } catch (e) {
    console.error('FAILED:', e);
  }
}).catch(e => console.error('Import failed:', e));
```

### Step 5: Check Error Stack Trace
**Action**: When error occurs, check:
- What file does the error point to?
- What line number?
- Can we see the actual code around the error?

### Step 6: Verify Runtime Environment
**Action**: Check in browser console:
```javascript
// Check config.js is loaded
window.__ENV__

// Check API key
window.__ENV__?.VITE_GEMINI_API_KEY

// Check if function exists
typeof generateProposalSummary
```

### Step 7: Check for Minification Issues
**Action**: 
- Look at the actual minified code where getGenerativeModel is called
- Check if method name got mangled
- Check if prototype chain is broken

### Step 8: Test with Non-Minified Build
**Action**: Create a development build to see if issue is minification-related

## Next Actions
1. Deploy current version (importmap removed)
2. Test with hard refresh
3. Check if alert appears
4. Run browser console tests
5. Compare deployed bundle with local

