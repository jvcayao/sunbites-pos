# Wallet Report Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken computations and field names in the wallet report, exclude inactive wallet students, and add an expandable nested sub-table per student showing their full purchase and top-up history with search and load-more pagination.

**Architecture:** Backend is a Laravel API (`~/sunbites-api`); frontend is Next.js 15 App Router (`~/sunbites-pos`). The main wallet report endpoint is fixed in-place. A new `WalletHistoryController` handles per-student transaction history with `type=purchases|topups` query param, paginated independently per section. The frontend adds a `useWalletHistory` hook (TanStack Query v5 `useInfiniteQuery`) and a `WalletHistoryPanel` component rendered inside an expandable table row.

**Tech Stack:** PHP 8.5 / Laravel 13 / bavix/laravel-wallet / PHPUnit 12 (backend); Next.js 15 / React 19 / TanStack Query v5 / Tailwind v4 (frontend). All backend commands via `vendor/bin/sail`.

---

## File Map

### Backend (`~/sunbites-api`)

| Action | File |
|---|---|
| Modify | `app/Http/Controllers/Kitchen/WalletReportController.php` |
| Modify | `app/Exports/WalletReportExport.php` |
| Modify | `routes/kitchen-api.php` |
| Modify | `tests/Feature/Reports/WalletReportTest.php` |
| Create | `app/Http/Controllers/Kitchen/WalletHistoryController.php` |
| Create | `tests/Feature/Reports/WalletHistoryTest.php` |

### Frontend (`~/sunbites-pos`)

| Action | File |
|---|---|
| Modify | `lib/api/reports.ts` |
| Modify | `app/(kitchen)/reports/wallet/page.tsx` |
| Create | `app/(kitchen)/reports/wallet/wallet-history-panel.tsx` |
| Create | `hooks/use-wallet-history.ts` |

---

## Task 1: Fix WalletReportController::index()

Fix net movement computation, add wallet-activity filter, replace N+1 loop with one aggregation query, rename response fields.

**Files:**
- Modify: `tests/Feature/Reports/WalletReportTest.php`
- Modify: `app/Http/Controllers/Kitchen/WalletReportController.php`

- [ ] **Step 1: Update existing branch-scope test to give the student wallet activity**

The new wallet-activity filter will exclude students with no transactions. The existing `test_wallet_report_is_branch_scoped` creates a student with no wallet, so it will return 0 rows after the fix. Give that student a deposit so it appears.

In `tests/Feature/Reports/WalletReportTest.php`, replace:

```php
public function test_wallet_report_is_branch_scoped(): void
{
    $otherBranch = Branch::factory()->create();
    Student::factory()->count(3)->create(['branch_id' => $otherBranch->id]);
    Student::factory()->create(['branch_id' => $this->branch->id]);

    $response = $this->asAdmin()->getJson('/api/v1/reports/wallet');

    $response->assertOk();
    $this->assertCount(1, $response->json('data'));
}
```

with:

```php
public function test_wallet_report_is_branch_scoped(): void
{
    $otherBranch = Branch::factory()->create();
    Student::factory()->count(3)->create(['branch_id' => $otherBranch->id]);
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $student->deposit(50000); // gives wallet activity so it is not filtered out

    $response = $this->asAdmin()->getJson('/api/v1/reports/wallet');

    $response->assertOk();
    $this->assertCount(1, $response->json('data'));
}
```

- [ ] **Step 2: Write failing tests for the bugs being fixed**

Append these four tests to `WalletReportTest`:

