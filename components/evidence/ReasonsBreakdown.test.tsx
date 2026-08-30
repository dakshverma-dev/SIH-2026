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
