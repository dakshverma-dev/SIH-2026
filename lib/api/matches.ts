import type { MatchResult } from '../types';
import { matchResults } from '../mock-data/match-results';

export async function getMatches(): Promise<MatchResult[]> {
  return matchResults;
}

export async function getMatch(id: string): Promise<MatchResult | null> {
  return matchResults.find((m) => m.id === id) ?? null;
}
