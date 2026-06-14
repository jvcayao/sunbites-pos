# Wallet Report Redesign

**Date:** 2026-06-14  
**Projects:** `~/sunbites-api` (Laravel) + `~/sunbites-pos` (Next.js)

---

## Problem

The current wallet report has three categories of bugs:

1. **Wrong computation** — `total_debits` is negative because `bavix/laravel-wallet` stores withdrawal amounts as negative integers. `net_movement = credits − (−debits)` gives ₱635 instead of the correct ₱365.
2. **Field name mismatch** — the backend returns `full_name`, `wallet_balance`, `credit_balance`, `last_transaction_date` but the frontend TypeScript type expects `student_name`, `current_balance`, `outstanding_credit`, `last_transaction`. Student names and balances are blank as a result.
3. **Missing per-student totals** — `total_credited` and `total_debited` per student are never computed (only the branch-level summary is). The Excel export also silently shows ₱0.00 for these columns.

Additionally, the report includes subscription students who have never used their wallet, making it noisy and useless for staff reviewing wallet activity.

---

## What We Are Building

A redesigned wallet report with:

- A **fixed main table** showing correct per-student wallet summaries
- An **expandable nested sub-table** (click any row to expand) with two side-by-side sections: Purchases and Top-Ups
- The sub-table loads all-time history on demand when a row is expanded, with independent search and load-more pagination per section
- Students with no wallet activity (no transactions, zero balance) are always excluded from the report

---

## Backend Changes (`~/sunbites-api`)

### 1. Fix `WalletReportController::index()`

**File:** `app/Http/Controllers/Kitchen/WalletReportController.php`

**Net movement fix:**  
Use `ABS()` in the withdrawal CASE so `total_debits` is always positive:

```sql
SUM(CASE WHEN type = 'deposit' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_credits,
SUM(CASE WHEN type = 'withdraw' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_debits
```

`net_movement = total_credits − total_debits` is then correct.

**Wallet activity filter:**  
Add to the students query so students with no wallet activity are excluded:

```php
->whereHas('wallet', function ($q) {
    $q->where('balance', '>', 0)->orWhereHas('transactions');
})
```

**Replace N+1 per-student loop with one aggregation query:**  
After paginating, collect the page's student IDs and run one query:

```sql
SELECT wallets.holder_id AS student_id,
       SUM(CASE WHEN type = 'deposit' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_credited,
       SUM(CASE WHEN type = 'withdraw' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_debited,
       MAX(transactions.created_at) AS last_transaction
FROM transactions
JOIN wallets ON wallets.id = transactions.wallet_id
WHERE wallets.holder_type = 'App\Models\Student'
  AND wallets.holder_id IN (:studentIds)
  AND transactions.created_at BETWEEN :dateFrom AND :dateTo
GROUP BY wallets.holder_id
```

Keyed by `student_id` for O(1) lookup when building the response.

**Renamed response fields:**

| Old field | New field |
|---|---|
| `full_name` | `student_name` |
| `wallet_balance` | `current_balance` |
| `credit_balance` | `outstanding_credit` |
| `last_transaction_date` | `last_transaction` |
| `total_spent` (removed) | — |

Fields added: `total_credited`, `total_debited`.

### 2. Fix `WalletReportExport`

**File:** `app/Exports/WalletReportExport.php`

Update `map()` to accept and use computed `total_credited` and `total_debited` values. The existing `WalletReportController::export()` method must run the same per-student aggregation query (no date range filter — export shows all-time totals) and set those values on each student object before passing the collection to `WalletReportExport`.

### 3. New `WalletHistoryController`

**File:** `app/Http/Controllers/Kitchen/WalletHistoryController.php`  
**Route:** `GET /api/v1/reports/wallet/{student}/history`  
**Auth:** `auth:sanctum` + `role:admin|manager`

**Request params:**

| Param | Type | Default | Description |
|---|---|---|---|
| `type` | `purchases\|topups` | required | Which section to fetch |
| `search` | `string` | null | Filter by item name (purchases) or by `added_by` name (topups) |
| `per_page` | `integer` | 15 | Max 50 |
| `page` | `integer` | 1 | |

**Response shape:**

```json
{
  "data": [
    {
      "id": 123,
      "date": "2025-06-12T08:30:00",
      "description": "Fried Rice, Juice",
      "amount": 80.00
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 3,
    "total": 35,
    "per_page": 15
  }
}
```

For `type=purchases`: query `orders` joined to `order_items` + `pos_menu_items`. `description` = comma-joined item names. `amount` = order total (positive).

For `type=topups`: query `transactions` where `type = 'deposit'` for the student's wallet. `description` = `"Wallet Top-Up"`. `amount` = `ABS(amount) / 100`. `added_by` = pulled from the transaction `meta` JSON column; falls back to `"—"` if the column is null or the key is absent.

Topups response includes an additional `added_by` field:

