# Plan2Reality Frontend — Design Spec

Date: 2026-08-31
Status: Approved

## Purpose

Frontend-only hackathon prototype (2-day build) for Plan2Reality, a schedule-linking
layer for infrastructure project management. Four teammates build the backend
pipeline (Capture, Understand, Match & Trust, Predict, Recover & Learn) separately;
this repo is the UI, running entirely against typed mock data through a single
data-access layer so the UI never needs to change when real endpoints land.

This spec's author is also the API-contract owner: the types defined here are the
contract the other four people build against.

## Location

New project at `SIH latest 2026/` (sibling to the existing, unrelated `SIH-2026/`
folder, which is out of scope and untouched). Stack: Next.js (App Router) +
TypeScript + Tailwind, no backend, no auth, no file upload processing, no real LLM
calls, no Recover & Learn / execution memory (cut-list item).

## Directory structure

```
SIH latest 2026/
  app/
    page.tsx                  # Planner Console ("/")
    review/page.tsx           # Review Queue
    evidence/[matchId]/page.tsx  # Evidence View
    layout.tsx, globals.css
  components/
    planner/                  # Planner Console components
    review/                   # Review Queue components
    evidence/                 # Evidence View components
    shared/                   # ConfidenceBadge, RouteBadge, etc.
  lib/
    types.ts                  # single source of truth, the API contract
    api/
      updates.ts
      activities.ts
      matches.ts
      impact.ts
      recovery.ts
    mock-data/
      activities.ts           # ~20 L5/L6 activities with dependencies
      field-updates.ts
      execution-events.ts
      match-results.ts
      schedule-impact.ts
      recovery-options.ts
    store/
      review-store.tsx        # React Context + useReducer for local mutations
  CLAUDE.md
```

## Types (`lib/types.ts`)

Source of truth for all stage-boundary contracts. All IDs are `string`. All dates
are ISO 8601 strings.

```ts
type SourceType = 'dpr' | 'excel' | 'text' | 'voice';

interface EvidencePointer {
  sourceId: string;
  sourceType: SourceType;
  excerpt?: string;
  page?: number;
}

interface FieldUpdate {
  id: string;
  projectId: string;
  rawText: string;          // raw text or table content as captured
  sourceFormat: SourceType;
  timestamp: string;
  evidence: EvidencePointer;
}

interface ExecutionEvent {
  id: string;
  fieldUpdateId: string;
  activityDescription: string;  // as written in the field, pre-match
  location?: string;
  progressPercent: number;
  reportedDate: string;
  evidence: EvidencePointer;
}

type MatchRoute = 'auto_post' | 'review' | 'unmatched';

interface MatchReasons {
  identifiersMatched: string[];       // which identifiers hit (WBS code, activity ID, etc.)
  semanticSimilarity: number;         // 0-1
  contextChecks: {
    wbs: boolean;
    location: boolean;
    discipline: boolean;
    timing: boolean;
    dependencies: boolean;
  };
  contradictions?: string[];          // e.g. "progress went backwards: 60% -> 45%"
}

interface MatchResult {
  id: string;
  executionEventId: string;
  matchedActivityId: string | null;   // nullable — unmatched has no match
  confidence: number;                 // 0-1
  route: MatchRoute;                  // set directly by fixture/pipeline, never derived in UI
  reasons: MatchReasons;
  candidates?: Array<{ activityId: string; confidence: number }>; // ranked alternatives
}
```

`candidates` is optional — not every match has ranked alternatives worth showing.
The Review Queue's expand-row UI must treat `undefined`/empty as a valid state and
render a "no alternative matches" empty message, not assume the array is present.

`EvidencePointer.excerpt` is optional — some evidence pointers may only resolve to
a source document with no extracted excerpt yet. The Evidence View's highlighted-
fragment display must fall back to a plain "excerpt not available" note (and skip
highlighting) when `excerpt` is undefined, rather than rendering blank space.

