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
