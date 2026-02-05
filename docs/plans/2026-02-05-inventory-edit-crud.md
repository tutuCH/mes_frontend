# Inventory Edit + Analytics Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add full CRUD for Materials, 批次庫存 (lots), and 耗用機台 (assignments), plus Chart.js dashboards and trends using mock data for now.

**Architecture:** Keep inventory data in Redux via `inventorySlice` with mock service calls. CRUD is inline for materials/lots with dialog-based create forms. Consumption trends are read-only and mocked, but are routed through service calls for a backend swap later. Chart.js is used via a lightweight inventory-specific chart wrapper using `lib/chartConfig`.

**Tech Stack:** React + Redux Toolkit + Vite, shadcn/ui, Chart.js, react-hook-form, zod, Playwright.

---

## Preconditions / Dependencies
- Inventory base feature must already exist (Inventory Dashboard, Material Detail, `inventoryService`, `inventorySlice`).
- If not present, port it from the `codex/inventory-management` worktree.
- We are not fixing `npm test` picking up Playwright specs for now; use targeted tests.

---

## Important Changes to Public APIs/Interfaces/Types
- Add or extend types in `src/types/api.ts`:
  - `InventoryTrendPoint { timestamp: string; consumedKg: number }`
  - `LotStockPoint { lotId: string; quantityKg: number; status: InventoryLotStatus }`
  - `MaterialAssignmentInput` for create/update.
- Extend inventory service API (mock) with:
  - `createMaterialAssignment`, `updateMaterialAssignment`, `deleteMaterialAssignment`
  - `getInventoryTrend` (mock aggregated consumption for dashboard)
  - `getLotStockSeries(materialId)` (mock or derived from lots)

---

## Task 1: Types and Mock Service Enhancements

**Files:**
- Modify: `src/types/api.ts`
- Modify: `src/services/inventoryService.ts`
- Test: `src/services/__tests__/inventoryService.test.ts`

**Step 1: Write the failing test**
Add tests for:
- Assignment CRUD (create/update/delete)
- `getInventoryTrend` returns deterministic points
- `getLotStockSeries` returns lots for a material

**Step 2: Run test to verify it fails**
Run: `npm test -- src/services/__tests__/inventoryService.test.ts`
Expected: FAIL with missing functions

**Step 3: Write minimal implementation**
Implement in `inventoryService` with in-memory mock store

**Step 4: Run test to verify it passes**
Run: `npm test -- src/services/__tests__/inventoryService.test.ts`
Expected: PASS

---

## Task 2: Redux Slice + Thunks for New CRUD + Trends

**Files:**
- Modify: `src/store/slices/inventorySlice.ts`
- Test: `src/store/slices/__tests__/inventorySlice.test.ts`

**Step 1: Write the failing test**
Test:
- `fetchInventoryTrend` populates `inventory.trend`
- Assignment CRUD updates `assignments`

**Step 2: Run test to verify it fails**
Run: `npm test -- src/store/slices/__tests__/inventorySlice.test.ts`
Expected: FAIL

**Step 3: Write minimal implementation**
Add thunks + reducers for trend + assignment CRUD

**Step 4: Run test to verify it passes**
Run: `npm test -- src/store/slices/__tests__/inventorySlice.test.ts`
Expected: PASS

---

## Task 3: Inline CRUD UI — Materials (Dashboard)

**Files:**
- Modify: `src/pages/inventory/InventoryDashboard.tsx`
- Create: `src/components/inventory/MaterialRowEditor.tsx`
- Create: `src/components/inventory/MaterialDialog.tsx`
- Modify: `src/locales/{en,zh-TW,zh-CN}/common.json`
- Test: `src/pages/inventory/__tests__/InventoryDashboard.test.tsx`

**Step 1: Write failing tests**
- Inline edit name → Save updates row
- Add Material dialog → row appears

**Step 2: Run tests to verify fail**
Run: `npm test -- src/pages/inventory/__tests__/InventoryDashboard.test.tsx`

**Step 3: Implement**
- Row edit state, Save/Cancel
- Dialog with form validation
- Delete confirmation

**Step 4: Verify tests pass**
Run same test file

---

## Task 4: Inline CRUD UI — Lots (Material Detail)

**Files:**
- Modify: `src/pages/inventory/MaterialDetail.tsx`
- Create: `src/components/inventory/LotDialog.tsx`
- Modify: `src/locales/{en,zh-TW,zh-CN}/common.json`
- Test: `src/pages/inventory/__tests__/MaterialDetail.test.tsx`

**Step 1: Write failing tests**
- Inline edit lot quantity → Save updates
- Add lot via dialog
- Delete lot removes row

**Step 2: Run tests**
Run: `npm test -- src/pages/inventory/__tests__/MaterialDetail.test.tsx`

**Step 3: Implement**
- Inline edit for lots table
- Dialog for new lot

**Step 4: Verify tests**
Run same test file

---

## Task 5: Machine Detail Assignment Editor (耗用機台)

**Files:**
- Modify: `src/pages/machine/MachineDetail.tsx`
- Create: `src/components/machine/MaterialSetupCard.tsx`
- Modify: `src/locales/{en,zh-TW,zh-CN}/common.json`
- Test: `src/components/machine/__tests__/MaterialSetupCard.test.tsx`

**Step 1: Write failing test**
- Update shot weight + active lot → save dispatches update

**Step 2: Run test**
Run: `npm test -- src/components/machine/__tests__/MaterialSetupCard.test.tsx`

**Step 3: Implement**
- Material + lot dropdowns
- Inputs for shotWeight, scrap%, cavities
- Save dispatches update

**Step 4: Verify tests**
Run same test file

---

## Task 6: Chart.js Visualizations (Mock Trends)

**Files:**
- Create: `src/components/inventory/charts/InventoryLineChart.tsx`
- Create: `src/components/inventory/charts/InventoryBarChart.tsx`
- Create: `src/components/inventory/charts/InventoryDoughnutChart.tsx`
- Modify: `src/pages/inventory/InventoryDashboard.tsx`
- Modify: `src/pages/inventory/MaterialDetail.tsx`
- Test: `src/components/inventory/__tests__/InventoryCharts.test.tsx`

**Step 1: Write failing tests**
- Chart components render
- Dashboard shows charts
- Material detail shows trend + lot chart

**Step 2: Run tests**
Run: `npm test -- src/components/inventory/__tests__/InventoryCharts.test.tsx`

**Step 3: Implement**
- Use Chart.js + `lib/chartConfig`
- Add dashboard charts (status doughnut, stock bars, total consumption line)
- Add detail charts (consumption line, lot stock bar)

**Step 4: Verify tests**
Run same test file

---

## Task 7: E2E Coverage (CRUD + Charts)

**Files:**
- Create: `tests/inventory-crud.spec.ts`

**Steps**
- Visit `/inventory`, edit material, open detail, add lot, update assignment
- Verify chart canvas exists

**Run**
`npm run test:e2e -- tests/inventory-crud.spec.ts`

---

## Testing & Verification Checklist
- Unit tests for service CRUD + trend
- Slice tests for CRUD + trend thunks
- Component tests for inline edit + dialogs + charts
- Playwright e2e for CRUD flow
- `npm test` may fail due to Playwright specs; use targeted tests

---

## Assumptions / Defaults
- Consumption trend remains read-only and mocked
- No new RBAC gates
- Base inventory feature must be merged/ported first
