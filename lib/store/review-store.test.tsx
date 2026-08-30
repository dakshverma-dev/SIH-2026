import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ReviewStoreProvider, useReviewStore } from './review-store';

function TestConsumer() {
  const { matches, loading, accept, reject, reassign } = useReviewStore();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="count">{matches.length}</div>
      <button onClick={() => accept('m-8')}>accept</button>
      <button onClick={() => reject('m-8')}>reject</button>
      <button onClick={() => reassign('m-8', 'act-9')}>reassign</button>
      {matches.map((m) => (
        <div key={m.id} data-testid={`match-${m.id}`}>
          {m.route} / {m.matchedActivityId}
        </div>
      ))}
    </div>
  );
}

describe('review-store', () => {
  it('accept sets route to auto_post', async () => {
    render(
      <ReviewStoreProvider>
        <TestConsumer />
      </ReviewStoreProvider>
    );
    await waitFor(() => expect(screen.getByTestId('count')).toBeInTheDocument());
    screen.getByText('accept').click();
    await waitFor(() =>
      expect(screen.getByTestId('match-m-8').textContent).toContain('auto_post')
    );
  });

  it('reassign updates matchedActivityId', async () => {
    render(
      <ReviewStoreProvider>
        <TestConsumer />
      </ReviewStoreProvider>
    );
    await waitFor(() => expect(screen.getByTestId('count')).toBeInTheDocument());
    screen.getByText('reassign').click();
    await waitFor(() =>
      expect(screen.getByTestId('match-m-8').textContent).toContain('act-9')
    );
  });
});
