'use client';

import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { MatchResult } from '../types';
import { getMatches } from '../api/matches';

type State = {
  matches: MatchResult[];
  loading: boolean;
  error: string | null;
};

type Action =
  | { type: 'loaded'; matches: MatchResult[] }
  | { type: 'error'; message: string }
  | { type: 'accept'; matchId: string }
  | { type: 'reject'; matchId: string }
  | { type: 'reassign'; matchId: string; newActivityId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'loaded':
      return { matches: action.matches, loading: false, error: null };
    case 'error':
      return { ...state, loading: false, error: action.message };
    case 'accept':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId ? { ...m, route: 'auto_post' } : m
        ),
      };
    case 'reject':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId ? { ...m, route: 'unmatched', matchedActivityId: null } : m
        ),
      };
    case 'reassign':
      return {
        ...state,
        matches: state.matches.map((m) =>
          m.id === action.matchId
            ? { ...m, matchedActivityId: action.newActivityId, route: 'auto_post' }
            : m
        ),
      };
    default:
      return state;
  }
}

type ReviewStoreValue = State & {
  accept: (matchId: string) => void;
  reject: (matchId: string) => void;
  reassign: (matchId: string, newActivityId: string) => void;
};

const ReviewStoreContext = createContext<ReviewStoreValue | null>(null);

export function ReviewStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { matches: [], loading: true, error: null });

  useEffect(() => {
    getMatches()
      .then((matches) => dispatch({ type: 'loaded', matches }))
      .catch(() => dispatch({ type: 'error', message: 'Failed to load matches.' }));
  }, []);

  const value: ReviewStoreValue = {
    ...state,
    accept: (matchId) => dispatch({ type: 'accept', matchId }),
    reject: (matchId) => dispatch({ type: 'reject', matchId }),
    reassign: (matchId, newActivityId) => dispatch({ type: 'reassign', matchId, newActivityId }),
  };

  return <ReviewStoreContext.Provider value={value}>{children}</ReviewStoreContext.Provider>;
}

export function useReviewStore(): ReviewStoreValue {
  const ctx = useContext(ReviewStoreContext);
  if (!ctx) throw new Error('useReviewStore must be used within ReviewStoreProvider');
  return ctx;
}
