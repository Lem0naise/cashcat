# Onboarding Refactor — Architecture Plan

## Problem

The original onboarding logic in `src/app/budget/page.tsx` was:

- **Implicit** — it relied on `categories.length === 0` to decide whether to show onboarding, meaning an experienced user who deleted all categories would be trapped in the flow again.
- **Coupled** — two `useState` flags (`isOnboarding`, `hasAutoOpenedOnboarding`) plus a `useEffect` that auto-opened `AccountModal` and chained to `ManageBudgetModal` via the `onClose` callback.
- **Fragile** — the chaining happened through imperative `setState` calls scattered across modal callbacks, making the sequence hard to follow or modify.

## Solution

### 1. Persistent `is_onboarded` flag

A boolean column `is_onboarded` on the `settings` table (default `false`, backfilled to `true` for existing users).

**Migration:** `supabase/migrations/20260227_add_is_onboarded.sql`

```sql
ALTER TABLE settings ADD COLUMN IF NOT EXISTS is_onboarded boolean DEFAULT false;
UPDATE settings SET is_onboarded = true WHERE is_onboarded IS NULL OR is_onboarded = false;
```

### 2. `useOnboarding` hook (`src/app/hooks/useOnboarding.ts`)

Centralised state machine that owns the entire onboarding lifecycle:

```
idle  ──▶  accounts  ──▶  budget  ──▶  complete
                │                         ▲
                └── (has categories) ─────┘
```

**Key API:**

| Property / Method       | Type       | Description                                              |
|------------------------|------------|----------------------------------------------------------|
| `step`                 | `OnboardingStep` | Current step: `idle`, `accounts`, `budget`, `complete` |
| `isOnboardingActive`   | `boolean`  | True during `accounts` or `budget` steps                 |
| `showAccountModal`     | `boolean`  | True when step is `accounts`                             |
| `showBudgetWizard`     | `boolean`  | True when step is `budget`                               |
| `advanceFromAccounts()`| `() => void` | Call when AccountModal closes during onboarding        |
| `advanceFromBudget()`  | `() => void` | Call when ManageBudgetModal closes during onboarding   |
| `skipOnboarding()`     | `() => void` | Skip and persist `is_onboarded = true`                 |

**Trigger logic:**
- Reads `is_onboarded` via TanStack Query (30-min stale time).
- When flag is `false`, categories are loaded, and flow hasn't triggered yet this session, it sets `step = 'accounts'`.
- On errors fetching the flag, defaults to `true` (safe — never traps returning users).

### 3. `OnboardingOverlay` component (`src/app/components/OnboardingOverlay.tsx`)

Purely presentational component shown when `categories.length === 0`. Replaces the ~50-line inline JSX block that was in `budget/page.tsx`.

**Props:** `{ onStartOnboarding: () => void }`

### 4. Integration in `budget/page.tsx`

The page component:
1. Calls `useOnboarding(hasCategoriesLoaded, rawCategoriesData.length)`.
2. Renders `<OnboardingOverlay>` in the `categories.length === 0` ternary branch.
3. Passes `onboarding.showBudgetWizard` / `onboarding.showAccountModal` to the modal `isOpen` props (OR'd with the manual `showManageModal` / `showAccountModal` state).
4. Calls `onboarding.advanceFromAccounts()` / `onboarding.advanceFromBudget()` in the respective `onClose` callbacks when onboarding is active.

**Removed from page:**
- `isOnboarding` state variable
- `hasAutoOpenedOnboarding` state variable
- Auto-open `useEffect` that watched `rawCategoriesData.length`
- `Link` import (moved into `OnboardingOverlay`)

## Files Changed

| File | Change |
|------|--------|
| `src/types/supabase.ts` | Added `is_onboarded` to `settings` Row/Insert/Update types |
| `supabase/migrations/20260227_add_is_onboarded.sql` | New migration |
| `src/app/hooks/useOnboarding.ts` | New hook |
| `src/app/components/OnboardingOverlay.tsx` | New component |
| `src/app/budget/page.tsx` | Refactored to use above |

## Testing Notes

- **New user:** Should see `OnboardingOverlay` → click "Create Your Budget!" → `AccountModal` opens → close it → `ManageBudgetModal` opens in wizard mode → close it → `is_onboarded` persisted as `true`.
- **Returning user:** `is_onboarded = true` in DB → onboarding never triggers, even if they delete all categories.
- **Error fetching flag:** Defaults to `true` — no onboarding trap.
- **Manual modal open:** The `showManageModal` / `showAccountModal` state still works independently for non-onboarding usage (settings gear icon, etc.).
