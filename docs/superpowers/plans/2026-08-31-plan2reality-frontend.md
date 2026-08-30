# Plan2Reality Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Plan2Reality frontend — Planner Console, Review Queue, and
Evidence View — as a Next.js/TypeScript/Tailwind app running entirely against a
typed mock data layer, so teammates can later swap mock internals for real
fetch calls with zero component changes.

**Architecture:** A single `lib/types.ts` file is the API contract. All screens
read through `lib/api/*` async functions that today resolve from
`lib/mock-data/*` fixtures. Review Queue mutations live in a React
Context/`useReducer` store (`lib/store/review-store.tsx`) seeded from the API
layer on mount — this store, not components, is where real mutation endpoints
get wired in later.

**Tech Stack:** Next.js (App Router) + TypeScript + Tailwind v4, no backend, no
auth, no external data-fetching library. Vitest + React Testing Library for
component/unit tests (added in Task 1).

**Spec:** `docs/superpowers/specs/2026-08-31-plan2reality-frontend-design.md`

## Global Constraints

- No authentication, no real backend/database, no file upload processing, no
  real LLM calls, no Recover & Learn / execution memory subsystem.
- Every `lib/api/*` function is `async` and returns a `Promise`, even though it
  resolves synchronously from fixtures today.
- `MatchResult.route` is always read from data, never derived from
  `confidence` via thresholds in the UI.
- `MatchResult.candidates` and `EvidencePointer.excerpt` are optional — every
  consumer must render an explicit fallback/empty state for the missing case,
  never assume presence.
- All three screens (Planner Console, Review Queue, Evidence View) share one
  `<Skeleton>` loading component and one `<ErrorState>` component — no
  screen-specific loading/error treatments.
- Every Review Queue row links to `/evidence/[matchId]` using `MatchResult.id`.
- Design tokens come from `design/DESIGN.md` verbatim (Parchment/Pure
  White/Aged Sepia/Fog/Teal Accent/Deep Forest palette, pplxSerif/pplxSans/
  pplxSansMono type system, 12px card radius, no box-shadows, 28-40px section
  rhythm). No botanical imagery/blur — flat Parchment canvas.
- Dates are ISO 8601 strings everywhere. All IDs are `string`.
- Build order is fixed: types + mock data → Planner Console → Review Queue →
  Evidence View. Each screen fully working (build passes, manually verified in
  browser) before starting the next.

---

## Task 1: Project scaffold, Tailwind theme, test tooling

**Files:**
- Create: entire Next.js scaffold via `create-next-app` in
  `SIH latest 2026/` (app/, package.json, tsconfig.json, etc.)
- Modify: `app/globals.css` — add DESIGN.md `@theme` tokens
- Create: `vitest.config.ts`, `vitest.setup.ts`
- Modify: `package.json` — add `test` script
- Create: `.gitignore` additions if needed (Next.js default covers `node_modules`, `.next`)

**Interfaces:**
- Consumes: nothing (first task)
- Produces: a running Next.js dev server, a working `npm test` command, and
  Tailwind custom properties (`--color-aged-sepia`, `--color-parchment`,
  `--color-fog`, `--color-pure-white`, `--color-moss-shadow`,
  `--color-deep-forest`, `--color-teal-accent`, `--color-absolute-black`, plus
  font-family and radius tokens) available to every later task via Tailwind
  arbitrary-value classes or `@theme`-mapped utility classes.

- [ ] **Step 1: Scaffold the Next.js app**

Run from `d:/hackathon/SIH/`:

```bash
cd "d:/hackathon/SIH"
npx create-next-app@latest "SIH latest 2026" --typescript --tailwind --app --eslint --src-dir=false --import-alias "@/*" --use-npm
```

If prompted interactively, accept: App Router = yes, Tailwind = yes,
`src/` directory = no, import alias = `@/*`.

- [ ] **Step 2: Verify the scaffold builds and runs**

```bash
cd "d:/hackathon/SIH/SIH latest 2026"
npm run build
```

Expected: build succeeds with the default Next.js starter page.

- [ ] **Step 3: Add DESIGN.md tokens to `app/globals.css`**

Open `app/globals.css`. After the existing `@import "tailwindcss";` line
(Tailwind v4 scaffold puts Tailwind's import first), add:

```css
@theme {
  --color-aged-sepia: #271a00;
  --color-parchment: #faf8f5;
  --color-fog: #d1cfc7;
  --color-absolute-black: #000000;
  --color-pure-white: #ffffff;
  --color-moss-shadow: #7c7464;
  --color-deep-forest: #23291b;
  --color-teal-accent: #0f3639;
  --color-ash-mist: #e5e5e3;
  --color-slate-edge: #121516;

  --font-serif: Georgia, Cambria, "Times New Roman", Times, serif;
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono", Consolas, monospace;

  --radius-card: 12px;
  --radius-control: 4px;
  --radius-pill: 40px;
}

body {
  background-color: var(--color-parchment);
  color: var(--color-aged-sepia);
  font-family: var(--font-sans);
  letter-spacing: -0.028em;
}
```

Remove any leftover default dark-mode `@media (prefers-color-scheme: dark)`
block the scaffold generated in `globals.css` — this app has one fixed light
theme per DESIGN.md, no dark mode.

- [ ] **Step 4: Verify Tailwind tokens are usable**

Edit `app/page.tsx` temporarily to render
`<div className="bg-pure-white text-aged-sepia rounded-[12px] p-10">test</div>`,
run `npm run dev`, confirm in a browser at `http://localhost:3000` that the box
renders white-on-parchment with rounded corners. Revert `app/page.tsx` to the
default scaffold content afterward (Task 3 replaces it for real).

```bash
npm run dev
```

Expected: dev server starts, page loads without errors.

- [ ] **Step 5: Add Vitest + React Testing Library**

```bash
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
```

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

Add to `package.json` `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 6: Verify test tooling works with a throwaway test**

Create `lib/__smoke__.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke test', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run:

```bash
npm test
```

Expected: 1 test passes. Delete `lib/__smoke__.test.ts` after confirming.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with DESIGN.md theme tokens and Vitest"
```

---

## Task 2: Types file (`lib/types.ts`)

**Files:**
- Create: `lib/types.ts`
- Test: `lib/types.test.ts` (compile-time shape checks via sample objects)

**Interfaces:**
- Consumes: nothing
- Produces: every type used by every later task —
  `SourceType`, `EvidencePointer`, `FieldUpdate`, `ExecutionEvent`,
  `MatchRoute`, `MatchReasons`, `MatchResult`, `ScheduleActivity`,
  `ScheduleImpact`, `RecoveryOption`. Exact shapes below are final.

- [ ] **Step 1: Write `lib/types.ts`**

```ts
export type SourceType = 'dpr' | 'excel' | 'text' | 'voice';

export interface EvidencePointer {
  sourceId: string;
  sourceType: SourceType;
  excerpt?: string;
  page?: number;
}

export interface FieldUpdate {
  id: string;
  projectId: string;
  rawText: string;
  sourceFormat: SourceType;
  timestamp: string;
  evidence: EvidencePointer;
}

export interface ExecutionEvent {
  id: string;
  fieldUpdateId: string;
  activityDescription: string;
  location?: string;
  progressPercent: number;
  reportedDate: string;
  evidence: EvidencePointer;
}

export type MatchRoute = 'auto_post' | 'review' | 'unmatched';

export interface MatchReasons {
  identifiersMatched: string[];
  semanticSimilarity: number;
  contextChecks: {
    wbs: boolean;
    location: boolean;
    discipline: boolean;
    timing: boolean;
    dependencies: boolean;
  };
  contradictions?: string[];
}

export interface MatchCandidate {
  activityId: string;
  confidence: number;
}

export interface MatchResult {
  id: string;
  executionEventId: string;
  matchedActivityId: string | null;
  confidence: number;
  route: MatchRoute;
  reasons: MatchReasons;
  candidates?: MatchCandidate[];
}

export interface ScheduleActivity {
  id: string;
  wbsCode: string;
  description: string;
  plannedStart: string;
  plannedFinish: string;
  durationDays: number;
  dependencies: string[];
  currentProgressPercent: number;
  isCriticalPath: boolean;
}

export interface ScheduleImpact {
  affectedActivityIds: string[];
  criticalPathMoved: boolean;
  revisedCompletionDate: string;
  delayDays: number;
}

export interface RecoveryOption {
  id: string;
  description: string;
  projectedCompletionDate: string;
  tradeoffNote: string;
}
```

- [ ] **Step 2: Write a compile-shape test**

Create `lib/types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type {
  FieldUpdate,
  ExecutionEvent,
  MatchResult,
  ScheduleActivity,
  ScheduleImpact,
  RecoveryOption,
} from './types';

describe('type contract shapes', () => {
  it('accepts a minimal valid FieldUpdate', () => {
    const update: FieldUpdate = {
      id: 'fu-1',
      projectId: 'proj-1',
      rawText: 'Line 24 erection complete',
      sourceFormat: 'text',
      timestamp: '2026-08-01T10:00:00Z',
      evidence: { sourceId: 'doc-1', sourceType: 'text' },
    };
    expect(update.id).toBe('fu-1');
  });

  it('accepts an ExecutionEvent with optional fields omitted', () => {
    const event: ExecutionEvent = {
      id: 'ev-1',
      fieldUpdateId: 'fu-1',
      activityDescription: 'Spool erected',
      progressPercent: 45,
      reportedDate: '2026-08-01',
      evidence: { sourceId: 'doc-1', sourceType: 'text' },
    };
    expect(event.location).toBeUndefined();
  });

  it('accepts a MatchResult with null matchedActivityId (unmatched)', () => {
    const match: MatchResult = {
      id: 'm-1',
      executionEventId: 'ev-1',
      matchedActivityId: null,
      confidence: 0.12,
      route: 'unmatched',
      reasons: {
        identifiersMatched: [],
        semanticSimilarity: 0.2,
        contextChecks: {
          wbs: false,
          location: false,
          discipline: false,
          timing: false,
          dependencies: false,
        },
      },
    };
    expect(match.candidates).toBeUndefined();
  });

  it('accepts a ScheduleActivity', () => {
    const activity: ScheduleActivity = {
      id: 'act-1',
      wbsCode: 'L5.1.2',
      description: 'Pipe rack erection',
      plannedStart: '2026-07-01',
      plannedFinish: '2026-07-15',
      durationDays: 14,
      dependencies: [],
      currentProgressPercent: 60,
      isCriticalPath: true,
    };
    expect(activity.isCriticalPath).toBe(true);
  });

  it('accepts a ScheduleImpact', () => {
    const impact: ScheduleImpact = {
      affectedActivityIds: ['act-1'],
      criticalPathMoved: true,
      revisedCompletionDate: '2026-09-01',
      delayDays: 5,
    };
    expect(impact.delayDays).toBe(5);
  });

  it('accepts a RecoveryOption', () => {
    const option: RecoveryOption = {
      id: 'rec-1',
      description: 'Add second shift',
      projectedCompletionDate: '2026-08-28',
      tradeoffNote: 'Higher labor cost',
    };
    expect(option.id).toBe('rec-1');
  });
});
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npm test
```

Expected: all 6 tests in `lib/types.test.ts` pass (this is a compile-time
correctness check — if `types.ts` has a shape bug, `tsc`/vitest's esbuild
transform will fail to compile).

- [ ] **Step 4: Commit**

```bash
git add lib/types.ts lib/types.test.ts
git commit -m "Add lib/types.ts: the stage-boundary API contract"
```

---

## Task 3: Mock data — schedule activities

**Files:**
- Create: `lib/mock-data/activities.ts`
- Test: `lib/mock-data/activities.test.ts`

**Interfaces:**
- Consumes: `ScheduleActivity` from `lib/types.ts`
- Produces: `export const scheduleActivities: ScheduleActivity[]` — exactly 20
  activities, IDs `act-1` through `act-20`, with a dependency graph that
  produces a genuine critical path (a chain of activities where each depends
  on the previous, `isCriticalPath: true`, plus several parallel non-critical
  branches with slack).

- [ ] **Step 1: Write the failing test**

Create `lib/mock-data/activities.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scheduleActivities } from './activities';

