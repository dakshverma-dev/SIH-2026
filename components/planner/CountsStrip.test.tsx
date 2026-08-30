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
