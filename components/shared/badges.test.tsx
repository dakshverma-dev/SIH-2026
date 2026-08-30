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
