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
      ai_notes: {
        Row: {
          content: string | null
          created_at: string
          id: string
          refinement_history: Json | null
          source_material_ids: Json | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          id?: string
          refinement_history?: Json | null
          source_material_ids?: Json | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          id?: string
          refinement_history?: Json | null
          source_material_ids?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          issue_date: string
          issuing_organization: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          issue_date: string
          issuing_organization: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          issue_date?: string
          issuing_organization?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_otps: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          verified?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean
        }
        Relationships: []
      }
      exam_subjects: {
        Row: {
          created_at: string
          exam_id: string
          id: string
          subject_id: string
          topics: string | null
        }
        Insert: {
          created_at?: string
          exam_id: string
          id?: string
          subject_id: string
          topics?: string | null
        }
        Update: {
          created_at?: string
          exam_id?: string
          id?: string
          subject_id?: string
          topics?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exam_subjects_exam_id_fkey"
            columns: ["exam_id"]
            isOneToOne: false
            referencedRelation: "exams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exam_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          exam_date: string
          id: string
          score: number | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exam_date: string
          id?: string
          score?: number | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exam_date?: string
          id?: string
          score?: number | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age: number | null
          avatar_url: string | null
          birthday: string | null
          created_at: string
          current_cgpa: number | null
          email: string
          full_name: string | null
          id: string
          pg_college: string | null
          pg_course: string | null
          profession: string | null
          resume_url: string | null
          school_name: string | null
          tenth_percentage: number | null
          twelfth_percentage: number | null
          ug_college: string | null
          ug_course: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          age?: number | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          current_cgpa?: number | null
          email: string
          full_name?: string | null
          id: string
          pg_college?: string | null
          pg_course?: string | null
          profession?: string | null
          resume_url?: string | null
          school_name?: string | null
          tenth_percentage?: number | null
          twelfth_percentage?: number | null
          ug_college?: string | null
          ug_course?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          age?: number | null
          avatar_url?: string | null
          birthday?: string | null
          created_at?: string
          current_cgpa?: number | null
          email?: string
          full_name?: string | null
          id?: string
          pg_college?: string | null
          pg_course?: string | null
          profession?: string | null
          resume_url?: string | null
          school_name?: string | null
          tenth_percentage?: number | null
          twelfth_percentage?: number | null
          ug_college?: string | null
          ug_course?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      quiz_attempts: {
        Row: {
          created_at: string
          grading_result_json: Json
          id: string
          obtained_marks: number
          questions_json: Json
          quiz_level: Database["public"]["Enums"]["quiz_level"]
          source_material_reference: string | null
          total_marks: number
          user_answers_json: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          grading_result_json?: Json
          id?: string
          obtained_marks?: number
          questions_json?: Json
          quiz_level: Database["public"]["Enums"]["quiz_level"]
          source_material_reference?: string | null
          total_marks?: number
          user_answers_json?: Json
          user_id: string
        }
        Update: {
          created_at?: string
          grading_result_json?: Json
          id?: string
          obtained_marks?: number
          questions_json?: Json
          quiz_level?: Database["public"]["Enums"]["quiz_level"]
          source_material_reference?: string | null
          total_marks?: number
          user_answers_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      semester_gpas: {
        Row: {
          created_at: string
          credits: number | null
          gpa: number
          id: string
          semester: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits?: number | null
          gpa: number
          id?: string
          semester: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits?: number | null
          gpa?: number
          id?: string
          semester?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_materials: {
        Row: {
          content: string | null
          created_at: string
          folder: string | null
          id: string
          subject_id: string
          title: string
          type: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          subject_id: string
          title: string
          type: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          folder?: string | null
          id?: string
          subject_id?: string
          title?: string
          type?: string
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_materials_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          created_at: string
          date: string
          duration: number
          id: string
          notes: string | null
          subject_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          date?: string
          duration?: number
          id?: string
          notes?: string | null
          subject_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          duration?: number
          id?: string
          notes?: string | null
          subject_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          created_at: string
          exam_date: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          semester: string | null
          teacher: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          exam_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          semester?: string | null
          teacher?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          exam_date?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          semester?: string | null
          teacher?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      timetable_periods: {
        Row: {
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          location: string | null
          notes: string | null
          start_time: string
          subject_id: string | null
          teacher: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time: string
          subject_id?: string | null
          teacher?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          location?: string | null
          notes?: string | null
          start_time?: string
          subject_id?: string | null
          teacher?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_periods_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_type: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: Database["public"]["Enums"]["badge_type"]
          created_at?: string
          earned_at?: string
          id?: string
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
      badge_type:
        | "first_study_session"
        | "first_exam"
        | "first_subject"
        | "profile_complete"
        | "study_1_hour"
        | "study_3_hours"
        | "study_6_hours"
        | "study_streak_3"
        | "study_streak_7"
        | "study_streak_15"
        | "study_streak_30"
      quiz_level: "quick" | "detailed" | "comprehensive"
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
      badge_type: [
        "first_study_session",
        "first_exam",
        "first_subject",
        "profile_complete",
        "study_1_hour",
        "study_3_hours",
        "study_6_hours",
        "study_streak_3",
        "study_streak_7",
        "study_streak_15",
        "study_streak_30",
      ],
      quiz_level: ["quick", "detailed", "comprehensive"],
    },
  },
} as const
