export type SourceType = 'dpr' | 'excel' | 'text' | 'voice';

export interface EvidencePointer {
  sourceId: string;
  sourceType: SourceType;
  excerpt?: string;
  page?: number;
}

export interface FieldUpdate {
  id: string;
  projectId: string;
  rawText: string;
  sourceFormat: SourceType;
  timestamp: string;
  evidence: EvidencePointer;
}

export interface ExecutionEvent {
  id: string;
  fieldUpdateId: string;
  activityDescription: string;
  location?: string;
  progressPercent: number;
  reportedDate: string;
  evidence: EvidencePointer;
}

export type MatchRoute = 'auto_post' | 'review' | 'unmatched';

export interface MatchReasons {
  identifiersMatched: string[];
  semanticSimilarity: number;
  contextChecks: {
    wbs: boolean;
    location: boolean;
    discipline: boolean;
    timing: boolean;
    dependencies: boolean;
  };
  contradictions?: string[];
}

export interface MatchCandidate {
  activityId: string;
  confidence: number;
}

export interface MatchResult {
  id: string;
  executionEventId: string;
  matchedActivityId: string | null;
  confidence: number;
  route: MatchRoute;
  reasons: MatchReasons;
  candidates?: MatchCandidate[];
}

export interface ScheduleActivity {
  id: string;
  wbsCode: string;
  description: string;
  plannedStart: string;
  plannedFinish: string;
  durationDays: number;
  dependencies: string[];
  currentProgressPercent: number;
  isCriticalPath: boolean;
}

export interface ScheduleImpact {
  affectedActivityIds: string[];
  criticalPathMoved: boolean;
  revisedCompletionDate: string;
  delayDays: number;
}

export interface RecoveryOption {
  id: string;
  description: string;
  projectedCompletionDate: string;
  tradeoffNote: string;
}
