# Pie Chart Debugging Plan

## Issue
Pie charts in PDF are not rendering correctly - showing only ~240° (66.7%) instead of full 360° circle for 100% single-item allocations.

## Debugging Steps Implemented

### 1. Console Logging (Browser DevTools)
Added comprehensive logging at each stage:
- **Raw Input**: Logs the original `strategyAllocationData` and `categoryAllocationData` from props
- **Filtered Data**: Logs after filtering out values < 0.01
- **Single Item Detection**: Logs when single item is detected and set to 100%
- **Final Data**: Logs the exact data structure passed to Recharts Pie component
- **Sum Verification**: Logs whether the sum equals exactly 100%

**How to check:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Generate a PDF report
4. Look for logs starting with "=== PIE CHART DEBUG ==="

### 2. Visual Debugging in PDF
Added red debug text above each pie chart showing:
- Number of items in the data array
- Total sum of all values
- Individual item values (name and percentage)

**What to look for:**
- If sum shows 100.00% but chart is incomplete → Recharts rendering issue
- If sum shows < 100% → Data normalization issue
- If multiple items shown but only one expected → Filtering issue

### 3. Data Flow Verification Points

**Point A: Input Data** (`strategyAllocationData` prop)
- Check: Are there multiple items with small values?
- Check: Is the single item actually 100% or something else?

**Point B: After Filtering** (`filteredStrategyData`)
- Check: Are zero/small values properly filtered?
- Check: Does `length === 1` when only one strategy is selected?

**Point C: After Normalization** (`normalizedStrategyData`)
- Check: Is single item set to exactly `{ name: "...", value: 100 }`?
- Check: Does the array have exactly 1 element?

**Point D: Final Data to Recharts**
- Check: What exact data structure is passed to `<Pie data={...}>`?
- Check: Does the sum equal exactly 100.0?

### 4. Potential Issues to Investigate

#### Issue 1: Multiple Items in Array
**Symptom**: Debug shows multiple items even with 100% allocation
**Cause**: Filter threshold (0.01) might not catch very small values
**Fix**: Lower threshold or check source data

#### Issue 2: Data Not Exactly 100%
**Symptom**: Debug shows sum = 99.99% or 100.01%
**Cause**: Rounding errors in normalization
**Fix**: Already implemented `ensureExactSum` - verify it's working

#### Issue 3: Recharts Interpretation
**Symptom**: Data is 100% but chart shows partial circle
**Cause**: Recharts might be interpreting data differently
**Fix**: Try hardcoded test data `[{ name: "Test", value: 100 }]`

#### Issue 4: PDF Capture Issue
**Symptom**: Chart looks correct in browser but wrong in PDF
**Cause**: html2canvas might not capture SVG correctly
**Fix**: Check if chart renders correctly before PDF capture

#### Issue 5: Angle Configuration
**Symptom**: Chart starts at wrong position
**Cause**: `startAngle`/`endAngle` might interfere
**Fix**: Already removed for single items - verify it's working

## Next Steps

1. **Generate PDF and check console logs** - Look for the debug output
2. **Check visual debug text in PDF** - Verify the sum and item count
3. **Compare browser vs PDF** - See if chart renders correctly in browser
4. **Test with hardcoded data** - Isolate if it's a data issue or rendering issue

## Test Cases

### Test Case 1: Single Strategy at 100%
- Expected: Full circle (360°)
- Debug should show: `1 item(s), Sum: 100.00%`

### Test Case 2: Two Strategies (e.g., 60/40)
- Expected: Two slices totaling 360°
- Debug should show: `2 item(s), Sum: 100.00%`

### Test Case 3: Single Category at 100%
- Expected: Full circle (360°)
- Debug should show: `1 item(s), Sum: 100.00%`

## Files Modified
- `frontend/components/ReportOutput.tsx` - Added debugging logs and visual debug output

