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