```ts

interface ScheduleActivity {
  id: string;
  wbsCode: string;
  description: string;
  plannedStart: string;
  plannedFinish: string;
  durationDays: number;
  dependencies: string[];   // activity IDs (predecessors)
  currentProgressPercent: number;
  isCriticalPath: boolean;
}

interface ScheduleImpact {
  affectedActivityIds: string[];
  criticalPathMoved: boolean;
  revisedCompletionDate: string;
  delayDays: number;
}

interface RecoveryOption {
  id: string;
  description: string;              // e.g. "Add second shift on L5-104"
  projectedCompletionDate: string;
  tradeoffNote: string;
}
```

Routing decision (`MatchResult.route`) is authored directly in fixtures / produced
by the real Match & Trust service later. The frontend never computes a route from
`confidence` via thresholds — it only reads and displays whatever route it's given.

## Data-access layer (`lib/api/`)

Every function is `async` and returns a `Promise`, resolving from in-memory
fixtures today. Signatures are final now so teammates can swap internals for real
`fetch()` calls with zero call-site changes.

```ts
// lib/api/updates.ts
getFieldUpdates(): Promise<FieldUpdate[]>
getExecutionEvents(): Promise<ExecutionEvent[]>

// lib/api/activities.ts
getActivities(): Promise<ScheduleActivity[]>
getActivity(id: string): Promise<ScheduleActivity | null>

// lib/api/matches.ts
getMatches(): Promise<MatchResult[]>
getMatch(id: string): Promise<MatchResult | null>

// lib/api/impact.ts
getScheduleImpact(): Promise<ScheduleImpact>

// lib/api/recovery.ts
getRecoveryOptions(): Promise<RecoveryOption[]>
```

Components fetch via `useEffect` + local loading/error state — no data-fetching
library dependency added, to keep the surface teammates need to learn minimal.

All three screens must use one shared loading-skeleton component
(`components/shared/Skeleton.tsx`, shape-matched per context — e.g. a table-row
skeleton for the activities table, a card skeleton for the counts strip and
recovery options) rather than each screen inventing its own loading treatment.
Same for error state: one shared `<ErrorState>` component. This keeps the demo
visually consistent instead of each screen looking like a different app while
data is loading.

## Local mutable state (`lib/store/review-store.tsx`)

React Context + `useReducer`, seeded from `getMatches()` on mount. Review Queue
accept/reject/reassign actions dispatch reducer actions that mutate the in-memory
working copy. State does not persist across a full page refresh — acceptable for a
demo, and this is the natural seam where real mutation API calls (e.g.
`POST /matches/:id/accept`) get wired in later without touching components.

## Screens

Build order: types + mock data → Planner Console → Review Queue → Evidence View.
Each screen fully working before moving to the next.

### 1. Planner Console (`app/page.tsx`)

- Project header: name, baseline completion date, current forecast completion
  date, delay in days (visually prominent — a status-colored badge — when slipping)
- Activities table (not a Gantt — see Design section): WBS code, description,
  planned vs actual progress (bar), dependency chips, critical-path rows visually
  distinct (left border / background tint using Teal Accent, not a saturated
  warning color)
- Counts strip: auto-posted / awaiting review / unmatched counts, derived by
  filtering `getMatches()` results on `route` (no threshold math — just a count)
- Schedule-impact panel: rendered from `getScheduleImpact()`
- Recovery options: cards side by side, from `getRecoveryOptions()`

### 2. Review Queue (`app/review/page.tsx`)

- List of `MatchResult`s with `route` in `('review', 'unmatched')`, sorted by
  `confidence` ascending
- Each row: verbatim field text (join through `executionEventId` →
  `fieldUpdateId` → `FieldUpdate.rawText`), matched activity guess, confidence
  (badge, not a bare number), route badge
- Expand row → ranked `candidates`, selectable to reassign; if `candidates` is
  undefined or empty, render a "no alternative matches" empty state instead of
  an empty list or a crash
- Accept / reject / reassign buttons dispatch to `review-store`
- Unmatched rows get a distinct, calm visual treatment (Fog/Teal, not an error
  red) with copy framing "no match found" as a valid, intentional outcome
