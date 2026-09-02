import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PROJECT_ID } from "@/lib/pipeline";
import type { ScheduleActivity, ScoreSignal } from "@/lib/domain/types";

export function asBreakdown(value: unknown): ScoreSignal[] {
  return Array.isArray(value) ? (value as ScoreSignal[]) : [];
}

export function useActivities() {
  return useQuery({
    queryKey: ["activities"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_activities")
        .select("*")
        .eq("project_id", PROJECT_ID)
        .order("activity_id");
      if (error) throw error;
      return (data ?? []) as unknown as ScheduleActivity[];
    },
  });
}

export function useMatches() {
  return useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_matches")
        .select("*, field_events(*), schedule_activities:best_activity_id(*)")
        .eq("project_id", PROJECT_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useReports() {
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_reports")
        .select("*")
        .eq("project_id", PROJECT_ID)
        .order("report_date", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useConflicts() {
  return useQuery({
    queryKey: ["conflicts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conflicts")
        .select("*, schedule_activities:activity_id(activity_id, description)")
        .eq("project_id", PROJECT_ID)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useAudit(limit = 200) {
  return useQuery({
    queryKey: ["audit", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useImpacts() {
  return useQuery({
    queryKey: ["impacts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("schedule_impacts")
        .select("*, schedule_activities:activity_id(activity_id, description)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
