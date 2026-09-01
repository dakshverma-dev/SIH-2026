# Plan2Reality — Trusted Execution Intelligence

> 🚧 **Status: Work in Progress (SIH 2026 Prototype)** — Actively developing AI-driven construction schedule intelligence, automatic DPR extraction, RLS-enforced governance, and critical-path delay simulation.

Full-stack prototype for SIH 2026 PS26122, now on a **real Supabase Postgres backend
with Row Level Security enforced on every table**. Converts messy field reality (DPR
text) into verified, schedule-linked (L5/L6) project truth, then reasons about
downstream schedule impact and recovery options.

Every screen reads/writes real database state through the signed-in user's own
session — no service-role bypass, no hardcoded numbers, no fake buttons.

---

## 1. Architecture

- **Frontend:** Next.js 16 App Router, TypeScript, React 19
- **Backend:** Next.js Route Handlers + Server Components, talking to Supabase via `@supabase/ssr`
- **Database:** Supabase Postgres — real relational schema (15 tables), enums, foreign keys, indexes
- **Auth:** Real Supabase Auth (`auth.users` + bcrypt), joined to a `profiles` table for app-level role
- **Security:** Row Level Security enabled and policy-enforced on **every** table and on Storage objects — see §3
- **Storage:** Private Supabase Storage bucket (`project-documents`), RLS-scoped to project members
- **AI:** Provider-abstracted extraction (`lib/engine/extraction.ts`). Uses the real Anthropic API if `ANTHROPIC_API_KEY` is set; otherwise a deterministic rule-based extractor, always labelled `DEMO_FALLBACK` — never presented as AI.

## 2. Why RLS instead of a service-role key

The server never uses a service-role key. Every Server Component and Route Handler
calls `createClient()` (`lib/supabase/server.ts`), which reads the user's session
cookie and makes every query **as that user**, over their real JWT. That means:

- Postgres itself — not application code — is the security boundary.
- A bug in a page or API route cannot leak another project's data, because the
  database will refuse the query regardless of what the app asks for.
- This was verified directly against the live database (not just code review) — see §6.

## 3. Row Level Security — what's actually enforced

Every table has RLS **enabled**, with explicit policies:

| Table | Read | Write |
|---|---|---|
| `projects`, `schedule_activities`, `field_reports`, etc. | Project members only (`is_project_member()`) | Role-gated (e.g. schedule writes require PLANNER+, report submission requires SUPERVISOR+) |
| `activity_matches`, `conflicts` | Members | Approve/resolve restricted to PLANNER/PM/ADMIN |
| `audit_events` | Members | **Insert-only — no update or delete policy exists anywhere**, so the ledger is immutable at the database level, not just by convention |
| Storage (`project-documents` bucket) | Project members only | Upload requires SUPERVISOR+ |

Two helper functions (`is_project_member`, `current_role_name`) are `SECURITY DEFINER`
and had their `EXECUTE` grant revoked from `anon`/`public` after the Supabase security
advisor flagged them — they're callable only by `authenticated` sessions.

## 4. Roles

`ADMIN`, `PROJECT_MANAGER`, `PLANNER`, `SUPERVISOR`, `VIEWER` — enforced in the UI
(buttons hidden) **and** independently at the database layer via RLS policies, so
either layer alone would be enough to stop an unauthorized write.

## 5. Major Features (all database-backed)

- **Field Updates** → extraction → L5/L6 matching engine (hard-anchor tag/line match + discipline/location context + lexical scoring + rerank + confidence gate: HIGH/MEDIUM/LOW/UNMATCHED)
- **Review Queue** — evidence, confidence, alternative candidates, approve/reject; approval writes back to `schedule_activities` and triggers impact recalculation
- **Conflict Center** — auto-detects progress decreases, sequence violations, duplicate updates
- **Schedule Impact** — simplified deterministic CPM: predecessor slippage propagates to successors
- **Recovery Simulator** — Add Crew / Extra Shift / Resequence scenarios
- **Execution Memory** — searchable historical delay causes / recovery actions
- **Analytics, Audit Timeline, Documents (real Storage), Settings/RBAC** — all live queries

## 6. Test Results (this session)