```json
{ "id": 5, "date": "...", "amount": 500.00, "added_by": "Maria Santos" }
```

**Register route** in `routes/kitchen-api.php` alongside the existing wallet report routes.

---

## Frontend Changes (`~/sunbites-pos`)

### 1. `lib/api/reports.ts`

**Update `WalletReportRow` type:**

```typescript
export interface WalletReportRow {
  id: number;
  student_name: string;
  grade_level: string;
  current_balance: number;
  outstanding_credit: number;
  total_credited: number;
  total_debited: number;
  last_transaction: string | null;
}
```

**Add new types and API call:**

```typescript
export interface WalletHistoryItem {
  id: number;
  date: string;
  description: string;
  amount: number;
  added_by?: string; // top-ups only
}

export interface WalletHistoryParams {
  type: 'purchases' | 'topups';
  search?: string;
  per_page?: number;
  page?: number;
}
```

```typescript
walletHistory: (studentId: number, params: WalletHistoryParams) =>
  apiClient.get<{ data: WalletHistoryItem[]; meta: PaginatedMeta }>(
    `/reports/wallet/${studentId}/history`,
    { params }
  ),
```

### 2. `app/(kitchen)/reports/wallet/page.tsx`

- Update all field references to use the corrected `WalletReportRow` names
- Add `expandedStudentId: number | null` state (one row expanded at a time)
- Clicking a row header toggles `expandedStudentId`; clicking again collapses
- Render `<WalletHistoryPanel studentId={row.id} />` inside the expanded row area
- Students below ₱100 balance have their name rendered in red

### 3. New `WalletHistoryPanel` component

**File:** `app/(kitchen)/reports/wallet/wallet-history-panel.tsx`

Two side-by-side sections (grid: `1fr 1fr`, stacks on narrow viewports):

**Purchases section:**
- Search input bound to `purchaseSearch` state (debounced 300ms)
- Table columns: Date · Items · Total
- `useWalletHistory(studentId, 'purchases', purchaseSearch)`
- Skeleton on first load; "No purchases found." when empty
- "Load more (N remaining)" button when `hasNextPage`

**Top-Ups section:**
- Search input bound to `topupSearch` state (debounced 300ms)
- Table columns: Date · Added By · Amount
- `useWalletHistory(studentId, 'topups', topupSearch)`
- Same loading/empty/pagination pattern

### 4. New `hooks/use-wallet-history.ts`

```typescript
export function useWalletHistory(
  studentId: number,
  type: 'purchases' | 'topups',
  search: string
) {
  return useInfiniteQuery({
    queryKey: ['wallet-history', studentId, type, search],
    queryFn: ({ pageParam = 1 }) =>
      reportApi.walletHistory(studentId, { type, search, page: pageParam, per_page: 15 }),
    getNextPageParam: (last) =>
      last.meta.current_page < last.meta.last_page
        ? last.meta.current_page + 1
        : undefined,
    enabled: !!studentId,
  });
}
```

---

## Data Contract Summary

### Main report response (per student row)

```json
{
  "id": 1,
  "student_name": "Juan dela Cruz",
  "grade_level": "Grade 3",
  "current_balance": 320.00,
  "outstanding_credit": 50.00,
  "total_credited": 500.00,
  "total_debited": 180.00,
  "last_transaction": "2025-06-12T08:30:00"
}
```

### History response (purchases example)

```json
{
  "data": [
    { "id": 101, "date": "2025-06-12T08:30:00", "description": "Fried Rice, Juice", "amount": 80.00 }
  ],
  "meta": { "current_page": 1, "last_page": 3, "total": 35, "per_page": 15 }
}
```

### History response (topups example)

```json
{
  "data": [
    { "id": 5, "date": "2025-06-10T09:00:00", "description": "Wallet Top-Up", "amount": 500.00, "added_by": "Maria Santos" }
  ],
  "meta": { "current_page": 1, "last_page": 1, "total": 1, "per_page": 15 }
}
```

---

## Testing

### Backend (PHPUnit)

- `WalletReportController::index()` returns correct `net_movement` when withdrawals are present
- Response fields match the new names (`student_name`, `current_balance`, etc.)
- Subscription student with no wallet activity is excluded from the results
- Subscription student with a top-up is included
- Per-student `total_credited` and `total_debited` match actual transaction sums for the date range
- `WalletHistoryController` returns paginated purchases for a student
- `WalletHistoryController` returns paginated top-ups with `added_by`
- `WalletHistoryController` returns 403 for non-admin/manager staff

### Frontend (Jest + RTL + MSW)

- Summary cards show correct values (total_debits positive, net_movement = credits − debits)
- Clicking a row expands the sub-table; clicking again collapses it
- Only one row can be expanded at a time
- `WalletHistoryPanel` shows skeleton while loading
- "Load more" button appears when `hasNextPage` is true; clicking it appends rows
- Empty state renders when no purchases/top-ups found
- Search input filters results (MSW handler updated with search param)
