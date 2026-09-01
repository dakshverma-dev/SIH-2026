-- Explainable matching: store the per-signal score contribution alongside the
-- final score, so the Evidence view can show "why we matched this" as real
-- numbers rather than a black-box percentage.
alter table match_candidates add column if not exists score_breakdown jsonb not null default '[]';
alter table activity_matches add column if not exists score_breakdown jsonb not null default '[]';

comment on column match_candidates.score_breakdown is
  'Array of {signal, label, weight, hit} objects produced by lib/engine/matching.ts. Sum of weight where hit=true (clamped 0-1) equals the stored score.';
comment on column activity_matches.score_breakdown is
  'Copy of the best candidate''s score_breakdown at decision time, denormalized for fast Evidence-view reads.';