- `npm run build` — **zero TypeScript errors, zero build errors** against the real Supabase schema
- Direct database verification (this sandbox's network policy blocks outbound calls to `*.supabase.co`, so the Next.js HTTP server could not be smoke-tested from inside the container — see note below). Instead the full golden path was executed **as the actual PLANNER role under live RLS enforcement**, using the same insert/update sequence the app's code performs:
  1. Submitted field report → extracted event (65% progress, Rack 3, Piping, engineering tag `PIP-R3-2401`) ✅
  2. Matching engine logic reproduced: `PIP-R3-2401 — 24-inch Header Spool Erection` matched at 63% confidence, MEDIUM trust ✅
  3. Match approved as planner → `schedule_activities.progress` updated 40% → 65%, status → `IN_PROGRESS` ✅
  4. Impact recorded: baseline 2026-08-24 → forecast 2026-08-15, variance −9 days ✅
  5. **Negative security test:** the same update attempted as `VIEWER` affected **0 rows** — RLS silently rejected it, proving the policy is real and not just a UI restriction ✅
- Demo state was reset afterward so the seeded database starts clean.

> **Network note:** this development sandbox's egress proxy only allows a fixed domain allowlist (npm, GitHub, PyPI, etc.) and returned `x-deny-reason: host_not_allowed` for `supabase.co`. This has no effect on the deployed app — Vercel, or your own machine, will reach Supabase normally. If you hit the same issue in a similarly locked-down environment, allow `*.supabase.co` in its network settings.

## 7. Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=https://mprnlkbktvhgiukiphik.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon/publishable key from Supabase project settings>
ANTHROPIC_API_KEY=   # optional — real LLM extraction instead of demo fallback
```

Populate a git-ignored `.env` with credentials for an existing Supabase project,
or create your **own** project. Do not leave an empty `.env.local` beside a
populated `.env`; Next.js gives `.env.local` precedence.

1. Create a project at supabase.com
2. Run all migration files in `supabase/migrations/` in timestamp order via the SQL editor or `supabase db push`
3. Seed demo data with `supabase/seed.sql`
4. Add your project URL + anon key to `.env`

## 8. How to Run

```bash
npm install
npm run dev      # http://localhost:3000
# or
npm run build && npm run start
```

Demo accounts (shown on the login screen — click to autofill):

| Role | Email | Password |
|---|---|---|
| Admin | admin@plan2reality.io | admin123 |
| Project Manager | pm@plan2reality.io | pm12345 |
| Planner | planner@plan2reality.io | plan123 |
| Supervisor | supervisor@plan2reality.io | sup1234 |
| Viewer | viewer@plan2reality.io | view123 |

## 9. How to Demo the Golden Path

1. Log in as **Planner**.
2. **Field Updates** — sample DPR text is pre-filled ("Spool erection completed for 24-inch header at Rack 3… 65 percent"). Submit.
3. See the match result inline → **Review Queue**.
4. Inspect evidence, matched L5/L6 activity, "why" reasons, alternative candidates. **Approve**.
5. **Impact** — baseline vs. forecast finish, affected downstream Hydrotest activity.
6. **Recovery** — same activity, run simulation, compare Add Crew / Extra Shift / Resequence.
7. **Audit** — full chronological, immutable decision trail.
8. **Execution Memory** — search "hydrotest" for historical precedent.
9. Log in as **Viewer** and confirm the Approve/Resolve buttons are gone — then, if you want to see the database itself refuse the write (not just the UI hiding it), try calling the API route directly as viewer; RLS blocks it either way.

## 11. Security Advisor Status

`supabase get_advisors` was run at the end of this session:

- ✅ Fixed: `current_role_name()` / `is_project_member()` had `EXECUTE` revoked from `anon` (they were flagged as callable by unauthenticated users).
- ⚠️ Accepted (by design): both functions remain executable by `authenticated` — RLS policies call them on every single query, so revoking this would break every policy in the app. They only ever return a boolean/role enum, not sensitive data, so being directly RPC-callable is low-risk.
- ⚠️ Not automatable: "Leaked Password Protection" (HaveIBeenPwned check) is a toggle in the Supabase dashboard under Auth → Policies, not a SQL migration. Recommended to enable before any real (non-demo) use.

## 12. Remaining Limitations (honestly disclosed)

- **Matching engine** is deterministic lexical/rule-based (hard anchors + context + token-overlap), not a live embedding/vector semantic layer or cross-encoder reranker.
- **CPM engine** is simplified single-predecessor forward propagation, not full multi-predecessor float calculation.
- **AI extraction** requires a supplied `ANTHROPIC_API_KEY`; otherwise the labelled deterministic fallback is used.
- **No automated test suite** — verified via live database RLS simulation this session (see §6) instead of an HTTP-level integration test, due to this sandbox's network restrictions.
- **Single-project** — schema supports multiple `projects` rows and `project_members`, but the UI always shows the first project.
- P6/XER integration and voice/ASR capture remain out of scope per the MVP strategy in the source document.