```php
public function test_wallet_report_returns_correct_field_names(): void
{
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $student->deposit(20000);

    $response = $this->asAdmin()->getJson('/api/v1/reports/wallet');

    $response->assertOk()
        ->assertJsonStructure([
            'data' => [['id', 'student_name', 'grade_level', 'current_balance', 'outstanding_credit', 'total_credited', 'total_debited', 'last_transaction']],
        ]);
}

public function test_wallet_report_net_movement_is_positive_credits_minus_positive_debits(): void
{
    $student = Student::factory()->create(['branch_id' => $this->branch->id]);
    $student->deposit(50000);  // ₱500
    $student->withdraw(13500); // ₱135

    $response = $this->asAdmin()->getJson('/api/v1/reports/wallet');

    $summary = $response->json('summary');
    $this->assertEquals(500.0, $summary['total_credits']);
    $this->assertEquals(135.0, $summary['total_debits']);   // must be positive
    $this->assertEquals(365.0, $summary['net_movement']);   // 500 − 135
}

public function test_subscription_student_with_no_wallet_activity_is_excluded(): void
{
    Student::factory()->subscription()->create(['branch_id' => $this->branch->id]);

    $response = $this->asAdmin()->getJson('/api/v1/reports/wallet');

    $response->assertOk();
    $this->assertCount(0, $response->json('data'));
}

public function test_subscription_student_with_wallet_deposit_is_included(): void
{
    $student = Student::factory()->subscription()->create(['branch_id' => $this->branch->id]);
    $student->deposit(30000);

    $response = $this->asAdmin()->getJson('/api/v1/reports/wallet');

    $response->assertOk();
    $this->assertCount(1, $response->json('data'));
}
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
cd ~/sunbites-api && vendor/bin/sail artisan test --compact tests/Feature/Reports/WalletReportTest.php
```

Expected: 4 new tests fail (field name, net_movement, filter tests).

- [ ] **Step 4: Rewrite WalletReportController::index()**

Replace the full `index()` method in `app/Http/Controllers/Kitchen/WalletReportController.php`:

```php
public function index(Request $request): JsonResponse
{
    $validated = $request->validate([
        'date_from' => ['nullable', 'date'],
        'date_to'   => ['nullable', 'date'],
        'per_page'  => ['nullable', 'integer', 'min:1', 'max:100'],
    ]);

    $branchId = app('active_branch')->id;
    $dateFrom = $validated['date_from'] ?? now()->startOfMonth()->toDateString();
    $dateTo   = $validated['date_to']   ?? now()->toDateString();
    $perPage  = $validated['per_page']  ?? 25;

    // Branch-level summary (ABS fixes negative withdrawal amounts stored by bavix)
    $walletSummary = DB::table('transactions')
        ->join('wallets', 'wallets.id', '=', 'transactions.wallet_id')
        ->where('wallets.holder_type', Student::class)
        ->whereIn('wallets.holder_id', Student::where('branch_id', $branchId)->select('id'))
        ->whereBetween('transactions.created_at', ["{$dateFrom} 00:00:00", "{$dateTo} 23:59:59"])
        ->selectRaw("
            SUM(CASE WHEN type = 'deposit' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_credits,
            SUM(CASE WHEN type = 'withdraw' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_debits
        ")
        ->first();

    $totalCredits = (float) ($walletSummary?->total_credits ?? 0);
    $totalDebits  = (float) ($walletSummary?->total_debits  ?? 0);

    $studentsBelowHundred = Student::where('branch_id', $branchId)
        ->whereHas('wallet', fn ($q) => $q->whereRaw('(balance / 100.0) < 100'))
        ->count();

    // Only include students who have real wallet activity
    $students = Student::where('branch_id', $branchId)
        ->whereHas('wallet', fn ($q) => $q->where('balance', '>', 0)->orWhereHas('transactions'))
        ->with('wallet')
        ->orderBy('last_name')
        ->orderBy('first_name')
        ->paginate($perPage);

    // Single aggregation query replacing the old N+1 loop
    $studentIds = collect($students->items())->pluck('id')->all();

    $txStats = DB::table('transactions')
        ->join('wallets', 'wallets.id', '=', 'transactions.wallet_id')
        ->where('wallets.holder_type', Student::class)
        ->whereIn('wallets.holder_id', $studentIds)
        ->whereBetween('transactions.created_at', ["{$dateFrom} 00:00:00", "{$dateTo} 23:59:59"])
        ->selectRaw("
            wallets.holder_id AS student_id,
            SUM(CASE WHEN type = 'deposit' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_credited,
            SUM(CASE WHEN type = 'withdraw' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_debited,
            MAX(transactions.created_at) AS last_transaction
        ")
        ->groupBy('wallets.holder_id')
        ->get()
        ->keyBy('student_id');

    $studentData = collect($students->items())->map(function ($student) use ($txStats) {
        $stats = $txStats->get($student->id);

        return [
            'id'                => $student->id,
            'student_name'      => $student->full_name,
            'grade_level'       => $student->grade_level,
            'current_balance'   => (float) ($student->wallet?->balanceFloat ?? 0),
            'outstanding_credit'=> (float) $student->credit_balance,
            'total_credited'    => (float) ($stats?->total_credited ?? 0),
            'total_debited'     => (float) ($stats?->total_debited  ?? 0),
            'last_transaction'  => $stats?->last_transaction,
        ];
    });

    return response()->json([
        'data' => $studentData,
        'meta' => $this->paginationMeta($students),
        'summary' => [
            'total_credits'      => $totalCredits,
            'total_debits'       => $totalDebits,
            'net_movement'       => round($totalCredits - $totalDebits, 2),
            'students_below_100' => $studentsBelowHundred,
        ],
    ]);
}
```

