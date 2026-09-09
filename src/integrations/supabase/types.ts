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
      courses: {
        Row: {
          code: string
          consecutive_block: boolean
          course_type: string
          created_at: string
          credit: number
          department: string
          faculty_id: string | null
          id: string
          max_periods_per_day: number
          name: string
          periods_per_week: number
          required_hours: number
          room_type: string
          section: string
          student_count: number
        }
        Insert: {
          code: string
          consecutive_block?: boolean
          course_type: string
          created_at?: string
          credit: number
          department: string
          faculty_id?: string | null
          id?: string
          max_periods_per_day: number
          name: string
          periods_per_week: number
          required_hours: number
          room_type: string
          section: string
          student_count?: number
        }
        Update: {
          code?: string
          consecutive_block?: boolean
          course_type?: string
          created_at?: string
          credit?: number
          department?: string
          faculty_id?: string | null
          id?: string
          max_periods_per_day?: number
          name?: string
          periods_per_week?: number
          required_hours?: number
          room_type?: string
          section?: string
          student_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "courses_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty: {
        Row: {
          created_at: string
          department: string
          email: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          department: string
          email: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          department?: string
          email?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      generation_runs: {
        Row: {
          created_at: string
          created_by: string | null
          generations: number
          hard_violations: number
          id: string
          initial_fitness: number
          optimized_fitness: number
          population: number
          soft_violations: number
          validation_score: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          generations?: number
          hard_violations?: number
          id?: string
          initial_fitness?: number
          optimized_fitness?: number
          population?: number
          soft_violations?: number
          validation_score?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          generations?: number
          hard_violations?: number
          id?: string
          initial_fitness?: number
          optimized_fitness?: number
          population?: number
          soft_violations?: number
          validation_score?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          department: string | null
          faculty_id: string | null
          full_name: string | null
          id: string
          is_active: boolean
          section: string | null
          username: string
        }
        Insert: {
          created_at?: string
          department?: string | null
          faculty_id?: string | null
          full_name?: string | null
          id: string
          is_active?: boolean
          section?: string | null
          username: string
        }
        Update: {
          created_at?: string
          department?: string | null
          faculty_id?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean
          section?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          capacity: number
          created_at: string
          id: string
          room_number: string
          room_type: string
        }
        Insert: {
          capacity: number
          created_at?: string
          id?: string
          room_number: string
          room_type: string
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          room_number?: string
          room_type?: string
        }
        Relationships: []
      }
      semester_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          period_duration_minutes: number
          semester_end_date: string | null
          semester_months: number
          semester_name: string
          semester_start_date: string | null
          teaching_weeks: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_duration_minutes?: number
          semester_end_date?: string | null
          semester_months?: number
          semester_name: string
          semester_start_date?: string | null
          teaching_weeks?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          period_duration_minutes?: number
          semester_end_date?: string | null
          semester_months?: number
          semester_name?: string
          semester_start_date?: string | null
          teaching_weeks?: number
        }
        Relationships: []
      }
      timetable: {
        Row: {
          course_id: string
          created_at: string
          day: string
          id: string
          occurrence: number
          period: number
          room_id: string | null
          timing: string
        }
        Insert: {
          course_id: string
          created_at?: string
          day: string
          id?: string
          occurrence: number
          period: number
          room_id?: string | null
          timing: string
        }
        Update: {
          course_id?: string
          created_at?: string
          day?: string
          id?: string
          occurrence?: number
          period?: number
          room_id?: string | null
          timing?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "faculty" | "student"
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
      app_role: ["admin", "faculty", "student"],
    },
  },
} as const