- Every row links to `/evidence/[matchId]` (using `MatchResult.id`) — this is
  the row's "why did the system say that?" affordance and is how a planner
  reaches the Evidence View. The link must be present on every row (matched or
  unmatched), not only on expand.

### 3. Evidence View (`app/evidence/[matchId]/page.tsx`)

- Original `FieldUpdate.rawText` with the matched fragment highlighted
- Matched `ScheduleActivity` card
- Reasons breakdown from `MatchResult.reasons`: identifiers matched, semantic
  similarity score, context-checks checklist (WBS/location/discipline/timing/
  dependencies — pass/fail)
- Contradiction flags from `reasons.contradictions` (e.g. progress regression)
- Validation/approval history — a simple mock timeline list (new lightweight type
  local to mock data, not a pipeline-stage contract type)

## Mock data (`lib/mock-data/`)

One project scenario. ~20 L5/L6 `ScheduleActivity` records with real dependency
edges forming a meaningful critical path. `FieldUpdate`/`ExecutionEvent`/
`MatchResult` fixtures must include, at minimum, one instance each of:

1. Same work described two different ways (e.g. "spool erected" vs "line 24
   erection") — both routed appropriately
2. A contradiction: activity reported 60% then later 45% — surfaced in
   `reasons.contradictions`, routed to `review`
3. An update with no explicit activity identifier, matched only via semantics +
   schedule context — `review`, with `reasons.identifiersMatched` empty
4. A genuinely new activity with no schedule counterpart — `unmatched`,
   `matchedActivityId: null`
5. A date inconsistency (reported date conflicts with schedule window)
6. Several clean, unambiguous updates — `auto_post`, high confidence

Split one fixture file per concern (as listed in Directory structure) so the
teammate owning benchmark data can replace files independently without touching
`lib/api/`.

## Design system

Source: `design/DESIGN.md` (Perplexity-style botanical/parchment reference),
tokens adopted as-is; the botanical photography/blur system is dropped as
inapplicable to this tool (flat Parchment canvas instead — DESIGN.md itself frames
the imagery as decorative brand mood, not functional).

- **Canvas:** Parchment `#faf8f5`
- **Cards:** Pure White `#ffffff`, 12px radius, 40px padding, no box-shadow —
  depth via White → Parchment → Fog layering only
- **Primary text:** Aged Sepia `#271a00`; secondary/muted: Moss Shadow `#7c7464`
- **Borders/dividers:** Fog `#d1cfc7`
- **Interactive/focus/critical-path accent:** Teal Accent `#0f3639` (the only
  cool color — used sparingly, per DESIGN.md's "don't introduce saturated
  accents beyond teal")
- **Elevated/dark surfaces** (if needed, e.g. a sticky header on scroll): Deep
  Forest `#23291b`
- **Typography:** pplxSerif (Georgia fallback) for headlines/section
  declarations only, never below 24px; pplxSans (Inter fallback) for UI/body,
  -0.028em tracking, 15px minimum body size, 1.5 line-height for body text;
  pplxSansMono (JetBrains Mono fallback) for badges, WBS codes, confidence/route
  labels, status markers
- **Radii:** cards 12px, inputs/badges 4px, buttons 40px (pill — primary CTA
  only, not on cards/containers)
- **Spacing:** 4px base unit scale as given in DESIGN.md; 28–40px section
  rhythm; 40px card padding; 8px element gaps
- **Confidence/route visual encoding:** one shared `<ConfidenceBadge>` /
  `<RouteBadge>` component (pplxSansMono, colored via the sepia/teal/fog
  palette — no new saturated colors), reused identically across Planner counts
  strip, Review Queue rows, and Evidence View

## Non-goals

No authentication. No real backend/database. No file upload processing. No real
LLM calls. No Recover & Learn / execution memory beyond the single `RecoveryOption`
type and its mock display on the Planner Console.

## Open questions / risks

None outstanding — all API-contract-affecting decisions (evidence pointer shape,
route pre-baking, async API layer, table vs Gantt, design token source) were
resolved with the user before this spec was written.