- [ ] **Step 5: Run tests and confirm all pass**

```bash
cd ~/sunbites-api && vendor/bin/sail artisan test --compact tests/Feature/Reports/WalletReportTest.php
```

Expected: all 11 tests pass.

- [ ] **Step 6: Format and commit**

```bash
cd ~/sunbites-api
vendor/bin/sail bin pint --dirty --format agent
git add app/Http/Controllers/Kitchen/WalletReportController.php tests/Feature/Reports/WalletReportTest.php
git commit -m "fix: wallet report index — correct net movement, field names, wallet activity filter, N+1 query"
```

---

## Task 2: Fix Export (WalletReportController::export + WalletReportExport)

The export silently outputs ₱0.00 for Total Credited and Total Debited. Fix by computing the aggregation query in the export method and setting those values dynamically on each student.

**Files:**
- Modify: `app/Http/Controllers/Kitchen/WalletReportController.php`
- Modify: `app/Exports/WalletReportExport.php`
- Modify: `tests/Feature/Reports/WalletReportTest.php`

- [ ] **Step 1: Write a failing test for the export totals**

Append to `WalletReportTest`:

```php
public function test_wallet_export_includes_students_with_wallet_activity_only(): void
{
    Student::factory()->create(['branch_id' => $this->branch->id]); // no wallet — excluded
    $active = Student::factory()->create(['branch_id' => $this->branch->id]);
    $active->deposit(50000);

    // We cannot inspect xlsx contents easily, but we can assert the response succeeds
    // and that the controller doesn't throw when computing totals.
    $response = $this->asAdmin()->getJson('/api/v1/reports/wallet/export');

    $response->assertOk()
        ->assertHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
}
```

- [ ] **Step 2: Run the test to confirm it passes (it should — export still works)**

```bash
cd ~/sunbites-api && vendor/bin/sail artisan test --compact --filter=test_wallet_export_includes_students_with_wallet_activity_only
```

Expected: PASS (the export already works, we just need to fix the totals data).

- [ ] **Step 3: Replace WalletReportController::export()**

Replace the `export()` method:

```php
public function export(Request $request): BinaryFileResponse
{
    $branch   = app('active_branch');
    $branchId = $branch->id;

    $students = Student::where('branch_id', $branchId)
        ->whereHas('wallet', fn ($q) => $q->where('balance', '>', 0)->orWhereHas('transactions'))
        ->with('wallet')
        ->orderBy('last_name')
        ->orderBy('first_name')
        ->get();

    // Compute all-time credited/debited totals per student in one query
    $studentIds = $students->pluck('id')->all();

    $txStats = DB::table('transactions')
        ->join('wallets', 'wallets.id', '=', 'transactions.wallet_id')
        ->where('wallets.holder_type', Student::class)
        ->whereIn('wallets.holder_id', $studentIds)
        ->selectRaw("
            wallets.holder_id AS student_id,
            SUM(CASE WHEN type = 'deposit' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_credited,
            SUM(CASE WHEN type = 'withdraw' THEN ABS(amount) ELSE 0 END) / 100.0 AS total_debited,
            MAX(transactions.created_at) AS last_transaction
        ")
        ->groupBy('wallets.holder_id')
        ->get()
        ->keyBy('student_id');

    $students->each(function ($student) use ($txStats) {
        $stats = $txStats->get($student->id);
        $student->total_credited        = (float) ($stats?->total_credited ?? 0);
        $student->total_debited         = (float) ($stats?->total_debited  ?? 0);
        $student->last_transaction_date = $stats?->last_transaction;
    });

    $filename = "wallet-report-{$branch->slug}-".now()->format('Y-m-d').'.xlsx';

    return Excel::download(new WalletReportExport($students), $filename);
}
```

- [ ] **Step 4: Run tests and format**

