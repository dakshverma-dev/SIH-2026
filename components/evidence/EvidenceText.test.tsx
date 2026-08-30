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
