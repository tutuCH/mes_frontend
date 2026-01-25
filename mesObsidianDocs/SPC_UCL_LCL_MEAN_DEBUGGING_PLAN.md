# SPC Chart UCL/LCL/Mean Visibility Issue - Debugging Plan

## Issue Summary
Users can see SPC charts plotted but cannot see the UCL (Upper Control Limit), LCL (Lower Control Limit), and Mean lines.

## Phase 1: Root Cause Investigation (In Progress)

### Diagnostic Logging Added

#### 1. SPCChart Component (`src/components/spc/SPCChart.tsx`)
- **Fetch limits section**: Logs when limits are fetched, received, and stored in ref
- **Chart initialization section**: Logs when chart is initialized, whether limits are available, and when control limit datasets are added
- **Render loop section**: Logs first-time control limit updates and warnings when data or limits are missing

#### 2. SPC Limits Service (`src/services/spcLimitsService.ts`)
- Logs fetch requests with machineId and field
- Logs API responses including:
  - Full response object
  - Available limit keys in response
  - Whether requested field exists in response
  - The specific field limit object
- Logs successful limit extraction or warnings for invalid/missing limits

### What the Logs Will Tell Us

1. **If logs show `null` limits**: Backend is not returning limits for the requested fields
   - Possible cause: Field name mismatch between frontend and backend
   - Possible cause: Backend API not returning data for those fields

2. **If logs show valid limits but they don't appear**: Chart rendering issue
   - Possible cause: Datasets are added but not being rendered correctly
   - Possible cause: Chart update timing issue (limits load after chart initialization)

3. **If logs show datasets are created but empty**: Data timing issue
   - The render loop creates control limit lines with empty data initially
   - Lines are only populated when `data.length > 0` and limits exist

### Potential Root Causes Identified

Based on code analysis, here are the likely root causes:

#### A. Field Name Mismatch (Most Likely)
The `getFieldControlLimits` function queries limits for specific fields (e.g., `cycle_time`, `temp_1`). If the backend returns limits with different field names, the lookup will fail.

**Evidence in code** (`spcLimitsService.ts:50`):
```typescript
const fieldLimit = response.limits[field]
```

If `response.limits` uses different keys than what we're requesting, this returns `undefined`.

#### B. Chart Initialization Timing Issue
The chart initializes before limits are fetched (line 160-208 in SPCChart.tsx). If `limitsRef.current` is null during initialization, control limit datasets are never added.

**Evidence in code** (`SPCChart.tsx:184`):
```typescript
if (limitsRef.current) {
  // Only adds control limit datasets if limits exist at init time
}
```

#### C. Dataset Index Out of Bounds
The render loop directly accesses `chart.data.datasets[1]`, `[2]`, `[3]` without checking if these datasets exist. If they were never created, this will cause silent failures.

**Evidence in code** (`SPCChart.tsx:289-304`):
```typescript
// Directly accesses indices 1, 2, 3 without verification
chart.data.datasets[1].data = [...]
chart.data.datasets[2].data = [...]
chart.data.datasets[3].data = [...]
```

## Phase 2: Debugging Steps

**Step 1: Run the application and observe console logs**
- Open the SPC Analysis page
- Select a machine
- Expand a metric category
- Observe console output for each chart

**Step 2: Analyze log output**
- Check if `[SPC LIMITS DEBUG]` shows successful limit extraction
- Check if `[SPC DEBUG]` shows control limit datasets being added
- Check if `[SPC DEBUG]` shows first control limit update in render loop

**Step 3: Identify which component is failing**
- If limits are null → Backend/API issue
- If limits exist but no "Adding control limit datasets" log → Chart initialization timing issue
- If datasets added but no "First control limit update" log → Render loop or dataset index issue

## Phase 3: Fix Plan (Depends on Debug Results)

### Scenario A: Backend Returns Null/No Limits
**Fix**: Verify field names match backend expectations
1. Check actual field names returned by backend API
2. Update field mapping if needed
3. Or implement fallback to calculate limits from data

### Scenario B: Chart Initialization Timing Issue
**Fix**: Dynamically add control limit datasets when limits load
1. Modify the "Update control limits when they load" effect to properly add datasets
2. Ensure datasets are added even if chart was already initialized
3. Use `chart.update()` after adding datasets

### Scenario C: Dataset Index Bounds Issue
**Fix**: Add defensive checks before accessing dataset indices
1. Check if datasets exist before accessing them
2. Create datasets on-demand if missing
3. Add error boundary for chart rendering

### Scenario D: Lines Exist But Invisible
**Fix**: Chart configuration issue
1. Verify z-index (control limits should be on top)
2. Verify y-axis scale includes the limit values
3. Verify colors are not transparent
4. Verify borderDash settings don't make lines invisible

## Testing Plan

After implementing the fix:
1. Verify UCL, LCL, and Mean lines appear for all metric categories
2. Verify lines update correctly when new data arrives
3. Verify lines appear when switching machines
4. Verify lines appear when expanding/collapsing categories
5. Verify lines render correctly with different data ranges

## Files Modified for Debugging

1. `src/components/spc/SPCChart.tsx` - Added diagnostic logging
2. `src/services/spcLimitsService.ts` - Added API response logging

## Next Steps

1. **User Action**: Run the dev server and navigate to SPC Analysis page
2. **User Action**: Share console log output showing the `[SPC DEBUG]` and `[SPC LIMITS DEBUG]` messages
3. **Analysis**: Based on logs, identify which scenario (A, B, C, or D) is occurring
4. **Implementation**: Apply the appropriate fix from Phase 3