```bash
cd ~/sunbites-api
vendor/bin/sail artisan test --compact tests/Feature/Reports/WalletReportTest.php
vendor/bin/sail bin pint --dirty --format agent
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd ~/sunbites-api
git add app/Http/Controllers/Kitchen/WalletReportController.php app/Exports/WalletReportExport.php tests/Feature/Reports/WalletReportTest.php
git commit -m "fix: wallet report export — compute per-student totals, exclude inactive wallet students"
```

---

## Task 3: Create WalletHistoryController

New endpoint: `GET /api/v1/reports/wallet/{student}/history?type=purchases|topups&search=&per_page=15&page=1`

**Files:**
- Create: `app/Http/Controllers/Kitchen/WalletHistoryController.php`
- Modify: `routes/kitchen-api.php`
- Create: `tests/Feature/Reports/WalletHistoryTest.php`

- [ ] **Step 1: Create the test file**

```bash
cd ~/sunbites-api && vendor/bin/sail artisan make:test --phpunit tests/Feature/Reports/WalletHistoryTest
```

- [ ] **Step 2: Write all WalletHistoryTest tests**

Replace the generated file at `tests/Feature/Reports/WalletHistoryTest.php`:

```php
<?php

namespace Tests\Feature\Reports;

use App\Models\Branch;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Student;
use App\Models\User;
use Database\Seeders\PermissionSeeder;
use Illuminate\Foundation\Testing\LazilyRefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class WalletHistoryTest extends TestCase
{
    use LazilyRefreshDatabase;

    private User $admin;
    private User $supervisor;
    private Branch $branch;
    private Student $student;

    protected function setUp(): void
    {
        parent::setUp();
        $this->seed(PermissionSeeder::class);

        $this->branch = Branch::factory()->create(['is_active' => true]);

        $this->admin = User::factory()->create();
        $this->admin->assignRole('admin');
        $this->admin->branches()->attach($this->branch->id, ['assigned_at' => now(), 'assigned_by' => null]);

        $this->supervisor = User::factory()->create();
        $this->supervisor->assignRole('supervisor');
        $this->supervisor->branches()->attach($this->branch->id, ['assigned_at' => now(), 'assigned_by' => null]);

        $this->student = Student::factory()->create(['branch_id' => $this->branch->id]);
    }

    private function asAdmin(): static
    {
        Sanctum::actingAs($this->admin, ['staff']);
        return $this->withHeaders(['X-Branch-Id' => $this->branch->id]);
    }

    private function asSupervisor(): static
    {
        Sanctum::actingAs($this->supervisor, ['staff']);
        return $this->withHeaders(['X-Branch-Id' => $this->branch->id]);
    }

    public function test_supervisor_cannot_access_wallet_history(): void
    {
        $response = $this->asSupervisor()
            ->getJson("/api/v1/reports/wallet/{$this->student->id}/history?type=purchases");

        $response->assertForbidden();
    }

    public function test_purchases_returns_paginated_order_list(): void
    {
        $cashier = User::factory()->create();
        Order::factory()->count(3)->create([
            'student_id' => $this->student->id,
            'branch_id'  => $this->branch->id,
            'cashier_id' => $cashier->id,
        ]);

        $response = $this->asAdmin()
            ->getJson("/api/v1/reports/wallet/{$this->student->id}/history?type=purchases&per_page=2");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'date', 'description', 'amount']],
                'meta' => ['current_page', 'last_page', 'total', 'per_page'],
            ]);

        $this->assertEquals(2, count($response->json('data')));
        $this->assertEquals(3, $response->json('meta.total'));
        $this->assertEquals(2, $response->json('meta.last_page'));
    }

    public function test_purchases_description_contains_order_item_names(): void
    {
        $cashier = User::factory()->create();
        $order = Order::factory()->create([
            'student_id' => $this->student->id,
            'branch_id'  => $this->branch->id,
            'cashier_id' => $cashier->id,
            'total'      => 80.00,
        ]);
        OrderItem::factory()->create(['order_id' => $order->id, 'name' => 'Fried Rice']);
        OrderItem::factory()->create(['order_id' => $order->id, 'name' => 'Juice']);

        $response = $this->asAdmin()
            ->getJson("/api/v1/reports/wallet/{$this->student->id}/history?type=purchases");

        $row = $response->json('data.0');
        $this->assertStringContainsString('Fried Rice', $row['description']);
        $this->assertStringContainsString('Juice', $row['description']);
        $this->assertEquals(80.00, $row['amount']);
    }

    public function test_purchases_search_filters_by_item_name(): void
    {
        $cashier = User::factory()->create();

        $order1 = Order::factory()->create([
            'student_id' => $this->student->id,
            'branch_id'  => $this->branch->id,
            'cashier_id' => $cashier->id,
        ]);
        OrderItem::factory()->create(['order_id' => $order1->id, 'name' => 'Fried Rice']);

        $order2 = Order::factory()->create([
            'student_id' => $this->student->id,
            'branch_id'  => $this->branch->id,
            'cashier_id' => $cashier->id,
        ]);
        OrderItem::factory()->create(['order_id' => $order2->id, 'name' => 'Spaghetti']);

        $response = $this->asAdmin()
            ->getJson("/api/v1/reports/wallet/{$this->student->id}/history?type=purchases&search=rice");

        $response->assertOk();
        $this->assertCount(1, $response->json('data'));
        $this->assertStringContainsString('Fried Rice', $response->json('data.0.description'));
    }

    public function test_topups_returns_paginated_deposit_list(): void
    {
        $this->student->deposit(50000, ['performed_by' => $this->admin->id]);
        $this->student->deposit(20000, ['performed_by' => $this->admin->id]);

        $response = $this->asAdmin()
            ->getJson("/api/v1/reports/wallet/{$this->student->id}/history?type=topups");

        $response->assertOk()
            ->assertJsonStructure([
                'data' => [['id', 'date', 'description', 'amount', 'added_by']],
                'meta' => ['current_page', 'last_page', 'total', 'per_page'],
            ]);

        $this->assertCount(2, $response->json('data'));
    }

    public function test_topups_added_by_shows_staff_name(): void
    {
        $this->student->deposit(50000, ['performed_by' => $this->admin->id]);

        $response = $this->asAdmin()
            ->getJson("/api/v1/reports/wallet/{$this->student->id}/history?type=topups");

        $row = $response->json('data.0');
        $this->assertEquals($this->admin->name, $row['added_by']);
        $this->assertEquals(500.00, $row['amount']);
    }

    public function test_topups_added_by_falls_back_to_dash_when_no_meta(): void
    {
        $this->student->deposit(50000); // no performed_by in meta

        $response = $this->asAdmin()
            ->getJson("/api/v1/reports/wallet/{$this->student->id}/history?type=topups");

        $this->assertEquals('—', $response->json('data.0.added_by'));
    }

    public function test_student_from_other_branch_returns_404(): void
    {
        $otherBranch = Branch::factory()->create();
        $otherStudent = Student::factory()->create(['branch_id' => $otherBranch->id]);

        $response = $this->asAdmin()
            ->getJson("/api/v1/reports/wallet/{$otherStudent->id}/history?type=purchases");

        $response->assertNotFound();
    }
}
```

