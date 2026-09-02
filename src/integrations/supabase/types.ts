export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      activity_matches: {
        Row: {
          best_activity_id: string | null
          confidence: number
          created_at: string
          field_event_id: string
          id: string
          project_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          score_breakdown: Json
          status: string
          trust_level: string
        }
        Insert: {
          best_activity_id?: string | null
          confidence?: number
          created_at?: string
          field_event_id: string
          id?: string
          project_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json
          status?: string
          trust_level?: string
        }
        Update: {
          best_activity_id?: string | null
          confidence?: number
          created_at?: string
          field_event_id?: string
          id?: string
          project_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          score_breakdown?: Json
          status?: string
          trust_level?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_matches_best_activity_id_fkey"
            columns: ["best_activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_matches_field_event_id_fkey"
            columns: ["field_event_id"]
            isOneToOne: false
            referencedRelation: "field_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_matches_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_events: {
        Row: {
          action: string
          actor: string | null
          actor_id: string | null
          after_json: Json | null
          before_json: Json | null
          confidence: number | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          model: string | null
          project_id: string | null
          reason: string | null
          source: string | null
        }
        Insert: {
          action: string
          actor?: string | null
          actor_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          model?: string | null
          project_id?: string | null
          reason?: string | null
          source?: string | null
        }
        Update: {
          action?: string
          actor?: string | null
          actor_id?: string | null
          after_json?: Json | null
          before_json?: Json | null
          confidence?: number | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          model?: string | null
          project_id?: string | null
          reason?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      conflicts: {
        Row: {
          activity_id: string | null
          conflict_type: string
          created_at: string
          description: string
          field_event_id: string | null
          id: string
          project_id: string
          resolution_reason: string | null
          resolved_by: string | null
          status: string
        }
        Insert: {
          activity_id?: string | null
          conflict_type: string
          created_at?: string
          description: string
          field_event_id?: string | null
          id?: string
          project_id: string
          resolution_reason?: string | null
          resolved_by?: string | null
          status?: string
        }
        Update: {
          activity_id?: string | null
          conflict_type?: string
          created_at?: string
          description?: string
          field_event_id?: string | null
          id?: string
          project_id?: string
          resolution_reason?: string | null
          resolved_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "conflicts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflicts_field_event_id_fkey"
            columns: ["field_event_id"]
            isOneToOne: false
            referencedRelation: "field_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conflicts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          category: string | null
          content_text: string | null
          created_at: string
          filename: string
          id: string
          project_id: string | null
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string | null
          content_text?: string | null
          created_at?: string
          filename: string
          id?: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string | null
          content_text?: string | null
          created_at?: string
          filename?: string
          id?: string
          project_id?: string | null
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      execution_memory: {
        Row: {
          activity_type: string
          actual_duration: number | null
          contractor: string | null
          created_at: string
          delay_cause: string | null
          id: string
          outcome: string | null
          planned_duration: number | null
          project_id: string | null
          recovery_action: string | null
        }
        Insert: {
          activity_type: string
          actual_duration?: number | null
          contractor?: string | null
          created_at?: string
          delay_cause?: string | null
          id?: string
          outcome?: string | null
          planned_duration?: number | null
          project_id?: string | null
          recovery_action?: string | null
        }
        Update: {
          activity_type?: string
          actual_duration?: number | null
          contractor?: string | null
          created_at?: string
          delay_cause?: string | null
          id?: string
          outcome?: string | null
          planned_duration?: number | null
          project_id?: string | null
          recovery_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "execution_memory_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      field_events: {
        Row: {
          activity_description: string | null
          actual_finish: string | null
          actual_start: string | null
          created_at: string
          delay_reason: string | null
          discipline: string | null
          engineering_tag: string | null
          event_type: string | null
          evidence_span: string | null
          extraction_mode: string
          id: string
          line_number: string | null
          location: string | null
          progress: number | null
          project_id: string
          quantity: number | null
          report_id: string
          unit: string | null
        }
        Insert: {
          activity_description?: string | null
          actual_finish?: string | null
          actual_start?: string | null
          created_at?: string
          delay_reason?: string | null
          discipline?: string | null
          engineering_tag?: string | null
          event_type?: string | null
          evidence_span?: string | null
          extraction_mode?: string
          id?: string
          line_number?: string | null
          location?: string | null
          progress?: number | null
          project_id: string
          quantity?: number | null
          report_id: string
          unit?: string | null
        }
        Update: {
          activity_description?: string | null
          actual_finish?: string | null
          actual_start?: string | null
          created_at?: string
          delay_reason?: string | null
          discipline?: string | null
          engineering_tag?: string | null
          event_type?: string | null
          evidence_span?: string | null
          extraction_mode?: string
          id?: string
          line_number?: string | null
          location?: string | null
          progress?: number | null
          project_id?: string
          quantity?: number | null
          report_id?: string
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "field_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      field_reports: {
        Row: {
          author: string | null
          contractor: string | null
          created_at: string
          created_by: string | null
          discipline: string | null
          id: string
          location: string | null
          project_id: string
          raw_text: string
          report_date: string
          shift: string | null
          status: string
        }
        Insert: {
          author?: string | null
          contractor?: string | null
          created_at?: string
          created_by?: string | null
          discipline?: string | null
          id?: string
          location?: string | null
          project_id: string
          raw_text: string
          report_date?: string
          shift?: string | null
          status?: string
        }
        Update: {
          author?: string | null
          contractor?: string | null
          created_at?: string
          created_by?: string | null
          discipline?: string | null
          id?: string
          location?: string | null
          project_id?: string
          raw_text?: string
          report_date?: string
          shift?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "field_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      match_candidates: {
        Row: {
          activity_id: string | null
          field_event_id: string
          id: string
          rank: number
          reasons: Json
          score: number
          score_breakdown: Json
        }
        Insert: {
          activity_id?: string | null
          field_event_id: string
          id?: string
          rank?: number
          reasons?: Json
          score?: number
          score_breakdown?: Json
        }
        Update: {
          activity_id?: string | null
          field_event_id?: string
          id?: string
          rank?: number
          reasons?: Json
          score?: number
          score_breakdown?: Json
        }
        Relationships: [
          {
            foreignKeyName: "match_candidates_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_candidates_field_event_id_fkey"
            columns: ["field_event_id"]
            isOneToOne: false
            referencedRelation: "field_events"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          link: string | null
          project_id: string | null
          read: boolean
          title: string
          user_id: string | null
          user_role: Database["public"]["Enums"]["app_role"] | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          project_id?: string | null
          read?: boolean
          title: string
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          link?: string | null
          project_id?: string | null
          read?: boolean
          title?: string
          user_id?: string | null
          user_role?: Database["public"]["Enums"]["app_role"] | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          email?: string
          id: string
          name?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          project_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          project_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          code: string
          created_at: string
          data_status: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          data_status?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          data_status?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      recovery_scenarios: {
        Row: {
          activity_id: string | null
          created_at: string
          effort: string | null
          id: string
          label: string
          option_key: string
          project_id: string
          projected_finish: string | null
          recovery_days: number
          risk_level: string | null
        }
        Insert: {
          activity_id?: string | null
          created_at?: string
          effort?: string | null
          id?: string
          label: string
          option_key: string
          project_id: string
          projected_finish?: string | null
          recovery_days: number
          risk_level?: string | null
        }
        Update: {
          activity_id?: string | null
          created_at?: string
          effort?: string | null
          id?: string
          label?: string
          option_key?: string
          project_id?: string
          projected_finish?: string | null
          recovery_days?: number
          risk_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recovery_scenarios_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recovery_scenarios_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_activities: {
        Row: {
          activity_id: string
          actual_finish: string | null
          actual_start: string | null
          contractor: string | null
          description: string
          discipline: string
          duration_days: number
          engineering_tag: string | null
          id: string
          is_critical: boolean
          line_number: string | null
          location: string | null
          planned_finish: string
          planned_start: string
          predecessor_id: string | null
          progress: number
          project_id: string
          status: string
          updated_at: string
          updated_by: string | null
          wbs: string
        }
        Insert: {
          activity_id: string
          actual_finish?: string | null
          actual_start?: string | null
          contractor?: string | null
          description: string
          discipline: string
          duration_days?: number
          engineering_tag?: string | null
          id?: string
          is_critical?: boolean
          line_number?: string | null
          location?: string | null
          planned_finish: string
          planned_start: string
          predecessor_id?: string | null
          progress?: number
          project_id: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          wbs: string
        }
        Update: {
          activity_id?: string
          actual_finish?: string | null
          actual_start?: string | null
          contractor?: string | null
          description?: string
          discipline?: string
          duration_days?: number
          engineering_tag?: string | null
          id?: string
          is_critical?: boolean
          line_number?: string | null
          location?: string | null
          planned_finish?: string
          planned_start?: string
          predecessor_id?: string | null
          progress?: number
          project_id?: string
          status?: string
          updated_at?: string
          updated_by?: string | null
          wbs?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_activities_predecessor_id_fkey"
            columns: ["predecessor_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_impacts: {
        Row: {
          activity_id: string | null
          affected_activities: Json
          baseline_finish: string | null
          created_at: string
          critical_path_changed: boolean
          forecast_finish: string | null
          id: string
          project_id: string
          variance_days: number
        }
        Insert: {
          activity_id?: string | null
          affected_activities?: Json
          baseline_finish?: string | null
          created_at?: string
          critical_path_changed?: boolean
          forecast_finish?: string | null
          id?: string
          project_id: string
          variance_days?: number
        }
        Update: {
          activity_id?: string | null
          affected_activities?: Json
          baseline_finish?: string | null
          created_at?: string
          critical_path_changed?: boolean
          forecast_finish?: string | null
          id?: string
          project_id?: string
          variance_days?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_impacts_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "schedule_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_impacts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      app_role:
        | "ADMIN"
        | "PROJECT_MANAGER"
        | "PLANNER"
        | "SUPERVISOR"
        | "VIEWER"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["ADMIN", "PROJECT_MANAGER", "PLANNER", "SUPERVISOR", "VIEWER"],
    },
  },
} as const
