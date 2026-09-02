export type Role = "ADMIN" | "PROJECT_MANAGER" | "PLANNER" | "SUPERVISOR" | "VIEWER";

export type TrustLevel = "HIGH" | "MEDIUM" | "LOW" | "UNMATCHED";
export type MatchStatus = "PENDING" | "APPROVED" | "REJECTED";
export type ExtractionMode = "DEMO_FALLBACK" | "LLM";

export type ActivityStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "DELAYED";

export type SignalKey =
  | "IDENTIFIER_TAG"
  | "IDENTIFIER_LINE"
  | "DISCIPLINE"
  | "LOCATION"
  | "SEMANTIC"
  | "SCHEDULE_STATUS";

export interface ScoreSignal {
  signal: SignalKey;
  label: string;
  weight: number;
  hit: boolean;
}

export interface ScheduleActivity {
  id: string;
  project_id: string;
  activity_id: string;
  wbs: string;
  discipline: string;
  description: string;
  location: string | null;
  engineering_tag: string | null;
  line_number: string | null;
  contractor: string | null;
  planned_start: string;
  planned_finish: string;
  actual_start: string | null;
  actual_finish: string | null;
  progress: number;
  duration_days: number;
  predecessor_id: string | null;
  is_critical: boolean;
  status: ActivityStatus;
  updated_at: string | null;
}

export interface FieldEvent {
  id: string;
  report_id: string;
  project_id: string;
  event_type: string | null;
  activity_description: string | null;
  engineering_tag: string | null;
  line_number: string | null;
  location: string | null;
  discipline: string | null;
  progress: number | null;
  actual_start: string | null;
  actual_finish: string | null;
  quantity: number | null;
  unit: string | null;
  delay_reason: string | null;
  evidence_span: string | null;
  extraction_mode: ExtractionMode;
}

export interface ActivityMatch {
  id: string;
  field_event_id: string;
  project_id: string;
  best_activity_id: string | null;
  confidence: number;
  trust_level: TrustLevel;
  status: MatchStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  score_breakdown: ScoreSignal[];
}