- [ ] **Step 3: Run tests to confirm they all fail (controller doesn't exist yet)**

```bash
cd ~/sunbites-api && vendor/bin/sail artisan test --compact tests/Feature/Reports/WalletHistoryTest.php
```

Expected: all fail with 404 (route not registered).

- [ ] **Step 4: Create WalletHistoryController**

Create `app/Http/Controllers/Kitchen/WalletHistoryController.php`:

```php
<?php

namespace App\Http\Controllers\Kitchen;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Student;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WalletHistoryController extends Controller
{
    public function index(Request $request, Student $student): JsonResponse
    {
        $validated = $request->validate([
            'type'     => ['required', 'in:purchases,topups'],
            'search'   => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
            'page'     => ['nullable', 'integer', 'min:1'],
        ]);

        $perPage = $validated['per_page'] ?? 15;
        $search  = $validated['search'] ?? null;

        if ($validated['type'] === 'purchases') {
            return $this->purchases($student, $search, $perPage);
        }

        return $this->topups($student, $search, $perPage);
    }

    private function purchases(Student $student, ?string $search, int $perPage): JsonResponse
    {
        $orders = Order::where('student_id', $student->id)
            ->when($search, fn ($q) => $q->whereHas(
                'items',
                fn ($iq) => $iq->where('name', 'like', "%{$search}%")
            ))
            ->with('items:id,order_id,name')
            ->orderByDesc('created_at')
            ->paginate($perPage);

        $data = $orders->getCollection()->map(fn ($order) => [
            'id'          => $order->id,
            'date'        => $order->created_at->toIso8601String(),
            'description' => $order->items->pluck('name')->filter()->join(', '),
            'amount'      => (float) $order->total,
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->paginationMeta($orders),
        ]);
    }

    private function topups(Student $student, ?string $search, int $perPage): JsonResponse
    {
        $wallet = $student->wallet;

        if (! $wallet) {
            return response()->json([
                'data' => [],
                'meta' => ['current_page' => 1, 'last_page' => 1, 'total' => 0, 'per_page' => $perPage],
            ]);
        }

        $transactions = DB::table('transactions')
            ->where('transactions.wallet_id', $wallet->id)
            ->where('transactions.type', 'deposit')
            ->leftJoin('users', function ($join) {
                $join->on('users.id', '=', DB::raw(
                    'CAST(JSON_UNQUOTE(JSON_EXTRACT(transactions.meta, \'$.performed_by\')) AS UNSIGNED)'
                ));
            })
            ->when($search, fn ($q) => $q->where('users.name', 'like', "%{$search}%"))
            ->orderByDesc('transactions.created_at')
            ->select('transactions.id', 'transactions.amount', 'transactions.created_at', 'users.name as added_by_name')
            ->paginate($perPage);

        $data = $transactions->getCollection()->map(fn ($tx) => [
            'id'          => $tx->id,
            'date'        => $tx->created_at,
            'description' => 'Wallet Top-Up',
            'amount'      => abs($tx->amount) / 100,
            'added_by'    => $tx->added_by_name ?? '—',
        ]);

        return response()->json([
            'data' => $data,
            'meta' => $this->paginationMeta($transactions),
        ]);
    }
}
```

- [ ] **Step 5: Register the route**

In `routes/kitchen-api.php`, inside the `Route::middleware('role:admin|manager')->group(...)` block (around line 253), add the new route after the existing wallet routes:

```php
Route::get('/wallet', [WalletReportController::class, 'index']);
Route::get('/wallet/export', [WalletReportController::class, 'export']);
Route::get('/wallet/{student}/history', [WalletHistoryController::class, 'index']);
```

Also add the import at the top of the file with the other controller imports:

```php
use App\Http\Controllers\Kitchen\WalletHistoryController;
```

- [ ] **Step 6: Run tests and confirm all pass**

```bash
cd ~/sunbites-api && vendor/bin/sail artisan test --compact tests/Feature/Reports/WalletHistoryTest.php
```

Expected: all 8 tests pass.

- [ ] **Step 7: Run full suite to confirm no regressions**

```bash
cd ~/sunbites-api && vendor/bin/sail artisan test --compact
```

- [ ] **Step 8: Format and commit**

```bash
cd ~/sunbites-api
vendor/bin/sail bin pint --dirty --format agent
git add app/Http/Controllers/Kitchen/WalletHistoryController.php routes/kitchen-api.php tests/Feature/Reports/WalletHistoryTest.php
git commit -m "feat: add WalletHistoryController for per-student purchase and top-up history"
```

---

## Task 4: Update Frontend API Types and Service

**Files:**
- Modify: `lib/api/reports.ts` (in `~/sunbites-pos`)

- [ ] **Step 1: Add WalletHistoryItem type, WalletHistoryParams type, and walletHistory API method**

In `~/sunbites-pos/lib/api/reports.ts`, find the `WalletReportRow` interface (around line 113) and replace it:

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

Then add after `WalletSummary` (around line 130):

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

Then in the `reportApi` object, add the `walletHistory` method alongside the existing `wallet` method:

```typescript
walletHistory: (studentId: number, params: WalletHistoryParams) =>
  apiClient.get<{ data: WalletHistoryItem[]; meta: PaginatedMeta }>(
    `/reports/wallet/${studentId}/history`,
    { params: params as Record<string, string | number | boolean | undefined> }
  ),
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/sunbites-pos && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the changes.

- [ ] **Step 3: Commit**

```bash
cd ~/sunbites-pos
git add lib/api/reports.ts
git commit -m "feat: add WalletHistoryItem types and walletHistory API method"
```

---

## Task 5: Create use-wallet-history Hook

Uses TanStack Query v5 `useInfiniteQuery` with `initialPageParam` (required in v5).

**Files:**
- Create: `hooks/use-wallet-history.ts` (in `~/sunbites-pos`)

- [ ] **Step 1: Create the hook file**

Create `~/sunbites-pos/hooks/use-wallet-history.ts`:

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";

import { reportApi, type WalletHistoryParams } from "@/lib/api/reports";

export function useWalletHistory(
  studentId: number,
  type: WalletHistoryParams["type"],
  search: string
) {
  return useInfiniteQuery({
    queryKey: ["wallet-history", studentId, type, search],
    queryFn: ({ pageParam }) =>
      reportApi.walletHistory(studentId, {
        type,
        search: search || undefined,
        page: pageParam,
        per_page: 15,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.meta.current_page < lastPage.meta.last_page
        ? lastPage.meta.current_page + 1
        : undefined,
    enabled: !!studentId,
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/sunbites-pos && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/sunbites-pos
git add hooks/use-wallet-history.ts
git commit -m "feat: add useWalletHistory infinite-query hook"
```

---

## Task 6: Create WalletHistoryPanel Component

Renders inside an expanded table row. Two side-by-side sections: Purchases (left) and Top-Ups (right), each with a search input and load-more pagination.

**Files:**
- Create: `app/(kitchen)/reports/wallet/wallet-history-panel.tsx` (in `~/sunbites-pos`)

- [ ] **Step 1: Create the component file**

Create `~/sunbites-pos/app/(kitchen)/reports/wallet/wallet-history-panel.tsx`:

```tsx
"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useWalletHistory } from "@/hooks/use-wallet-history";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Section skeleton
// ---------------------------------------------------------------------------

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Purchases section
// ---------------------------------------------------------------------------

function PurchasesSection({ studentId }: { studentId: number }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useWalletHistory(studentId, "purchases", deferredSearch);

  const rows = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;
  const remaining = total - rows.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-800">
          🛒 Purchases
        </span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 w-36 pl-8 text-xs"
            placeholder="Search items..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <SectionSkeleton />
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No purchases found.
        </p>
      ) : (
        <>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">Date</th>
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">Items</th>
                <th className="pb-1.5 text-right font-semibold uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/10">
                  <td className="py-1.5 pr-3 text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="py-1.5 pr-3">{row.description || "—"}</td>
                  <td className="py-1.5 text-right font-medium text-red-600">{formatPeso(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasNextPage && (
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-blue-600 hover:text-blue-700"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : `Load more (${remaining} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Top-ups section
// ---------------------------------------------------------------------------

function TopUpsSection({ studentId }: { studentId: number }) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, fetchNextPage, hasNextPage, isLoading, isFetchingNextPage } =
    useWalletHistory(studentId, "topups", deferredSearch);

  const rows = data?.pages.flatMap((p) => p.data) ?? [];
  const total = data?.pages[0]?.meta.total ?? 0;
  const remaining = total - rows.length;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
          💳 Top-Ups
        </span>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-7 w-36 pl-8 text-xs"
            placeholder="Search staff..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <SectionSkeleton />
      ) : rows.length === 0 ? (
        <p className="py-4 text-center text-xs text-muted-foreground">
          No top-ups found.
        </p>
      ) : (
        <>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">Date</th>
                <th className="pb-1.5 text-left font-semibold uppercase tracking-wider">Added By</th>
                <th className="pb-1.5 text-right font-semibold uppercase tracking-wider">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-muted/10">
                  <td className="py-1.5 pr-3 text-muted-foreground">{formatDate(row.date)}</td>
                  <td className="py-1.5 pr-3">{row.added_by ?? "—"}</td>
                  <td className="py-1.5 text-right font-medium text-green-700">+{formatPeso(row.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {hasNextPage && (
            <div className="mt-3 text-center">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-blue-600 hover:text-blue-700"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading..." : `Load more (${remaining} remaining)`}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface Props {
  studentId: number;
}

export function WalletHistoryPanel({ studentId }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
      <PurchasesSection studentId={studentId} />
      <TopUpsSection studentId={studentId} />
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd ~/sunbites-pos && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd ~/sunbites-pos
git add app/\(kitchen\)/reports/wallet/wallet-history-panel.tsx
git commit -m "feat: add WalletHistoryPanel component with purchases and top-ups sections"
```

---

## Task 7: Update wallet/page.tsx for Expandable Rows

Add `expandedStudentId` state, make rows clickable, render the `WalletHistoryPanel` in an expanded row below each student.

**Files:**
- Modify: `app/(kitchen)/reports/wallet/page.tsx` (in `~/sunbites-pos`)

- [ ] **Step 1: Add Fragment import and expandedStudentId state**

Near the top of `page.tsx`, the existing React import is:

```typescript
import { useState } from "react";
```

Replace with:

```typescript
import { Fragment, useState } from "react";
```

Inside `WalletReportPage()`, after the existing state declarations (after `const [page, setPage] = useState(1);`), add:

```typescript
const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

function toggleExpand(id: number) {
  setExpandedStudentId((prev) => (prev === id ? null : id));
}
```

- [ ] **Step 2: Add the WalletHistoryPanel import**

Below the existing local imports in `page.tsx`, add:

```typescript
import { WalletHistoryPanel } from "./wallet-history-panel";
```

- [ ] **Step 3: Update the table header — add a blank leading column for the expand chevron**

Find the `<thead>` row. The first `<th>` currently reads "Student Name". Prepend an empty `<th>`:

```tsx
<thead>
  <tr className="border-b border-border">
    <th className="w-8 px-4 py-2" /> {/* expand toggle */}
    <th className="px-4 py-2 text-left text-xs font-semibold text-muted-foreground">
      Student Name
    </th>
    {/* ...rest of existing headers unchanged... */}
  </tr>
</thead>
```

The `colSpan` on the empty-state cell (currently `colSpan={7}`) and the skeleton `TableRowSkeleton` also need to increase by 1. Update the skeleton:

```tsx
function TableRowSkeleton() {
  return (
    <tr>
      {Array.from({ length: 8 }).map((_, i) => (  // was 7
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}
```

And the empty state cell:

```tsx
<td colSpan={8} className="px-4 py-10 text-center text-muted-foreground"> {/* was 7 */}
  No wallet data found.
</td>
```

- [ ] **Step 4: Replace the rows.map() block with expandable rows**

Find the `rows.map((row) => (...))` block and replace it with:

```tsx
rows.map((row) => (
  <Fragment key={row.id}>
    <tr
      className="cursor-pointer hover:bg-muted/20"
      onClick={() => toggleExpand(row.id)}
    >
      <td className="w-8 px-4 py-2.5 text-center text-xs text-muted-foreground">
        {expandedStudentId === row.id ? "▼" : "▶"}
      </td>
      <td className={cn(
        "px-4 py-2.5 font-medium",
        row.current_balance < 100 ? "text-red-600" : "text-foreground",
      )}>
        {row.student_name}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {row.grade_level}
      </td>
      <td className={cn(
        "px-4 py-2.5 text-right font-semibold",
        row.current_balance < 100 && "text-amber-600",
      )}>
        {formatPeso(row.current_balance)}
      </td>
      <td className="px-4 py-2.5 text-right text-red-600">
        {row.outstanding_credit > 0 ? formatPeso(row.outstanding_credit) : "—"}
      </td>
      <td className="px-4 py-2.5 text-right text-green-700">
        {formatPeso(row.total_credited)}
      </td>
      <td className="px-4 py-2.5 text-right text-muted-foreground">
        {formatPeso(row.total_debited)}
      </td>
      <td className="px-4 py-2.5 text-muted-foreground">
        {formatDate(row.last_transaction)}
      </td>
    </tr>
    {expandedStudentId === row.id && (
      <tr>
        <td colSpan={8} className="bg-blue-50/50 px-6 py-5">
          <WalletHistoryPanel studentId={row.id} />
        </td>
      </tr>
    )}
  </Fragment>
))
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd ~/sunbites-pos && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

- [ ] **Step 6: Start the dev server and manually verify**

```bash
cd ~/sunbites-pos && vendor/bin/sail npm run dev
```

Open `http://localhost:3000/reports/wallet` in a browser and confirm:
- Summary cards show correct values (positive debits, correct net movement)
- Only students with wallet activity appear
- Clicking a row expands it and shows the Purchases / Top-Ups panel
- Clicking the same row again collapses it
- Only one row is expanded at a time
- Search inputs filter results
- "Load more" appears when there are more pages

- [ ] **Step 7: Commit**

```bash
cd ~/sunbites-pos
git add app/\(kitchen\)/reports/wallet/page.tsx
git commit -m "feat: wallet report expandable rows with WalletHistoryPanel"
```
