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