describe('scheduleActivities fixture', () => {
  it('has exactly 20 activities', () => {
    expect(scheduleActivities).toHaveLength(20);
  });

  it('has unique IDs', () => {
    const ids = scheduleActivities.map((a) => a.id);
    expect(new Set(ids).size).toBe(20);
  });

  it('every dependency references a real activity ID', () => {
    const ids = new Set(scheduleActivities.map((a) => a.id));
    for (const activity of scheduleActivities) {
      for (const dep of activity.dependencies) {
        expect(ids.has(dep)).toBe(true);
      }
    }
  });

  it('has at least one critical-path chain of 4+ activities', () => {
    const critical = scheduleActivities.filter((a) => a.isCriticalPath);
    expect(critical.length).toBeGreaterThanOrEqual(4);
  });

  it('has at least one non-critical activity with dependencies (parallel branch)', () => {
    const nonCriticalWithDeps = scheduleActivities.filter(
      (a) => !a.isCriticalPath && a.dependencies.length > 0
    );
    expect(nonCriticalWithDeps.length).toBeGreaterThan(0);
  });

  it('every activity has a WBS code and positive duration', () => {
    for (const activity of scheduleActivities) {
      expect(activity.wbsCode.length).toBeGreaterThan(0);
      expect(activity.durationDays).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- activities.test
```

Expected: FAIL — `lib/mock-data/activities.ts` does not exist yet.

- [ ] **Step 3: Write `lib/mock-data/activities.ts`**

```ts
import type { ScheduleActivity } from '../types';

export const scheduleActivities: ScheduleActivity[] = [
  { id: 'act-1', wbsCode: 'L5.1.1', description: 'Site mobilization', plannedStart: '2026-06-01', plannedFinish: '2026-06-05', durationDays: 5, dependencies: [], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'act-2', wbsCode: 'L5.1.2', description: 'Foundation excavation - Area A', plannedStart: '2026-06-06', plannedFinish: '2026-06-15', durationDays: 10, dependencies: ['act-1'], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'act-3', wbsCode: 'L5.1.3', description: 'Foundation concrete pour - Area A', plannedStart: '2026-06-16', plannedFinish: '2026-06-25', durationDays: 10, dependencies: ['act-2'], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'act-4', wbsCode: 'L5.1.4', description: 'Foundation excavation - Area B', plannedStart: '2026-06-06', plannedFinish: '2026-06-13', durationDays: 8, dependencies: ['act-1'], currentProgressPercent: 100, isCriticalPath: false },
  { id: 'act-5', wbsCode: 'L5.1.5', description: 'Foundation concrete pour - Area B', plannedStart: '2026-06-14', plannedFinish: '2026-06-21', durationDays: 8, dependencies: ['act-4'], currentProgressPercent: 100, isCriticalPath: false },
  { id: 'act-6', wbsCode: 'L5.2.1', description: 'Structural steel erection - Bay 1', plannedStart: '2026-06-26', plannedFinish: '2026-07-10', durationDays: 15, dependencies: ['act-3'], currentProgressPercent: 90, isCriticalPath: true },
  { id: 'act-7', wbsCode: 'L5.2.2', description: 'Structural steel erection - Bay 2', plannedStart: '2026-06-22', plannedFinish: '2026-07-05', durationDays: 14, dependencies: ['act-5'], currentProgressPercent: 85, isCriticalPath: false },
  { id: 'act-8', wbsCode: 'L5.2.3', description: 'Pipe rack erection', plannedStart: '2026-07-11', plannedFinish: '2026-07-20', durationDays: 10, dependencies: ['act-6'], currentProgressPercent: 60, isCriticalPath: true },
  { id: 'act-9', wbsCode: 'L5.2.4', description: 'Vessel setting - Unit 100', plannedStart: '2026-07-06', plannedFinish: '2026-07-16', durationDays: 11, dependencies: ['act-7'], currentProgressPercent: 55, isCriticalPath: false },
  { id: 'act-10', wbsCode: 'L5.3.1', description: 'Line 24 piping erection', plannedStart: '2026-07-21', plannedFinish: '2026-08-04', durationDays: 15, dependencies: ['act-8'], currentProgressPercent: 45, isCriticalPath: true },
  { id: 'act-11', wbsCode: 'L5.3.2', description: 'Line 12 piping erection', plannedStart: '2026-07-17', plannedFinish: '2026-07-28', durationDays: 12, dependencies: ['act-9'], currentProgressPercent: 40, isCriticalPath: false },
  { id: 'act-12', wbsCode: 'L5.3.3', description: 'Instrumentation tubing - Unit 100', plannedStart: '2026-07-29', plannedFinish: '2026-08-10', durationDays: 13, dependencies: ['act-11'], currentProgressPercent: 20, isCriticalPath: false },
  { id: 'act-13', wbsCode: 'L5.4.1', description: 'Electrical cable tray installation', plannedStart: '2026-08-05', plannedFinish: '2026-08-15', durationDays: 11, dependencies: ['act-10'], currentProgressPercent: 10, isCriticalPath: true },
  { id: 'act-14', wbsCode: 'L5.4.2', description: 'Electrical cable pulling', plannedStart: '2026-08-16', plannedFinish: '2026-08-25', durationDays: 10, dependencies: ['act-13'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'act-15', wbsCode: 'L5.4.3', description: 'Motor termination - Unit 100', plannedStart: '2026-08-11', plannedFinish: '2026-08-18', durationDays: 8, dependencies: ['act-12'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'act-16', wbsCode: 'L5.5.1', description: 'Hydrotest - Line 24', plannedStart: '2026-08-26', plannedFinish: '2026-09-02', durationDays: 8, dependencies: ['act-14'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'act-17', wbsCode: 'L5.5.2', description: 'Hydrotest - Line 12', plannedStart: '2026-08-19', plannedFinish: '2026-08-26', durationDays: 8, dependencies: ['act-15'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'act-18', wbsCode: 'L5.6.1', description: 'Insulation - Line 24', plannedStart: '2026-09-03', plannedFinish: '2026-09-10', durationDays: 8, dependencies: ['act-16'], currentProgressPercent: 0, isCriticalPath: true },
  { id: 'act-19', wbsCode: 'L5.6.2', description: 'Painting - Bay 1 & 2', plannedStart: '2026-08-27', plannedFinish: '2026-09-05', durationDays: 10, dependencies: ['act-17'], currentProgressPercent: 0, isCriticalPath: false },
  { id: 'act-20', wbsCode: 'L5.7.1', description: 'Mechanical completion - Unit 100', plannedStart: '2026-09-11', plannedFinish: '2026-09-18', durationDays: 8, dependencies: ['act-18', 'act-19'], currentProgressPercent: 0, isCriticalPath: true },
];
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- activities.test
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add lib/mock-data/activities.ts lib/mock-data/activities.test.ts
git commit -m "Add schedule activities fixture (20 L5/L6 activities with dependencies)"
```

---

## Task 4: Mock data — field updates, execution events, match results

**Files:**
- Create: `lib/mock-data/field-updates.ts`
- Create: `lib/mock-data/execution-events.ts`
- Create: `lib/mock-data/match-results.ts`
- Test: `lib/mock-data/pipeline-fixtures.test.ts`

**Interfaces:**
- Consumes: `FieldUpdate`, `ExecutionEvent`, `MatchResult` from `lib/types.ts`;
  `scheduleActivities` from `lib/mock-data/activities.ts` (for valid
  `matchedActivityId` references)
- Produces: `export const fieldUpdates: FieldUpdate[]`,
  `export const executionEvents: ExecutionEvent[]`,
  `export const matchResults: MatchResult[]` — referentially linked
  (`ExecutionEvent.fieldUpdateId` → real `FieldUpdate.id`,
  `MatchResult.executionEventId` → real `ExecutionEvent.id`,
  `MatchResult.matchedActivityId` → real `ScheduleActivity.id` or `null`).

This is the fixture set carrying the six required hard cases from the spec.

- [ ] **Step 1: Write the failing test**

Create `lib/mock-data/pipeline-fixtures.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fieldUpdates } from './field-updates';
import { executionEvents } from './execution-events';
import { matchResults } from './match-results';
import { scheduleActivities } from './activities';

describe('pipeline fixtures referential integrity', () => {
  const fieldUpdateIds = new Set(fieldUpdates.map((f) => f.id));
  const executionEventIds = new Set(executionEvents.map((e) => e.id));
  const activityIds = new Set(scheduleActivities.map((a) => a.id));

  it('every ExecutionEvent references a real FieldUpdate', () => {
    for (const event of executionEvents) {
      expect(fieldUpdateIds.has(event.fieldUpdateId)).toBe(true);
    }
  });

  it('every MatchResult references a real ExecutionEvent', () => {
    for (const match of matchResults) {
      expect(executionEventIds.has(match.executionEventId)).toBe(true);
    }
  });

  it('every non-null matchedActivityId references a real ScheduleActivity', () => {
    for (const match of matchResults) {
      if (match.matchedActivityId !== null) {
        expect(activityIds.has(match.matchedActivityId)).toBe(true);
      }
    }
  });

  it('unmatched routes always have a null matchedActivityId', () => {
    for (const match of matchResults) {
      if (match.route === 'unmatched') {
        expect(match.matchedActivityId).toBeNull();
      }
    }
  });

  it('includes a contradiction case (progress went backwards)', () => {
    const hasContradiction = matchResults.some(
      (m) => m.reasons.contradictions && m.reasons.contradictions.length > 0
    );
    expect(hasContradiction).toBe(true);
  });

  it('includes an update with no matched identifiers (semantic+context only)', () => {
    const semanticOnly = matchResults.some(
      (m) => m.reasons.identifiersMatched.length === 0 && m.route !== 'unmatched'
    );
    expect(semanticOnly).toBe(true);
  });

  it('includes a genuinely unmatched activity', () => {
    const unmatched = matchResults.filter((m) => m.route === 'unmatched');
    expect(unmatched.length).toBeGreaterThanOrEqual(1);
  });

  it('includes multiple clean high-confidence auto_post cases', () => {
    const autoPosted = matchResults.filter(
      (m) => m.route === 'auto_post' && m.confidence >= 0.85
    );
    expect(autoPosted.length).toBeGreaterThanOrEqual(3);
  });

  it('includes two updates describing the same work differently, both matching the same activity', () => {
    const byActivity = new Map<string, number>();
    for (const match of matchResults) {
      if (match.matchedActivityId) {
        byActivity.set(
          match.matchedActivityId,
          (byActivity.get(match.matchedActivityId) ?? 0) + 1
        );
      }
    }
    const hasDuplicateMatch = [...byActivity.values()].some((count) => count >= 2);
    expect(hasDuplicateMatch).toBe(true);
  });

  it('includes a date-inconsistency case flagged in contextChecks.timing', () => {
    const timingFailure = matchResults.some((m) => m.reasons.contextChecks.timing === false);
    expect(timingFailure).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- pipeline-fixtures.test
```

Expected: FAIL — none of the three fixture files exist yet.

- [ ] **Step 3: Write `lib/mock-data/field-updates.ts`**

```ts
import type { FieldUpdate } from '../types';

export const fieldUpdates: FieldUpdate[] = [
  { id: 'fu-1', projectId: 'proj-1', rawText: 'Structural steel Bay 1 erection substantially complete, touch-up welding remaining.', sourceFormat: 'dpr', timestamp: '2026-07-08T18:00:00Z', evidence: { sourceId: 'dpr-2026-07-08', sourceType: 'dpr', excerpt: 'Structural steel Bay 1 erection substantially complete, touch-up welding remaining.', page: 2 } },
  { id: 'fu-2', projectId: 'proj-1', rawText: 'Pipe rack erection at 60% - columns and first two tiers set.', sourceFormat: 'dpr', timestamp: '2026-07-18T18:00:00Z', evidence: { sourceId: 'dpr-2026-07-18', sourceType: 'dpr', excerpt: 'Pipe rack erection at 60% - columns and first two tiers set.', page: 1 } },
  { id: 'fu-3', projectId: 'proj-1', rawText: 'Line 24 erection at 45% today.', sourceFormat: 'text', timestamp: '2026-08-03T09:00:00Z', evidence: { sourceId: 'sms-2026-08-03', sourceType: 'text', excerpt: 'Line 24 erection at 45% today.' } },
  { id: 'fu-4', projectId: 'proj-1', rawText: 'Spool erected for Line 24, roughly halfway through the run.', sourceFormat: 'text', timestamp: '2026-08-02T16:30:00Z', evidence: { sourceId: 'sms-2026-08-02', sourceType: 'text', excerpt: 'Spool erected for Line 24, roughly halfway through the run.' } },
  { id: 'fu-5', projectId: 'proj-1', rawText: 'Crew reports pipe work near the pump skid substantially done, 60% by their count.', sourceFormat: 'voice', timestamp: '2026-08-04T14:00:00Z', evidence: { sourceId: 'voice-2026-08-04', sourceType: 'voice', excerpt: 'Crew reports pipe work near the pump skid substantially done, 60% by their count.' } },
  { id: 'fu-6', projectId: 'proj-1', rawText: 'New scope: contractor started demo of legacy scaffold tower near Bay 3, not on baseline schedule.', sourceFormat: 'text', timestamp: '2026-08-05T11:00:00Z', evidence: { sourceId: 'sms-2026-08-05', sourceType: 'text', excerpt: 'New scope: contractor started demo of legacy scaffold tower near Bay 3, not on baseline schedule.' } },
  { id: 'fu-7', projectId: 'proj-1', rawText: 'Foundation concrete pour Area A complete, cured, forms stripped.', sourceFormat: 'dpr', timestamp: '2026-06-25T18:00:00Z', evidence: { sourceId: 'dpr-2026-06-25', sourceType: 'dpr', excerpt: 'Foundation concrete pour Area A complete, cured, forms stripped.', page: 1 } },
  { id: 'fu-8', projectId: 'proj-1', rawText: 'Excavation Area B backfilled and compacted, ready for pour.', sourceFormat: 'excel', timestamp: '2026-06-13T18:00:00Z', evidence: { sourceId: 'xls-progress-wk24', sourceType: 'excel', excerpt: 'Excavation Area B: 100% complete, backfilled and compacted.' } },
  { id: 'fu-9', projectId: 'proj-1', rawText: 'Vessel setting Unit 100 at 55%, second vessel landed on foundation.', sourceFormat: 'excel', timestamp: '2026-07-14T18:00:00Z', evidence: { sourceId: 'xls-progress-wk29', sourceType: 'excel', excerpt: 'Vessel setting Unit 100: 55% complete.' } },
  { id: 'fu-10', projectId: 'proj-1', rawText: 'Electrical cable tray L5.4.1 reported complete on 2026-09-20, ahead of dependent activity start.', sourceFormat: 'text', timestamp: '2026-09-20T10:00:00Z', evidence: { sourceId: 'sms-2026-09-20', sourceType: 'text', excerpt: 'Electrical cable tray L5.4.1 reported complete on 2026-09-20.' } },
];
```

- [ ] **Step 4: Write `lib/mock-data/execution-events.ts`**

```ts
import type { ExecutionEvent } from '../types';

export const executionEvents: ExecutionEvent[] = [
  { id: 'ev-1', fieldUpdateId: 'fu-1', activityDescription: 'Structural steel Bay 1 erection', location: 'Bay 1', progressPercent: 90, reportedDate: '2026-07-08', evidence: { sourceId: 'dpr-2026-07-08', sourceType: 'dpr', excerpt: 'Structural steel Bay 1 erection substantially complete, touch-up welding remaining.', page: 2 } },
  { id: 'ev-2', fieldUpdateId: 'fu-2', activityDescription: 'Pipe rack erection', location: 'Pipe rack', progressPercent: 60, reportedDate: '2026-07-18', evidence: { sourceId: 'dpr-2026-07-18', sourceType: 'dpr', excerpt: 'Pipe rack erection at 60% - columns and first two tiers set.', page: 1 } },
  { id: 'ev-3', fieldUpdateId: 'fu-3', activityDescription: 'Line 24 erection', location: 'Line 24', progressPercent: 45, reportedDate: '2026-08-03', evidence: { sourceId: 'sms-2026-08-03', sourceType: 'text', excerpt: 'Line 24 erection at 45% today.' } },
  { id: 'ev-4', fieldUpdateId: 'fu-4', activityDescription: 'Spool erected, Line 24', location: 'Line 24', progressPercent: 50, reportedDate: '2026-08-02', evidence: { sourceId: 'sms-2026-08-02', sourceType: 'text', excerpt: 'Spool erected for Line 24, roughly halfway through the run.' } },
  { id: 'ev-5', fieldUpdateId: 'fu-5', activityDescription: 'Pipe work near pump skid', progressPercent: 60, reportedDate: '2026-08-04', evidence: { sourceId: 'voice-2026-08-04', sourceType: 'voice', excerpt: 'Crew reports pipe work near the pump skid substantially done, 60% by their count.' } },
  { id: 'ev-6', fieldUpdateId: 'fu-6', activityDescription: 'Demo of legacy scaffold tower', location: 'Bay 3', progressPercent: 20, reportedDate: '2026-08-05', evidence: { sourceId: 'sms-2026-08-05', sourceType: 'text', excerpt: 'New scope: contractor started demo of legacy scaffold tower near Bay 3, not on baseline schedule.' } },
  { id: 'ev-7', fieldUpdateId: 'fu-7', activityDescription: 'Foundation concrete pour Area A', location: 'Area A', progressPercent: 100, reportedDate: '2026-06-25', evidence: { sourceId: 'dpr-2026-06-25', sourceType: 'dpr', excerpt: 'Foundation concrete pour Area A complete, cured, forms stripped.', page: 1 } },
  { id: 'ev-8', fieldUpdateId: 'fu-8', activityDescription: 'Foundation excavation Area B', location: 'Area B', progressPercent: 100, reportedDate: '2026-06-13', evidence: { sourceId: 'xls-progress-wk24', sourceType: 'excel', excerpt: 'Excavation Area B: 100% complete, backfilled and compacted.' } },
  { id: 'ev-9', fieldUpdateId: 'fu-9', activityDescription: 'Vessel setting Unit 100', location: 'Unit 100', progressPercent: 55, reportedDate: '2026-07-14', evidence: { sourceId: 'xls-progress-wk29', sourceType: 'excel', excerpt: 'Vessel setting Unit 100: 55% complete.' } },
  { id: 'ev-10', fieldUpdateId: 'fu-10', activityDescription: 'Electrical cable tray installation', location: 'Unit 100', progressPercent: 100, reportedDate: '2026-09-20', evidence: { sourceId: 'sms-2026-09-20', sourceType: 'text', excerpt: 'Electrical cable tray L5.4.1 reported complete on 2026-09-20.' } },
];
```

- [ ] **Step 5: Write `lib/mock-data/match-results.ts`**

```ts
import type { MatchResult } from '../types';

export const matchResults: MatchResult[] = [
  // Clean high-confidence auto_post cases
  {
    id: 'm-1', executionEventId: 'ev-1', matchedActivityId: 'act-6', confidence: 0.96, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.2.1', 'Bay 1'], semanticSimilarity: 0.94, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-2', executionEventId: 'ev-7', matchedActivityId: 'act-3', confidence: 0.98, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.1.3', 'Area A'], semanticSimilarity: 0.97, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-3', executionEventId: 'ev-8', matchedActivityId: 'act-4', confidence: 0.95, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.1.4', 'Area B'], semanticSimilarity: 0.93, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-4', executionEventId: 'ev-9', matchedActivityId: 'act-9', confidence: 0.91, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.2.4', 'Unit 100'], semanticSimilarity: 0.89, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  // Same work, described two different ways, both matching act-10 (Line 24 piping erection)
  {
    id: 'm-5', executionEventId: 'ev-3', matchedActivityId: 'act-10', confidence: 0.9, route: 'auto_post',
    reasons: { identifiersMatched: ['Line 24'], semanticSimilarity: 0.88, contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-6', executionEventId: 'ev-4', matchedActivityId: 'act-10', confidence: 0.78, route: 'review',
    reasons: { identifiersMatched: ['Line 24'], semanticSimilarity: 0.72, contextChecks: { wbs: false, location: true, discipline: true, timing: true, dependencies: true } },
    candidates: [ { activityId: 'act-10', confidence: 0.78 }, { activityId: 'act-11', confidence: 0.31 } ],
  },
  // Contradiction: pipe rack reported 60% (ev-2, m-7) then a later report effectively regresses via ev-5's ambiguous match
  {
    id: 'm-7', executionEventId: 'ev-2', matchedActivityId: 'act-8', confidence: 0.93, route: 'auto_post',
    reasons: { identifiersMatched: ['WBS L5.2.3', 'pipe rack'], semanticSimilarity: 0.9, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
  },
  {
    id: 'm-8', executionEventId: 'ev-5', matchedActivityId: 'act-8', confidence: 0.55, route: 'review',
    reasons: {
      identifiersMatched: [], semanticSimilarity: 0.61,
      contextChecks: { wbs: false, location: false, discipline: true, timing: true, dependencies: true },
      contradictions: ['Progress reported at 60% on 2026-07-18 (m-7), but a later report near the same area implies a lower completed state — needs planner review.'],
    },
    candidates: [ { activityId: 'act-8', confidence: 0.55 }, { activityId: 'act-9', confidence: 0.4 } ],
  },
  // Missing identifier, matched only via semantics + context
  {
    id: 'm-9', executionEventId: 'ev-6', matchedActivityId: null, confidence: 0.22, route: 'unmatched',
    reasons: { identifiersMatched: [], semanticSimilarity: 0.18, contextChecks: { wbs: false, location: false, discipline: false, timing: false, dependencies: false } },
  },
  // Date inconsistency: cable tray reported complete before dependent activity's planned window even opens relative to predecessor
  {
    id: 'm-10', executionEventId: 'ev-10', matchedActivityId: 'act-13', confidence: 0.62, route: 'review',
    reasons: {
      identifiersMatched: ['WBS L5.4.1'], semanticSimilarity: 0.8,
      contextChecks: { wbs: true, location: true, discipline: true, timing: false, dependencies: true },
      contradictions: ['Reported date 2026-09-20 falls before predecessor activity act-10 (Line 24 piping erection) planned finish of 2026-08-04 was confirmed complete — timing check failed.'],
    },
    candidates: [ { activityId: 'act-13', confidence: 0.62 } ],
  },
];
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npm test -- pipeline-fixtures.test
```

Expected: all 11 tests pass. If the "duplicate match" or "semantic-only" or
"timing failure" assertions fail, adjust the fixture data above (not the
test) to satisfy the documented hard cases — the test encodes the spec
requirement, the fixture must fit it.

- [ ] **Step 7: Commit**

```bash
git add lib/mock-data/field-updates.ts lib/mock-data/execution-events.ts lib/mock-data/match-results.ts lib/mock-data/pipeline-fixtures.test.ts
git commit -m "Add field update, execution event, and match result fixtures with required hard cases"
```

---

## Task 5: Mock data — schedule impact and recovery options

**Files:**
- Create: `lib/mock-data/schedule-impact.ts`
- Create: `lib/mock-data/recovery-options.ts`
- Test: `lib/mock-data/impact-and-recovery.test.ts`

**Interfaces:**
- Consumes: `ScheduleImpact`, `RecoveryOption` from `lib/types.ts`;
  `scheduleActivities` from `lib/mock-data/activities.ts`
- Produces: `export const scheduleImpact: ScheduleImpact`,
  `export const recoveryOptions: RecoveryOption[]` (at least 3 options).

- [ ] **Step 1: Write the failing test**

Create `lib/mock-data/impact-and-recovery.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { scheduleImpact } from './schedule-impact';
import { recoveryOptions } from './recovery-options';
import { scheduleActivities } from './activities';

describe('scheduleImpact fixture', () => {
  it('references real activity IDs', () => {
    const ids = new Set(scheduleActivities.map((a) => a.id));
    for (const id of scheduleImpact.affectedActivityIds) {
      expect(ids.has(id)).toBe(true);
    }
  });

  it('reports a positive delay consistent with criticalPathMoved', () => {
    expect(scheduleImpact.delayDays).toBeGreaterThan(0);
    expect(scheduleImpact.criticalPathMoved).toBe(true);
  });
});

describe('recoveryOptions fixture', () => {
  it('has at least 3 options', () => {
    expect(recoveryOptions.length).toBeGreaterThanOrEqual(3);
  });

  it('every option has a non-empty description and tradeoff note', () => {
    for (const option of recoveryOptions) {
      expect(option.description.length).toBeGreaterThan(0);
      expect(option.tradeoffNote.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- impact-and-recovery.test
```

Expected: FAIL — files don't exist yet.

- [ ] **Step 3: Write `lib/mock-data/schedule-impact.ts`**

```ts
import type { ScheduleImpact } from '../types';

export const scheduleImpact: ScheduleImpact = {
  affectedActivityIds: ['act-8', 'act-10', 'act-13', 'act-14', 'act-16', 'act-18', 'act-20'],
  criticalPathMoved: true,
  revisedCompletionDate: '2026-09-25',
  delayDays: 7,
};
```

- [ ] **Step 4: Write `lib/mock-data/recovery-options.ts`**

```ts
import type { RecoveryOption } from '../types';

export const recoveryOptions: RecoveryOption[] = [
  { id: 'rec-1', description: 'Add second shift on Line 24 piping erection (act-10)', projectedCompletionDate: '2026-09-20', tradeoffNote: 'Higher labor cost, requires night-shift supervision coverage.' },
  { id: 'rec-2', description: 'Resequence: start electrical cable tray (act-13) partially in parallel with piping tail end', projectedCompletionDate: '2026-09-22', tradeoffNote: 'Increases congestion risk in the work area; needs a safety review.' },
  { id: 'rec-3', description: 'Add manpower to pipe rack erection (act-8) to recover lost float', projectedCompletionDate: '2026-09-23', tradeoffNote: 'Additional crew mobilization lead time of 3-4 days.' },
];
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npm test -- impact-and-recovery.test
```

Expected: all 4 tests pass.

- [ ] **Step 6: Commit**

```bash
git add lib/mock-data/schedule-impact.ts lib/mock-data/recovery-options.ts lib/mock-data/impact-and-recovery.test.ts
git commit -m "Add schedule impact and recovery options fixtures"
```

---

## Task 6: Data-access layer (`lib/api/`)

**Files:**
- Create: `lib/api/updates.ts`
- Create: `lib/api/activities.ts`
- Create: `lib/api/matches.ts`
- Create: `lib/api/impact.ts`
- Create: `lib/api/recovery.ts`
- Test: `lib/api/api.test.ts`

**Interfaces:**
- Consumes: all mock-data modules from Task 3-5; all types from Task 2
- Produces (exact signatures every later UI task calls):
  - `getFieldUpdates(): Promise<FieldUpdate[]>`
  - `getExecutionEvents(): Promise<ExecutionEvent[]>`
  - `getActivities(): Promise<ScheduleActivity[]>`
  - `getActivity(id: string): Promise<ScheduleActivity | null>`
  - `getMatches(): Promise<MatchResult[]>`
  - `getMatch(id: string): Promise<MatchResult | null>`
  - `getScheduleImpact(): Promise<ScheduleImpact>`
  - `getRecoveryOptions(): Promise<RecoveryOption[]>`

- [ ] **Step 1: Write the failing test**

Create `lib/api/api.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getFieldUpdates, getExecutionEvents } from './updates';
import { getActivities, getActivity } from './activities';
import { getMatches, getMatch } from './matches';
import { getScheduleImpact } from './impact';
import { getRecoveryOptions } from './recovery';

describe('data-access layer', () => {
  it('getFieldUpdates returns a promise resolving to an array', async () => {
    const result = getFieldUpdates();
    expect(result).toBeInstanceOf(Promise);
    const updates = await result;
    expect(updates.length).toBeGreaterThan(0);
  });

  it('getExecutionEvents resolves to an array', async () => {
    const events = await getExecutionEvents();
    expect(events.length).toBeGreaterThan(0);
  });

  it('getActivities resolves to exactly 20 activities', async () => {
    const activities = await getActivities();
    expect(activities).toHaveLength(20);
  });

  it('getActivity returns a matching activity for a real ID', async () => {
    const activity = await getActivity('act-1');
    expect(activity?.id).toBe('act-1');
  });

  it('getActivity returns null for an unknown ID', async () => {
    const activity = await getActivity('does-not-exist');
    expect(activity).toBeNull();
  });

  it('getMatches resolves to an array', async () => {
    const matches = await getMatches();
    expect(matches.length).toBeGreaterThan(0);
  });

  it('getMatch returns a matching result for a real ID', async () => {
    const match = await getMatch('m-1');
    expect(match?.id).toBe('m-1');
  });

  it('getMatch returns null for an unknown ID', async () => {
    const match = await getMatch('does-not-exist');
    expect(match).toBeNull();
  });

  it('getScheduleImpact resolves to a single ScheduleImpact object', async () => {
    const impact = await getScheduleImpact();
    expect(impact.delayDays).toBeGreaterThan(0);
  });

  it('getRecoveryOptions resolves to an array of at least 3', async () => {
    const options = await getRecoveryOptions();
    expect(options.length).toBeGreaterThanOrEqual(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- api.test
```

Expected: FAIL — none of the `lib/api/*` files exist yet.

- [ ] **Step 3: Write `lib/api/updates.ts`**

```ts
import type { FieldUpdate, ExecutionEvent } from '../types';
import { fieldUpdates } from '../mock-data/field-updates';
import { executionEvents } from '../mock-data/execution-events';

export async function getFieldUpdates(): Promise<FieldUpdate[]> {
  return fieldUpdates;
}

export async function getExecutionEvents(): Promise<ExecutionEvent[]> {
  return executionEvents;
}
```

- [ ] **Step 4: Write `lib/api/activities.ts`**

```ts
import type { ScheduleActivity } from '../types';
import { scheduleActivities } from '../mock-data/activities';

export async function getActivities(): Promise<ScheduleActivity[]> {
  return scheduleActivities;
}

export async function getActivity(id: string): Promise<ScheduleActivity | null> {
  return scheduleActivities.find((a) => a.id === id) ?? null;
}
```

- [ ] **Step 5: Write `lib/api/matches.ts`**

```ts
import type { MatchResult } from '../types';
import { matchResults } from '../mock-data/match-results';

export async function getMatches(): Promise<MatchResult[]> {
  return matchResults;
}

export async function getMatch(id: string): Promise<MatchResult | null> {
  return matchResults.find((m) => m.id === id) ?? null;
}
```

- [ ] **Step 6: Write `lib/api/impact.ts`**

```ts
import type { ScheduleImpact } from '../types';
import { scheduleImpact } from '../mock-data/schedule-impact';

export async function getScheduleImpact(): Promise<ScheduleImpact> {
  return scheduleImpact;
}
```

- [ ] **Step 7: Write `lib/api/recovery.ts`**

```ts
import type { RecoveryOption } from '../types';
import { recoveryOptions } from '../mock-data/recovery-options';

export async function getRecoveryOptions(): Promise<RecoveryOption[]> {
  return recoveryOptions;
}
```

- [ ] **Step 8: Run tests to verify they pass**

```bash
npm test -- api.test
```

Expected: all 10 tests pass.

- [ ] **Step 9: Run the full test suite**

```bash
npm test
```

Expected: every test across all files passes (types, activities,
pipeline-fixtures, impact-and-recovery, api).

- [ ] **Step 10: Commit**

```bash
git add lib/api/
git commit -m "Add async data-access layer over mock fixtures"
```

---

## Task 7: Shared UI components (Skeleton, ErrorState, ConfidenceBadge, RouteBadge)

**Files:**
- Create: `components/shared/Skeleton.tsx`
- Create: `components/shared/ErrorState.tsx`
- Create: `components/shared/ConfidenceBadge.tsx`
- Create: `components/shared/RouteBadge.tsx`
- Test: `components/shared/badges.test.tsx`

**Interfaces:**
- Consumes: `MatchRoute` from `lib/types.ts`
- Produces:
  - `<Skeleton variant="row" | "card" count?={number} />`
  - `<ErrorState message={string} />`
  - `<ConfidenceBadge confidence={number} />`
  - `<RouteBadge route={MatchRoute} />`
  These four are used by every screen from Task 8 onward — signatures are
  final.

- [ ] **Step 1: Write the failing test**

Create `components/shared/badges.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfidenceBadge } from './ConfidenceBadge';
import { RouteBadge } from './RouteBadge';
import { Skeleton } from './Skeleton';
import { ErrorState } from './ErrorState';

describe('ConfidenceBadge', () => {
  it('renders the confidence as a percentage', () => {
    render(<ConfidenceBadge confidence={0.87} />);
    expect(screen.getByText('87%')).toBeInTheDocument();
  });
});

describe('RouteBadge', () => {
  it('renders auto_post as "Auto-posted"', () => {
    render(<RouteBadge route="auto_post" />);
    expect(screen.getByText('Auto-posted')).toBeInTheDocument();
  });

  it('renders review as "Needs review"', () => {
    render(<RouteBadge route="review" />);
    expect(screen.getByText('Needs review')).toBeInTheDocument();
  });

  it('renders unmatched as "Unmatched"', () => {
    render(<RouteBadge route="unmatched" />);
    expect(screen.getByText('Unmatched')).toBeInTheDocument();
  });
});

describe('Skeleton', () => {
  it('renders the requested count of row skeletons', () => {
    const { container } = render(<Skeleton variant="row" count={3} />);
    expect(container.querySelectorAll('[data-skeleton-item]')).toHaveLength(3);
  });
});

describe('ErrorState', () => {
  it('renders the provided message', () => {
    render(<ErrorState message="Failed to load activities" />);
    expect(screen.getByText('Failed to load activities')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- badges.test
```

Expected: FAIL — none of the four components exist yet.

- [ ] **Step 3: Write `components/shared/ConfidenceBadge.tsx`**

```tsx
export function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const tone =
    confidence >= 0.85 ? 'text-aged-sepia bg-fog/40' :
    confidence >= 0.5 ? 'text-teal-accent bg-teal-accent/10' :
    'text-moss-shadow bg-fog/60';

  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-1 font-mono text-xs ${tone}`}
    >
      {pct}%
    </span>
  );
}
```

- [ ] **Step 4: Write `components/shared/RouteBadge.tsx`**

```tsx
import type { MatchRoute } from '@/lib/types';

const LABELS: Record<MatchRoute, string> = {
  auto_post: 'Auto-posted',
  review: 'Needs review',
  unmatched: 'Unmatched',
};

const TONES: Record<MatchRoute, string> = {
  auto_post: 'text-aged-sepia bg-fog/40',
  review: 'text-teal-accent bg-teal-accent/10',
  unmatched: 'text-moss-shadow bg-fog/60',
};

export function RouteBadge({ route }: { route: MatchRoute }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-1 font-mono text-xs uppercase tracking-wide ${TONES[route]}`}
    >
      {LABELS[route]}
    </span>
  );
}
```

- [ ] **Step 5: Write `components/shared/Skeleton.tsx`**

```tsx
export function Skeleton({
  variant,
  count = 1,
}: {
  variant: 'row' | 'card';
  count?: number;
}) {
  const items = Array.from({ length: count });
  const base = 'animate-pulse bg-fog/50 rounded-[4px]';

  return (
    <div className="flex flex-col gap-2" role="status" aria-label="Loading">
      {items.map((_, i) => (
        <div
          key={i}
          data-skeleton-item
          className={
            variant === 'row'
              ? `${base} h-12 w-full`
              : `${base} h-40 w-full rounded-[12px]`
          }
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Write `components/shared/ErrorState.tsx`**

```tsx
export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-[12px] border border-fog bg-pure-white p-6 text-moss-shadow">
      <p className="font-sans text-sm">{message}</p>
    </div>
  );
}
```

- [ ] **Step 7: Run test to verify it passes**

```bash
npm test -- badges.test
```

Expected: all 6 tests pass.

- [ ] **Step 8: Commit**

```bash
git add components/shared/
git commit -m "Add shared Skeleton, ErrorState, ConfidenceBadge, RouteBadge components"
```

---

## Task 8: Planner Console (`app/page.tsx`)

**Files:**
- Create: `components/planner/ProjectHeader.tsx`
- Create: `components/planner/ActivitiesTable.tsx`
- Create: `components/planner/CountsStrip.tsx`
- Create: `components/planner/ImpactPanel.tsx`
- Create: `components/planner/RecoveryOptions.tsx`
- Modify: `app/page.tsx`
- Test: `components/planner/CountsStrip.test.tsx`
- Test: `components/planner/ActivitiesTable.test.tsx`

**Interfaces:**
- Consumes: `getActivities()`, `getMatches()`, `getScheduleImpact()`,
  `getRecoveryOptions()` from `lib/api/*`; `ConfidenceBadge`, `RouteBadge`,
  `Skeleton`, `ErrorState` from `components/shared/*`
- Produces: the `/` route, fully rendering all five spec sections

- [ ] **Step 1: Write the failing test for CountsStrip**

Create `components/planner/CountsStrip.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountsStrip } from './CountsStrip';
import type { MatchResult } from '@/lib/types';

const baseReasons = {
  identifiersMatched: [],
  semanticSimilarity: 0.5,
  contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true },
};

const matches: MatchResult[] = [
  { id: 'm-1', executionEventId: 'ev-1', matchedActivityId: 'act-1', confidence: 0.9, route: 'auto_post', reasons: baseReasons },
  { id: 'm-2', executionEventId: 'ev-2', matchedActivityId: 'act-2', confidence: 0.9, route: 'auto_post', reasons: baseReasons },
  { id: 'm-3', executionEventId: 'ev-3', matchedActivityId: 'act-3', confidence: 0.6, route: 'review', reasons: baseReasons },
  { id: 'm-4', executionEventId: 'ev-4', matchedActivityId: null, confidence: 0.1, route: 'unmatched', reasons: baseReasons },
];

describe('CountsStrip', () => {
  it('shows correct counts per route', () => {
    render(<CountsStrip matches={matches} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // auto_post count
    expect(screen.getAllByText('1')).toHaveLength(2); // review count and unmatched count
  });
});
```

- [ ] **Step 2: Write the failing test for ActivitiesTable**

Create `components/planner/ActivitiesTable.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ActivitiesTable } from './ActivitiesTable';
import type { ScheduleActivity } from '@/lib/types';

const activities: ScheduleActivity[] = [
  { id: 'act-1', wbsCode: 'L5.1.1', description: 'Site mobilization', plannedStart: '2026-06-01', plannedFinish: '2026-06-05', durationDays: 5, dependencies: [], currentProgressPercent: 100, isCriticalPath: true },
  { id: 'act-2', wbsCode: 'L5.1.2', description: 'Foundation excavation', plannedStart: '2026-06-06', plannedFinish: '2026-06-15', durationDays: 10, dependencies: ['act-1'], currentProgressPercent: 50, isCriticalPath: false },
];

describe('ActivitiesTable', () => {
  it('renders every activity WBS code and description', () => {
    render(<ActivitiesTable activities={activities} />);
    expect(screen.getByText('L5.1.1')).toBeInTheDocument();
    expect(screen.getByText('Site mobilization')).toBeInTheDocument();
    expect(screen.getByText('L5.1.2')).toBeInTheDocument();
  });

  it('marks critical-path rows distinctly via data attribute', () => {
    render(<ActivitiesTable activities={activities} />);
    const row = screen.getByText('Site mobilization').closest('tr');
    expect(row).toHaveAttribute('data-critical-path', 'true');
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- CountsStrip.test ActivitiesTable.test
```

Expected: FAIL — components don't exist yet.

- [ ] **Step 4: Write `components/planner/CountsStrip.tsx`**

```tsx
import type { MatchResult } from '@/lib/types';

export function CountsStrip({ matches }: { matches: MatchResult[] }) {
  const autoPosted = matches.filter((m) => m.route === 'auto_post').length;
  const review = matches.filter((m) => m.route === 'review').length;
  const unmatched = matches.filter((m) => m.route === 'unmatched').length;

  const items = [
    { label: 'Auto-posted', value: autoPosted },
    { label: 'Awaiting review', value: review },
    { label: 'Unmatched', value: unmatched },
  ];

  return (
    <div className="grid grid-cols-3 gap-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-[12px] bg-pure-white p-6">
          <p className="font-mono text-3xl text-aged-sepia">{item.value}</p>
          <p className="mt-1 font-sans text-sm text-moss-shadow">{item.label}</p>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 5: Write `components/planner/ActivitiesTable.tsx`**

```tsx
import type { ScheduleActivity } from '@/lib/types';

export function ActivitiesTable({ activities }: { activities: ScheduleActivity[] }) {
  return (
    <div className="overflow-x-auto rounded-[12px] bg-pure-white p-6">
      <table className="w-full text-left font-sans text-sm">
        <thead>
          <tr className="border-b border-fog text-moss-shadow">
            <th className="py-2 pr-4 font-mono text-xs uppercase">WBS</th>
            <th className="py-2 pr-4">Description</th>
            <th className="py-2 pr-4">Planned</th>
            <th className="py-2 pr-4">Progress</th>
            <th className="py-2 pr-4">Dependencies</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((activity) => (
            <tr
              key={activity.id}
              data-critical-path={activity.isCriticalPath}
              className={
                activity.isCriticalPath
                  ? 'border-b border-fog bg-teal-accent/5'
                  : 'border-b border-fog'
              }
            >
              <td className="py-3 pr-4 font-mono text-xs">{activity.wbsCode}</td>
              <td className="py-3 pr-4">{activity.description}</td>
              <td className="py-3 pr-4 text-moss-shadow">
                {activity.plannedStart} &rarr; {activity.plannedFinish}
              </td>
              <td className="py-3 pr-4">
                <div className="h-2 w-32 overflow-hidden rounded-[4px] bg-fog">
                  <div
                    className="h-full bg-teal-accent"
                    style={{ width: `${activity.currentProgressPercent}%` }}
                  />
                </div>
              </td>
              <td className="py-3 pr-4">
                <div className="flex flex-wrap gap-1">
                  {activity.dependencies.map((dep) => (
                    <span
                      key={dep}
                      className="rounded-[4px] bg-fog/50 px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {dep}
                    </span>
                  ))}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- CountsStrip.test ActivitiesTable.test
```

Expected: all 3 tests pass.

- [ ] **Step 7: Write `components/planner/ProjectHeader.tsx`**

```tsx
export function ProjectHeader({
  name,
  baselineCompletionDate,
  forecastCompletionDate,
  delayDays,
}: {
  name: string;
  baselineCompletionDate: string;
  forecastCompletionDate: string;
  delayDays: number;
}) {
  const isSlipping = delayDays > 0;

  return (
    <div className="rounded-[12px] bg-pure-white p-10">
      <h1 className="font-serif text-4xl font-light text-aged-sepia">{name}</h1>
      <div className="mt-4 flex flex-wrap gap-8 font-sans text-sm">
        <div>
          <p className="text-moss-shadow">Baseline completion</p>
          <p className="mt-1 text-aged-sepia">{baselineCompletionDate}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Forecast completion</p>
          <p className="mt-1 text-aged-sepia">{forecastCompletionDate}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Delay</p>
          <p
            className={
              isSlipping
                ? 'mt-1 font-mono text-teal-accent'
                : 'mt-1 font-mono text-aged-sepia'
            }
          >
            {delayDays} day{delayDays === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 8: Write `components/planner/ImpactPanel.tsx`**

```tsx
import type { ScheduleImpact } from '@/lib/types';

export function ImpactPanel({ impact }: { impact: ScheduleImpact }) {
  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <h2 className="font-serif text-xl text-aged-sepia">Schedule impact</h2>
      <div className="mt-4 grid grid-cols-3 gap-4 font-sans text-sm">
        <div>
          <p className="text-moss-shadow">Critical path moved</p>
          <p className="mt-1 text-aged-sepia">{impact.criticalPathMoved ? 'Yes' : 'No'}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Revised completion</p>
          <p className="mt-1 text-aged-sepia">{impact.revisedCompletionDate}</p>
        </div>
        <div>
          <p className="text-moss-shadow">Delay</p>
          <p className="mt-1 text-aged-sepia">{impact.delayDays} days</p>
        </div>
      </div>
      <p className="mt-4 font-mono text-xs text-moss-shadow">
        Affected activities: {impact.affectedActivityIds.join(', ')}
      </p>
    </div>
  );
}
```

- [ ] **Step 9: Write `components/planner/RecoveryOptions.tsx`**

```tsx
import type { RecoveryOption } from '@/lib/types';

export function RecoveryOptions({ options }: { options: RecoveryOption[] }) {
  return (
    <div>
      <h2 className="font-serif text-xl text-aged-sepia">Recovery options</h2>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {options.map((option) => (
          <div key={option.id} className="rounded-[12px] bg-pure-white p-6">
            <p className="font-sans text-sm text-aged-sepia">{option.description}</p>
            <p className="mt-3 font-mono text-xs text-teal-accent">
              Projected: {option.projectedCompletionDate}
            </p>
            <p className="mt-2 font-sans text-xs text-moss-shadow">{option.tradeoffNote}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10: Write `app/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { getActivities } from '@/lib/api/activities';
import { getMatches } from '@/lib/api/matches';
import { getScheduleImpact } from '@/lib/api/impact';
import { getRecoveryOptions } from '@/lib/api/recovery';
import { ProjectHeader } from '@/components/planner/ProjectHeader';
import { ActivitiesTable } from '@/components/planner/ActivitiesTable';
import { CountsStrip } from '@/components/planner/CountsStrip';
import { ImpactPanel } from '@/components/planner/ImpactPanel';
import { RecoveryOptions } from '@/components/planner/RecoveryOptions';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import type { ScheduleActivity, MatchResult, ScheduleImpact, RecoveryOption } from '@/lib/types';

export default function PlannerConsole() {
  const [activities, setActivities] = useState<ScheduleActivity[] | null>(null);
  const [matches, setMatches] = useState<MatchResult[] | null>(null);
  const [impact, setImpact] = useState<ScheduleImpact | null>(null);
  const [recovery, setRecovery] = useState<RecoveryOption[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getActivities(), getMatches(), getScheduleImpact(), getRecoveryOptions()])
      .then(([a, m, i, r]) => {
        setActivities(a);
        setMatches(m);
        setImpact(i);
        setRecovery(r);
      })
      .catch(() => setError('Failed to load project data.'));
  }, []);

  if (error) {
    return (
      <main className="mx-auto max-w-6xl p-10">
        <ErrorState message={error} />
      </main>
    );
  }

  if (!activities || !matches || !impact || !recovery) {
    return (
      <main className="mx-auto max-w-6xl space-y-7 p-10">
        <Skeleton variant="card" count={1} />
        <Skeleton variant="row" count={5} />
      </main>
    );
  }

  const delayDays = impact.delayDays;
  const baseline = activities.reduce(
    (latest, a) => (a.plannedFinish > latest ? a.plannedFinish : latest),
    activities[0]?.plannedFinish ?? ''
  );

  return (
    <main className="mx-auto max-w-6xl space-y-7 p-10">
      <ProjectHeader
        name="Unit 100 Piping &amp; Electrical Package"
        baselineCompletionDate={baseline}
        forecastCompletionDate={impact.revisedCompletionDate}
        delayDays={delayDays}
      />
      <CountsStrip matches={matches} />
      <ActivitiesTable activities={activities} />
      <ImpactPanel impact={impact} />
      <RecoveryOptions options={recovery} />
    </main>
  );
}
```

Note: `ProjectHeader`'s `name` prop should be a plain string, not the JSX
entity `&amp;` — correct it to `"Unit 100 Piping & Electrical Package"` when
writing the actual file (the entity form above is a plan-formatting artifact
of embedding JSX text in this document).

- [ ] **Step 11: Run the dev server and manually verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000`. Verify: project header renders with delay
badge, counts strip shows 5 auto_post / 3 review / 2 unmatched (per the
Task 4 fixtures — recompute the actual numbers from `match-results.ts` and
confirm they match what renders), all 20 activities render in the table with
critical-path rows visually distinct (teal-tinted background), impact panel
and recovery option cards render.

- [ ] **Step 12: Run full test suite**

```bash
npm test
```

Expected: all tests across the project pass.

- [ ] **Step 13: Commit**

```bash
git add app/page.tsx components/planner/
git commit -m "Build Planner Console screen"
```

---

## Task 9: Review Queue (`app/review/page.tsx`)

**Files:**
- Create: `lib/store/review-store.tsx`
- Create: `components/review/ReviewRow.tsx`
- Create: `components/review/CandidateList.tsx`
- Modify: `app/layout.tsx` — wrap children in `ReviewStoreProvider`
- Create: `app/review/page.tsx`
- Test: `lib/store/review-store.test.tsx`
- Test: `components/review/ReviewRow.test.tsx`

**Interfaces:**
- Consumes: `getMatches()`, `getExecutionEvents()`, `getFieldUpdates()` from
  `lib/api/*`; `ConfidenceBadge`, `RouteBadge` from `components/shared/*`
- Produces:
  - `ReviewStoreProvider`, `useReviewStore()` returning
    `{ matches: MatchResult[], loading: boolean, error: string | null,
    accept: (matchId: string) => void, reject: (matchId: string) => void,
    reassign: (matchId: string, newActivityId: string) => void }`
  - the `/review` route

- [ ] **Step 1: Write the failing test for the store**

Create `lib/store/review-store.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReviewStoreProvider, useReviewStore } from './review-store';

function TestConsumer() {
  const { matches, loading, accept, reject, reassign } = useReviewStore();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="count">{matches.length}</div>
      <button onClick={() => accept('m-8')}>accept</button>
      <button onClick={() => reject('m-8')}>reject</button>
      <button onClick={() => reassign('m-8', 'act-9')}>reassign</button>
      {matches.map((m) => (
        <div key={m.id} data-testid={`match-${m.id}`}>
          {m.route} / {m.matchedActivityId}
        </div>
      ))}
    </div>
  );
}

describe('review-store', () => {
  it('accept sets route to auto_post', async () => {
    render(
      <ReviewStoreProvider>
        <TestConsumer />
      </ReviewStoreProvider>
    );
    await waitFor(() => expect(screen.getByTestId('count')).toBeInTheDocument());
    screen.getByText('accept').click();
    await waitFor(() =>
      expect(screen.getByTestId('match-m-8').textContent).toContain('auto_post')
    );
  });

  it('reassign updates matchedActivityId', async () => {
    render(
      <ReviewStoreProvider>
        <TestConsumer />
      </ReviewStoreProvider>
    );
    await waitFor(() => expect(screen.getByTestId('count')).toBeInTheDocument());
    screen.getByText('reassign').click();
    await waitFor(() =>
      expect(screen.getByTestId('match-m-8').textContent).toContain('act-9')
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm test -- review-store.test
```

Expected: FAIL — `lib/store/review-store.tsx` doesn't exist yet.

- [ ] **Step 3: Write `lib/store/review-store.tsx`**

```tsx
'use client';

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { MatchResult } from '../types';
import { getMatches } from '../api/matches';

type State = {
  matches: MatchResult[];
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: 'loaded'; matches: MatchResult[] }
  | { type: 'error'; message: string }
  | { type: 'accept'; matchId: string }
  | { type: 'reject'; matchId: string }
  | { type: 'reassign'; matchId: string; newActivityId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { matches: action.matches, loading: false, error: null };
    case 'error':
      return { ...state, loading: false, error: action.message };
    case 'accept':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId ? { ...m, route: 'auto_post' } : m
        ),
      };
    case 'reject':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId ? { ...m, route: 'unmatched', matchedActivityId: null } : m
        ),
      };
    case 'reassign':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId
            ? { ...m, matchedActivityId: action.newActivityId, route: 'auto_post' }
            : m
        ),
      };
    default:
      return state;
  }
}

type ReviewStoreValue = State & {
  accept: (matchId: string) => void;
  reject: (matchId: string) => void;
  reassign: (matchId: string, newActivityId: string) => void;
};

const ReviewStoreContext = createContext<ReviewStoreValue | null>(null);

export function ReviewStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { matches: [], loading: true, error: null });

  useEffect(() => {
    getMatches()
      .then((matches) => dispatch({ type: 'loaded', matches }))
      .catch(() => dispatch({ type: 'error', message: 'Failed to load matches.' }));
  }, []);

  const value: ReviewStoreValue = {
    ...state,
    accept: (matchId) => dispatch({ type: 'accept', matchId }),
    reject: (matchId) => dispatch({ type: 'reject', matchId }),
    reassign: (matchId, newActivityId) => dispatch({ type: 'reassign', matchId, newActivityId }),
  };

  return <ReviewStoreContext.Provider value={value}>{children}</ReviewStoreContext.Provider>;
}

export function useReviewStore(): ReviewStoreValue {
  const ctx = useContext(ReviewStoreContext);
  if (!ctx) throw new Error('useReviewStore must be used within ReviewStoreProvider');
  return ctx;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npm test -- review-store.test
```

Expected: both tests pass.

- [ ] **Step 5: Wrap the app in the provider — modify `app/layout.tsx`**

Read the current `app/layout.tsx` first (created by `create-next-app` in
Task 1) and wrap the `{children}` inside `<body>` with
`<ReviewStoreProvider>`:

```tsx
import { ReviewStoreProvider } from '@/lib/store/review-store';
// ...existing imports...

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={/* existing className */}>
        <ReviewStoreProvider>{children}</ReviewStoreProvider>
      </body>
    </html>
  );
}
```

Preserve whatever font-variable `className` the scaffold already set on
`<body>` — only add the provider wrapper around `{children}`.

- [ ] **Step 6: Write the failing test for ReviewRow**

Create `components/review/ReviewRow.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReviewRow } from './ReviewRow';
import type { MatchResult, ExecutionEvent, FieldUpdate } from '@/lib/types';

const fieldUpdate: FieldUpdate = {
  id: 'fu-1', projectId: 'proj-1', rawText: 'Line 24 erection at 45% today.',
  sourceFormat: 'text', timestamp: '2026-08-03T09:00:00Z',
  evidence: { sourceId: 'sms-1', sourceType: 'text' },
};

const event: ExecutionEvent = {
  id: 'ev-1', fieldUpdateId: 'fu-1', activityDescription: 'Line 24 erection',
  progressPercent: 45, reportedDate: '2026-08-03',
  evidence: { sourceId: 'sms-1', sourceType: 'text' },
};

const matchNoCandidates: MatchResult = {
  id: 'm-1', executionEventId: 'ev-1', matchedActivityId: 'act-10', confidence: 0.6, route: 'review',
  reasons: { identifiersMatched: [], semanticSimilarity: 0.5, contextChecks: { wbs: true, location: true, discipline: true, timing: true, dependencies: true } },
};

describe('ReviewRow', () => {
  it('renders the verbatim field text', () => {
    render(
      <ReviewRow match={matchNoCandidates} event={event} fieldUpdate={fieldUpdate}
        onAccept={vi.fn()} onReject={vi.fn()} onReassign={vi.fn()} />
    );
    expect(screen.getByText('Line 24 erection at 45% today.')).toBeInTheDocument();
  });

  it('links to the evidence view for this match', () => {
    render(
      <ReviewRow match={matchNoCandidates} event={event} fieldUpdate={fieldUpdate}
        onAccept={vi.fn()} onReject={vi.fn()} onReassign={vi.fn()} />
    );
    const link = screen.getByRole('link', { name: /why/i });
    expect(link).toHaveAttribute('href', '/evidence/m-1');
  });

  it('shows a "no alternative matches" message when candidates is undefined', () => {
    render(
      <ReviewRow match={matchNoCandidates} event={event} fieldUpdate={fieldUpdate}
        onAccept={vi.fn()} onReject={vi.fn()} onReassign={vi.fn()} expanded />
    );
    expect(screen.getByText(/no alternative matches/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 7: Run test to verify it fails**

```bash
npm test -- ReviewRow.test
```

Expected: FAIL — `ReviewRow.tsx` doesn't exist yet.

- [ ] **Step 8: Write `components/review/CandidateList.tsx`**

```tsx
import type { MatchCandidate } from '@/lib/types';

export function CandidateList({
  candidates,
  onSelect,
}: {
  candidates: MatchCandidate[] | undefined;
  onSelect: (activityId: string) => void;
}) {
  if (!candidates || candidates.length === 0) {
    return <p className="font-sans text-xs text-moss-shadow">No alternative matches found.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {candidates.map((c) => (
        <li key={c.activityId} className="flex items-center justify-between">
          <span className="font-mono text-xs text-aged-sepia">{c.activityId}</span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-moss-shadow">
              {Math.round(c.confidence * 100)}%
            </span>
            <button
              onClick={() => onSelect(c.activityId)}
              className="rounded-[4px] border border-fog px-2 py-1 font-sans text-xs text-aged-sepia hover:bg-fog/30"
            >
              Select
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
```

- [ ] **Step 9: Write `components/review/ReviewRow.tsx`**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { MatchResult, ExecutionEvent, FieldUpdate } from '@/lib/types';
import { ConfidenceBadge } from '@/components/shared/ConfidenceBadge';
import { RouteBadge } from '@/components/shared/RouteBadge';
import { CandidateList } from './CandidateList';

export function ReviewRow({
  match,
  event,
  fieldUpdate,
  onAccept,
  onReject,
  onReassign,
  expanded: expandedProp,
}: {
  match: MatchResult;
  event: ExecutionEvent | undefined;
  fieldUpdate: FieldUpdate | undefined;
  onAccept: (matchId: string) => void;
  onReject: (matchId: string) => void;
  onReassign: (matchId: string, newActivityId: string) => void;
  expanded?: boolean;
}) {
  const [expandedState, setExpandedState] = useState(expandedProp ?? false);
  const isUnmatched = match.route === 'unmatched';

  return (
    <div
      className={
        isUnmatched
          ? 'rounded-[12px] bg-pure-white p-6 border border-fog'
          : 'rounded-[12px] bg-pure-white p-6'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex-1">
          <p className="font-sans text-sm text-aged-sepia">
            {fieldUpdate?.rawText ?? 'Field text unavailable'}
          </p>
          <p className="mt-1 font-mono text-xs text-moss-shadow">
            {isUnmatched
              ? 'No matching schedule activity found — this is a valid outcome, not an error.'
              : `Suggested match: ${match.matchedActivityId}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceBadge confidence={match.confidence} />
          <RouteBadge route={match.route} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => onAccept(match.id)}
          className="rounded-[4px] bg-teal-accent px-3 py-1.5 font-sans text-xs text-pure-white hover:opacity-90"
        >
          Accept
        </button>
        <button
          onClick={() => onReject(match.id)}
          className="rounded-[4px] border border-fog px-3 py-1.5 font-sans text-xs text-aged-sepia hover:bg-fog/30"
        >
          Reject
        </button>
        <button
          onClick={() => setExpandedState((e) => !e)}
          className="rounded-[4px] border border-fog px-3 py-1.5 font-sans text-xs text-aged-sepia hover:bg-fog/30"
        >
          {expandedState ? 'Hide candidates' : 'Show candidates'}
        </button>
        <Link
          href={`/evidence/${match.id}`}
          className="ml-auto font-mono text-xs text-teal-accent underline"
        >
          Why this match?
        </Link>
      </div>

      {expandedState && (
        <div className="mt-4 border-t border-fog pt-4">
          <CandidateList
            candidates={match.candidates}
            onSelect={(activityId) => onReassign(match.id, activityId)}
          />
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 10: Run test to verify it passes**

```bash
npm test -- ReviewRow.test
```

Expected: all 3 tests pass.

- [ ] **Step 11: Write `app/review/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useReviewStore } from '@/lib/store/review-store';
import { getExecutionEvents } from '@/lib/api/updates';
import { getFieldUpdates } from '@/lib/api/updates';
import { ReviewRow } from '@/components/review/ReviewRow';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import type { ExecutionEvent, FieldUpdate } from '@/lib/types';

export default function ReviewQueue() {
  const { matches, loading, error, accept, reject, reassign } = useReviewStore();
  const [events, setEvents] = useState<ExecutionEvent[] | null>(null);
  const [updates, setUpdates] = useState<FieldUpdate[] | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getExecutionEvents(), getFieldUpdates()])
      .then(([e, u]) => {
        setEvents(e);
        setUpdates(u);
      })
      .catch(() => setJoinError('Failed to load field data.'));
  }, []);

  if (error || joinError) {
    return (
      <main className="mx-auto max-w-4xl p-10">
        <ErrorState message={error ?? joinError ?? 'Unknown error'} />
      </main>
    );
  }

  if (loading || !events || !updates) {
    return (
      <main className="mx-auto max-w-4xl space-y-4 p-10">
        <Skeleton variant="row" count={5} />
      </main>
    );
  }

  const queue = matches
    .filter((m) => m.route === 'review' || m.route === 'unmatched')
    .sort((a, b) => a.confidence - b.confidence);

  return (
    <main className="mx-auto max-w-4xl space-y-7 p-10">
      <h1 className="font-serif text-3xl font-light text-aged-sepia">Review queue</h1>
      <div className="flex flex-col gap-4">
        {queue.map((match) => {
          const event = events.find((e) => e.id === match.executionEventId);
          const fieldUpdate = updates.find((u) => u.id === event?.fieldUpdateId);
          return (
            <ReviewRow
              key={match.id}
              match={match}
              event={event}
              fieldUpdate={fieldUpdate}
              onAccept={accept}
              onReject={reject}
              onReassign={reassign}
            />
          );
        })}
      </div>
    </main>
  );
}
```

- [ ] **Step 12: Run the dev server and manually verify**

```bash
npm run dev
```

Visit `http://localhost:3000/review`. Verify: rows sorted by confidence
ascending, unmatched row (m-9) has calm non-error styling and explanatory
copy, accept/reject/expand buttons work, "Why this match?" links navigate
(will 404 until Task 10 — that's expected at this point).

- [ ] **Step 13: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 14: Commit**

```bash
git add lib/store/ components/review/ app/review/ app/layout.tsx
git commit -m "Build Review Queue screen with local mutation store"
```

---

## Task 10: Evidence View (`app/evidence/[matchId]/page.tsx`)

**Files:**
- Create: `components/evidence/EvidenceText.tsx`
- Create: `components/evidence/ReasonsBreakdown.tsx`
- Create: `components/evidence/ApprovalHistory.tsx`
- Create: `lib/mock-data/approval-history.ts`
- Create: `app/evidence/[matchId]/page.tsx`
- Test: `components/evidence/EvidenceText.test.tsx`
- Test: `components/evidence/ReasonsBreakdown.test.tsx`

**Interfaces:**
- Consumes: `getMatch(id)`, `getExecutionEvents()`, `getFieldUpdates()`,
  `getActivity(id)` from `lib/api/*`
- Produces: the `/evidence/[matchId]` route; a local-only
  `ApprovalHistoryEntry` type (not a pipeline-stage contract type, lives in
  mock-data) and `export const approvalHistory: Record<string, ApprovalHistoryEntry[]>`
  keyed by match ID

- [ ] **Step 1: Write the failing test for EvidenceText**

Create `components/evidence/EvidenceText.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { EvidenceText } from './EvidenceText';

describe('EvidenceText', () => {
  it('highlights the excerpt when present', () => {
    render(
      <EvidenceText
        rawText="Line 24 erection at 45% today, crew reports steady progress."
        excerpt="45% today"
      />
    );
    const mark = screen.getByText('45% today');
    expect(mark.tagName).toBe('MARK');
  });

  it('shows a fallback note when excerpt is missing', () => {
    render(<EvidenceText rawText="Some field text with no excerpt." excerpt={undefined} />);
    expect(screen.getByText(/excerpt not available/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write the failing test for ReasonsBreakdown**

Create `components/evidence/ReasonsBreakdown.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReasonsBreakdown } from './ReasonsBreakdown';
import type { MatchReasons } from '@/lib/types';

const reasons: MatchReasons = {
  identifiersMatched: ['WBS L5.4.1'],
  semanticSimilarity: 0.8,
  contextChecks: { wbs: true, location: true, discipline: true, timing: false, dependencies: true },
  contradictions: ['Reported date falls before predecessor completion.'],
};

describe('ReasonsBreakdown', () => {
  it('renders identifiers matched', () => {
    render(<ReasonsBreakdown reasons={reasons} />);
    expect(screen.getByText('WBS L5.4.1')).toBeInTheDocument();
  });

  it('renders the semantic similarity score', () => {
    render(<ReasonsBreakdown reasons={reasons} />);
    expect(screen.getByText('80%')).toBeInTheDocument();
  });

  it('renders a failed timing check distinctly', () => {
    render(<ReasonsBreakdown reasons={reasons} />);
    const timingItem = screen.getByTestId('context-check-timing');
    expect(timingItem).toHaveAttribute('data-passed', 'false');
  });

  it('renders contradiction warnings when present', () => {
    render(<ReasonsBreakdown reasons={reasons} />);
    expect(screen.getByText(/falls before predecessor/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npm test -- EvidenceText.test ReasonsBreakdown.test
```

Expected: FAIL — components don't exist yet.

- [ ] **Step 4: Write `components/evidence/EvidenceText.tsx`**

```tsx
export function EvidenceText({
  rawText,
  excerpt,
}: {
  rawText: string;
  excerpt: string | undefined;
}) {
  if (!excerpt) {
    return (
      <div className="rounded-[12px] bg-pure-white p-6">
        <p className="font-sans text-sm text-aged-sepia">{rawText}</p>
        <p className="mt-2 font-mono text-xs text-moss-shadow">Excerpt not available.</p>
      </div>
    );
  }

  const index = rawText.indexOf(excerpt);
  if (index === -1) {
    return (
      <div className="rounded-[12px] bg-pure-white p-6">
        <p className="font-sans text-sm text-aged-sepia">{rawText}</p>
        <p className="mt-2 font-mono text-xs text-moss-shadow">Excerpt not available.</p>
      </div>
    );
  }

  const before = rawText.slice(0, index);
  const after = rawText.slice(index + excerpt.length);

  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <p className="font-sans text-sm text-aged-sepia">
        {before}
        <mark className="rounded-[4px] bg-teal-accent/20 px-1 text-aged-sepia">{excerpt}</mark>
        {after}
      </p>
    </div>
  );
}
```

- [ ] **Step 5: Write `components/evidence/ReasonsBreakdown.tsx`**

```tsx
import type { MatchReasons } from '@/lib/types';

const CHECK_LABELS: Record<keyof MatchReasons['contextChecks'], string> = {
  wbs: 'WBS code',
  location: 'Location',
  discipline: 'Discipline',
  timing: 'Timing',
  dependencies: 'Dependencies',
};

export function ReasonsBreakdown({ reasons }: { reasons: MatchReasons }) {
  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <h2 className="font-serif text-xl text-aged-sepia">Why this match</h2>

      <div className="mt-4">
        <p className="font-mono text-xs uppercase text-moss-shadow">Identifiers matched</p>
        {reasons.identifiersMatched.length === 0 ? (
          <p className="mt-1 font-sans text-sm text-moss-shadow">None — matched by semantics and schedule context alone.</p>
        ) : (
          <div className="mt-1 flex flex-wrap gap-2">
            {reasons.identifiersMatched.map((id) => (
              <span key={id} className="rounded-[4px] bg-fog/40 px-2 py-1 font-mono text-xs text-aged-sepia">
                {id}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-4">
        <p className="font-mono text-xs uppercase text-moss-shadow">Semantic similarity</p>
        <p className="mt-1 font-mono text-sm text-aged-sepia">
          {Math.round(reasons.semanticSimilarity * 100)}%
        </p>
      </div>

      <div className="mt-4">
        <p className="font-mono text-xs uppercase text-moss-shadow">Schedule-context checks</p>
        <ul className="mt-2 flex flex-col gap-1">
          {(Object.keys(reasons.contextChecks) as Array<keyof MatchReasons['contextChecks']>).map((key) => (
            <li
              key={key}
              data-testid={`context-check-${key}`}
              data-passed={reasons.contextChecks[key]}
              className="flex items-center justify-between font-sans text-sm"
            >
              <span className="text-aged-sepia">{CHECK_LABELS[key]}</span>
              <span className={reasons.contextChecks[key] ? 'text-teal-accent' : 'text-moss-shadow'}>
                {reasons.contextChecks[key] ? 'Passed' : 'Failed'}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {reasons.contradictions && reasons.contradictions.length > 0 && (
        <div className="mt-4 rounded-[4px] border border-fog bg-fog/20 p-4">
          <p className="font-mono text-xs uppercase text-moss-shadow">Contradictions flagged</p>
          <ul className="mt-2 flex flex-col gap-1">
            {reasons.contradictions.map((c, i) => (
              <li key={i} className="font-sans text-sm text-aged-sepia">{c}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
npm test -- EvidenceText.test ReasonsBreakdown.test
```

Expected: all 6 tests pass.

- [ ] **Step 7: Write `lib/mock-data/approval-history.ts`**

```ts
export interface ApprovalHistoryEntry {
  id: string;
  action: 'submitted' | 'auto_posted' | 'flagged_for_review' | 'accepted' | 'rejected';
  actor: string;
  timestamp: string;
  note?: string;
}

export const approvalHistory: Record<string, ApprovalHistoryEntry[]> = {
  'm-1': [
    { id: 'h-1', action: 'submitted', actor: 'System', timestamp: '2026-07-08T18:05:00Z' },
    { id: 'h-2', action: 'auto_posted', actor: 'Match & Trust engine', timestamp: '2026-07-08T18:05:02Z', note: 'Confidence 96% — above auto-post threshold.' },
  ],
  'm-8': [
    { id: 'h-3', action: 'submitted', actor: 'System', timestamp: '2026-08-04T14:05:00Z' },
    { id: 'h-4', action: 'flagged_for_review', actor: 'Match & Trust engine', timestamp: '2026-08-04T14:05:03Z', note: 'Contradiction detected against prior report m-7.' },
  ],
  'm-9': [
    { id: 'h-5', action: 'submitted', actor: 'System', timestamp: '2026-08-05T11:05:00Z' },
    { id: 'h-6', action: 'flagged_for_review', actor: 'Match & Trust engine', timestamp: '2026-08-05T11:05:02Z', note: 'No schedule activity found above minimum confidence.' },
  ],
};
```

Note: only match IDs with authored history entries appear here — the
Evidence View must handle a match ID with no entry (empty array fallback),
not assume every match has history.

- [ ] **Step 8: Write `components/evidence/ApprovalHistory.tsx`**

```tsx
import type { ApprovalHistoryEntry } from '@/lib/mock-data/approval-history';

const ACTION_LABELS: Record<ApprovalHistoryEntry['action'], string> = {
  submitted: 'Submitted',
  auto_posted: 'Auto-posted',
  flagged_for_review: 'Flagged for review',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

export function ApprovalHistory({ entries }: { entries: ApprovalHistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-[12px] bg-pure-white p-6">
        <h2 className="font-serif text-xl text-aged-sepia">Validation history</h2>
        <p className="mt-2 font-sans text-sm text-moss-shadow">No history recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-[12px] bg-pure-white p-6">
      <h2 className="font-serif text-xl text-aged-sepia">Validation history</h2>
      <ul className="mt-4 flex flex-col gap-3">
        {entries.map((entry) => (
          <li key={entry.id} className="border-l-2 border-fog pl-4">
            <p className="font-sans text-sm text-aged-sepia">
              {ACTION_LABELS[entry.action]} <span className="text-moss-shadow">by {entry.actor}</span>
            </p>
            <p className="font-mono text-xs text-moss-shadow">{entry.timestamp}</p>
            {entry.note && <p className="mt-1 font-sans text-xs text-aged-sepia">{entry.note}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

- [ ] **Step 9: Write `app/evidence/[matchId]/page.tsx`**

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getMatch } from '@/lib/api/matches';
import { getExecutionEvents, getFieldUpdates } from '@/lib/api/updates';
import { getActivity } from '@/lib/api/activities';
import { EvidenceText } from '@/components/evidence/EvidenceText';
import { ReasonsBreakdown } from '@/components/evidence/ReasonsBreakdown';
import { ApprovalHistory } from '@/components/evidence/ApprovalHistory';
import { Skeleton } from '@/components/shared/Skeleton';
import { ErrorState } from '@/components/shared/ErrorState';
import { approvalHistory } from '@/lib/mock-data/approval-history';
import type { MatchResult, ExecutionEvent, FieldUpdate, ScheduleActivity } from '@/lib/types';

export default function EvidenceView() {
  const params = useParams<{ matchId: string }>();
  const [match, setMatch] = useState<MatchResult | null>(null);
  const [event, setEvent] = useState<ExecutionEvent | null>(null);
  const [fieldUpdate, setFieldUpdate] = useState<FieldUpdate | null>(null);
  const [activity, setActivity] = useState<ScheduleActivity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const m = await getMatch(params.matchId);
      if (!m) {
        setError('Match not found.');
        setLoading(false);
        return;
      }
      const events = await getExecutionEvents();
      const ev = events.find((e) => e.id === m.executionEventId) ?? null;
      const updates = await getFieldUpdates();
      const fu = updates.find((u) => u.id === ev?.fieldUpdateId) ?? null;
      const act = m.matchedActivityId ? await getActivity(m.matchedActivityId) : null;

      setMatch(m);
      setEvent(ev);
      setFieldUpdate(fu);
      setActivity(act);
      setLoading(false);
    }
    load().catch(() => {
      setError('Failed to load evidence.');
      setLoading(false);
    });
  }, [params.matchId]);

  if (error) {
    return (
      <main className="mx-auto max-w-3xl p-10">
        <ErrorState message={error} />
      </main>
    );
  }

  if (loading || !match) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-10">
        <Skeleton variant="card" count={3} />
      </main>
    );
  }

  const history = approvalHistory[match.id] ?? [];

  return (
    <main className="mx-auto max-w-3xl space-y-7 p-10">
      <h1 className="font-serif text-3xl font-light text-aged-sepia">Evidence</h1>

      <EvidenceText rawText={fieldUpdate?.rawText ?? ''} excerpt={fieldUpdate?.evidence.excerpt} />

      <div className="rounded-[12px] bg-pure-white p-6">
        <h2 className="font-serif text-xl text-aged-sepia">Matched activity</h2>
        {activity ? (
          <div className="mt-2 font-sans text-sm text-aged-sepia">
            <p className="font-mono text-xs text-moss-shadow">{activity.wbsCode}</p>
            <p>{activity.description}</p>
          </div>
        ) : (
          <p className="mt-2 font-sans text-sm text-moss-shadow">
            No activity matched — routed as unmatched.
          </p>
        )}
      </div>

      <ReasonsBreakdown reasons={match.reasons} />

      <ApprovalHistory entries={history} />
    </main>
  );
}
```

- [ ] **Step 10: Run dev server and manually verify**

```bash
npm run dev
```

Visit `http://localhost:3000/evidence/m-8` (the contradiction case) directly,
and also click through from `/review`. Verify: excerpt highlighted in the raw
text, matched activity card, context checks show timing failed where
expected, contradiction note visible, approval history renders. Then visit
`/evidence/m-9` (unmatched case) and confirm the "No activity matched" and
empty-history states render cleanly rather than crashing.

- [ ] **Step 11: Run full test suite**

```bash
npm test
```

Expected: all tests across the entire project pass.

- [ ] **Step 12: Commit**

```bash
git add components/evidence/ lib/mock-data/approval-history.ts app/evidence/
git commit -m "Build Evidence View screen"
```

---

## Task 11: CLAUDE.md and final verification pass

**Files:**
- Create: `CLAUDE.md`

**Interfaces:**
- Consumes: nothing (documentation task)
- Produces: persistent context for future sessions and teammates

- [ ] **Step 1: Write `CLAUDE.md`**

```markdown
# Plan2Reality Frontend

Frontend-only prototype. No backend, no auth, no real LLM calls. All data
flows through `lib/api/*`, which today reads `lib/mock-data/*` fixtures and
will later be swapped for real `fetch()` calls against a FastAPI backend —
component code should never need to change when that happens.

## Contract types — `lib/types.ts`

Source of truth for the pipeline stage boundaries:
`FieldUpdate` (Capture output) → `ExecutionEvent` (Understand output) →
`MatchResult` (Match & Trust output, referencing `ScheduleActivity` by ID) →
`ScheduleImpact` (Predict output). `RecoveryOption` is a what-if, not tied to
a pipeline stage.

Rules:
- `MatchResult.route` is always read from data. Never derive it from
  `confidence` via thresholds in the UI — that's the Match & Trust service's
  job, not the frontend's.
- `MatchResult.candidates` and `EvidencePointer.excerpt` are optional. Every
  consumer renders an explicit fallback for the missing case.
- All IDs are `string`. All dates are ISO 8601 strings.

## Data-access layer — `lib/api/`

Every function is `async`/returns a `Promise`, even though it resolves
synchronously from fixtures today. This is intentional — it's the seam
teammates swap real fetch calls into with zero call-site changes.

## Mutable state — `lib/store/review-store.tsx`

React Context + `useReducer`, seeded from `getMatches()`. Review Queue
accept/reject/reassign actions mutate this in-memory store. Does not persist
across a page refresh (acceptable for a demo). This is where real mutation
API calls get wired in later.

## Design tokens

Source: `design/DESIGN.md` (sibling directory, outside this project — copy
values, don't reference the file at runtime). Parchment canvas, Pure White
cards, Aged Sepia text, Fog borders, Teal Accent for interactive/critical-path
states. pplxSerif for headlines only (never below 24px), pplxSans for body/UI,
pplxSansMono for badges and technical labels. 12px card radius, no
box-shadows, 40px pill radius reserved for primary CTAs only.

## Shared components

`components/shared/Skeleton.tsx` and `ErrorState.tsx` are used by all three
screens — don't add screen-specific loading/error UI.
`components/shared/ConfidenceBadge.tsx` and `RouteBadge.tsx` are the single
visual encoding for confidence/route, reused across Planner Console, Review
Queue, and Evidence View.

## Screens

- `app/page.tsx` — Planner Console
- `app/review/page.tsx` — Review Queue (every row links to
  `/evidence/[matchId]`)
- `app/evidence/[matchId]/page.tsx` — Evidence View

## Non-goals

No authentication. No real backend/database. No file upload processing. No
real LLM calls. No Recover & Learn / execution memory subsystem.

## Testing

`npm test` runs the full Vitest suite. Every fixture, api function, and
component has test coverage — run this before every commit.
```

- [ ] **Step 2: Run the full test suite one final time**

```bash
npm test
```

Expected: every test in the project passes.

- [ ] **Step 3: Run the production build**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors across all three routes
(`/`, `/review`, `/evidence/[matchId]`).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "Add CLAUDE.md documenting contracts and architecture decisions"
```

---

## Self-Review Notes

Spec coverage checked against
`docs/superpowers/specs/2026-08-31-plan2reality-frontend-design.md`:
all six types (Task 2), mock data with all six required hard cases (Task 4),
async data-access layer (Task 6), all three screens in build order (Tasks
8-10), DESIGN.md-derived theme (Task 1 + applied throughout), shared
skeleton/error states (Task 7), optional-field fallbacks for `candidates` and
`excerpt` (Tasks 9-10), Review Queue → Evidence View linking (Task 9),
CLAUDE.md (Task 11) — all covered. No placeholders. Type/signature names are
consistent from Task 2 through Task 10 (verified `getActivity`, `getMatch`,
`ReviewStoreProvider`/`useReviewStore`, `ConfidenceBadge`/`RouteBadge` prop
shapes match at every call site).
