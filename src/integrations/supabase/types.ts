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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      course_holes: {
        Row: {
          course_id: string
          created_at: string
          handicap_index: number | null
          hole_number: number
          id: string
          is_ctp_hole: boolean
          par: number
        }
        Insert: {
          course_id: string
          created_at?: string
          handicap_index?: number | null
          hole_number: number
          id?: string
          is_ctp_hole?: boolean
          par: number
        }
        Update: {
          course_id?: string
          created_at?: string
          handicap_index?: number | null
          hole_number?: number
          id?: string
          is_ctp_hole?: boolean
          par?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_holes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_tees: {
        Row: {
          color: string | null
          course_id: string
          course_rating: number | null
          created_at: string
          id: string
          name: string
          slope_rating: number | null
          sort_order: number
          total_yardage: number | null
        }
        Insert: {
          color?: string | null
          course_id: string
          course_rating?: number | null
          created_at?: string
          id?: string
          name: string
          slope_rating?: number | null
          sort_order?: number
          total_yardage?: number | null
        }
        Update: {
          color?: string | null
          course_id?: string
          course_rating?: number | null
          created_at?: string
          id?: string
          name?: string
          slope_rating?: number | null
          sort_order?: number
          total_yardage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "course_tees_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          created_at: string
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      event_players: {
        Row: {
          created_at: string
          event_id: string
          id: string
          note: string | null
          player_id: string
          status: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          note?: string | null
          player_id: string
          status?: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          note?: string | null
          player_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_players_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          course_id: string | null
          course_name: string
          created_at: string
          date: string
          first_tee_time: string
          holes: number
          id: string
          is_locked: boolean
          max_players: number
          notes: string | null
          points_multiplier: number
          signup_deadline: string | null
          slots_per_group: number
          tee_interval_minutes: number
          track_points: boolean
          updated_at: string
        }
        Insert: {
          course_id?: string | null
          course_name: string
          created_at?: string
          date: string
          first_tee_time: string
          holes?: number
          id?: string
          is_locked?: boolean
          max_players?: number
          notes?: string | null
          points_multiplier?: number
          signup_deadline?: string | null
          slots_per_group?: number
          tee_interval_minutes?: number
          track_points?: boolean
          updated_at?: string
        }
        Update: {
          course_id?: string | null
          course_name?: string
          created_at?: string
          date?: string
          first_tee_time?: string
          holes?: number
          id?: string
          is_locked?: boolean
          max_players?: number
          notes?: string | null
          points_multiplier?: number
          signup_deadline?: string | null
          slots_per_group?: number
          tee_interval_minutes?: number
          track_points?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      group_assignments: {
        Row: {
          created_at: string
          group_id: string
          id: string
          player_id: string
          position: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          player_id: string
          position: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          player_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "group_assignments_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_assignments_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          event_id: string
          group_index: number
          id: string
          tee_time: string
        }
        Insert: {
          created_at?: string
          event_id: string
          group_index: number
          id?: string
          tee_time: string
        }
        Update: {
          created_at?: string
          event_id?: string
          group_index?: number
          id?: string
          tee_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      player_team_members: {
        Row: {
          id: string
          joined_at: string
          player_id: string
          team_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          player_id: string
          team_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          player_id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_members_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "player_team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
        ]
      }
      player_teams: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          default_team_id: string | null
          handicap: number | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          phone: string | null
          tee_box_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          default_team_id?: string | null
          handicap?: number | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          tee_box_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          default_team_id?: string | null
          handicap?: number | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          tee_box_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "players_default_team_id_fkey"
            columns: ["default_team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_tee_box_id_fkey"
            columns: ["tee_box_id"]
            isOneToOne: false
            referencedRelation: "tee_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      round_scores: {
        Row: {
          created_at: string
          event_id: string
          id: string
          notes: string | null
          player_id: string
          points: number
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          notes?: string | null
          player_id: string
          points: number
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          notes?: string | null
          player_id?: string
          points?: number
        }
        Relationships: [
          {
            foreignKeyName: "round_scores_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "round_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players_public"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvp_schedules: {
        Row: {
          created_at: string
          created_by: string
          event_id: string
          id: string
          scheduled_for: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          event_id: string
          id?: string
          scheduled_for: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          event_id?: string
          id?: string
          scheduled_for?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvp_schedules_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      tee_boxes: {
        Row: {
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          typical_yardage: number | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          typical_yardage?: number | null
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          typical_yardage?: number | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      players_public: {
        Row: {
          created_at: string | null
          default_team_id: string | null
          handicap: number | null
          id: string | null
          is_active: boolean | null
          name: string | null
          tee_box_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_team_id?: string | null
          handicap?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          tee_box_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_team_id?: string | null
          handicap?: number | null
          id?: string | null
          is_active?: boolean | null
          name?: string | null
          tee_box_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "players_default_team_id_fkey"
            columns: ["default_team_id"]
            isOneToOne: false
            referencedRelation: "player_teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_tee_box_id_fkey"
            columns: ["tee_box_id"]
            isOneToOne: false
            referencedRelation: "tee_boxes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "scorer"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["admin", "scorer"],
    },
  },
} as const
