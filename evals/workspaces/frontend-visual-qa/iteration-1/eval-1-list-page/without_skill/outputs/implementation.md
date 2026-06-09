# Customer Management List Page - Implementation Design

## Overview

A Vue 3 + Element Plus customer management list page covering **filter/search area**, **data table with batch operations**, **new customer button**, **loading states** and **empty states**. Built with Composition API (`<script setup>`), Sass variables, BEM naming convention, Element Plus Icons, and TypeScript.

---

## Architecture

```
CustomerList.vue                  (page orchestrator)
  ├── CustomerFilter.vue          (filter bar: search, status, date range)
  ├── BatchActionBar.vue          (appears when rows selected, above table)
  ├── CustomerTable.vue           (el-table with columns, selection, actions)
  │     ├── <slot:loading>        (skeleton / spinner overlay)
  │     └── <slot:empty>          (illustration + CTA)
  └── [el-pagination]             (server-side or local pagination)
```

State management lives in a composable `useCustomerList.ts` that exposes reactive data, loading flags, pagination, selection state, and CRUD actions — the page component is thin.

---

## Key UI Decisions

### 1. Filter Area (`CustomerFilter.vue`)
- Uses `el-input` with `prefix-icon` (Search) + clearable, debounced with 300ms via the composable.
- `el-select` for status filter and `el-date-picker` for creation date range.
- Buttons: "Search" (primary), "Reset" (default, outline style). Both compact, right-aligned.
- Responsive: wraps on smaller viewports using a `.filter-bar` flex container with `flex-wrap: wrap; gap: 12px`.

### 2. Table (`CustomerTable.vue`)
- `el-table` with `@selection-change` synced to composable's `selectedRows`.
- Columns: checkbox (selection), Name, Email, Phone, Status (el-tag with color mapping), Created At, Actions (Edit / Delete).
- `v-loading` directive bound to `loading` ref — displays full-table spinner overlay.
- `el-empty` in the empty slot when `data.length === 0 && !loading`, with an illustration and "Create your first customer" button.

### 3. Batch Operations
- `BatchActionBar` slides in (CSS transition on max-height + opacity) above the table when `selectedRows.length > 0`.
- Displays selected count: "3 customers selected".
- Batch actions: "Batch Delete" (danger, with confirm dialog), "Export Selected" (default).
- Clear selection button ("Deselect All") on the right.

### 4. New Customer Button
- Positioned top-right above the table, `el-button type="primary" :icon="Plus"`.
- Opens a drawer/dialog (emitted to parent) for the creation form.

### 5. Loading State
- **Table level**: `v-loading="loading"` on `el-table` provides a semi-transparent overlay with a spinner.
- **Skeleton alternative**: For a richer UX, we render a custom skeleton inside the `#loading` slot of a wrapping container. This avoids layout shift because skeleton rows match the real row height exactly.

### 6. Empty State
- Uses `el-empty` with `description="No customers yet"` and a child `el-button` "Create your first customer".
- Separate from the initial-loading empty: `showEmpty = !loading && data.length === 0`.

---

## BEM Naming Convention

All custom CSS classes follow BEM:

```
.customer-list           Block
.customer-list__header   Element
.customer-list__filter    Element
.customer-list__toolbar   Element
.customer-list--loading   Modifier
```

Element Plus overrides use `:deep()` scoped penetration:

```scss
.customer-table {
  &:deep(.el-table__header th) {
    background-color: var(--el-fill-color-light);
    font-weight: 600;
  }
  &:deep(.el-table__row) {
    &:hover { cursor: pointer; }
  }
}
```

---

## Sass Variables

Project-level Sass variables drive consistent theming:

```scss
// _variables.scss (existing project file)
$color-primary: #0857e0;
$color-danger: #e74c3c;
$color-success: #196f3d;
$color-text-primary: #1e293b;
$color-text-secondary: #556677;
$color-border: #e2e8f0;
$color-bg-page: #f3f6fc;
$radius-md: 6px;
$shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
$spacing-md: 16px;
$spacing-lg: 24px;
```

---

## State Flow Diagram

```
[Page Mount] --> loading=true, fetchData()
                    |
                    v
        +--- data.length > 0? ---+
        |                        |
       YES                      NO
        |                        |
        v                        v
    render table           empty state
        |                 (no filter active)
        |
   user applies filters
        |
        v
   loading=true, fetchData(filters)
        |
        v
   +-- data.length > 0? --+
   |                      |
  YES                     NO
   |                      |
   v                      v
 filtered table       empty state
                     (with clear-filter CTA)

[User selects rows] --> show BatchActionBar
                         |
                    user clicks "Batch Delete"
                         |
                    confirm dialog
                         |
                    batchDelete(ids)
                         |
                    clearSelection, refetch
```

---

## Composable API (`useCustomerList.ts`)

```ts
interface UseCustomerListReturn {
  // State
  data: Ref<Customer[]>
  loading: Ref<boolean>
  filters: Ref<CustomerFilters>
  selectedRows: Ref<Customer[]>
  pagination: Ref<PaginationState>

  // Computed
  showEmpty: ComputedRef<boolean>
  selectedCount: ComputedRef<number>

  // Actions
  fetchData: () => Promise<void>
  batchDelete: (ids: string[]) => Promise<void>
  deleteOne: (id: string) => Promise<void>
  resetFilters: () => void
  clearSelection: () => void
}
```

---

## Files Created

| File | Purpose |
|------|---------|
| `src/types/customer.ts` | Type definitions (Customer, filters, pagination) |
| `src/composables/useCustomerList.ts` | Central state management composable |
| `src/components/CustomerFilter.vue` | Filter/search bar component |
| `src/components/BatchActionBar.vue` | Batch operations bar |
| `src/components/CustomerTable.vue` | Table with loading/empty slots |
| `src/views/CustomerList.vue` | Page orchestrator |

---

## Error Handling

- API calls wrapped in try/catch inside the composable.
- `ElMessage.error('Failed to load customers. Please try again.')` shown on fetch failure.
- Delete operations show `ElMessageBox.confirm` before executing.
- Network errors set `loading = false` and leave existing data visible (no destructive flash).
