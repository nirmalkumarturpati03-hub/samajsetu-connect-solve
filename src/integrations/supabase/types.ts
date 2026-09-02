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
      escalations: {
        Row: {
          created_at: string
          from_org_id: string | null
          id: string
          problem_id: string
          reason: string
          status: string
          to_org_id: string | null
        }
        Insert: {
          created_at?: string
          from_org_id?: string | null
          id?: string
          problem_id: string
          reason: string
          status?: string
          to_org_id?: string | null
        }
        Update: {
          created_at?: string
          from_org_id?: string | null
          id?: string
          problem_id?: string
          reason?: string
          status?: string
          to_org_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "escalations_from_org_id_fkey"
            columns: ["from_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "escalations_to_org_id_fkey"
            columns: ["to_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address: string | null
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          district: string
          expertise: string[]
          id: string
          lat: number | null
          lng: number | null
          name: string
          org_type: string
          owner_id: string | null
          resources: string | null
        }
        Insert: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          district: string
          expertise?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          org_type: string
          owner_id?: string | null
          resources?: string | null
        }
        Update: {
          address?: string | null
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          district?: string
          expertise?: string[]
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          org_type?: string
          owner_id?: string | null
          resources?: string | null
        }
        Relationships: []
      }
      problem_events: {
        Row: {
          created_at: string
          detail: string | null
          event: string
          id: string
          problem_id: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event: string
          id?: string
          problem_id: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          event?: string
          id?: string
          problem_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "problem_events_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problem_supports: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          media: Json
          problem_id: string
          supporter_name: string | null
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          media?: Json
          problem_id: string
          supporter_name?: string | null
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          media?: Json
          problem_id?: string
          supporter_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "problem_supports_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
        ]
      }
      problems: {
        Row: {
          affected_count: number
          assigned_org_id: string | null
          category: string
          created_at: string
          description: string
          district: string | null
          id: string
          lat: number | null
          lng: number | null
          location_text: string | null
          media: Json
          public_id: string | null
          reporter_contact: string | null
          reporter_name: string | null
          resolution_note: string | null
          severity: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_count?: number
          assigned_org_id?: string | null
          category?: string
          created_at?: string
          description: string
          district?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_text?: string | null
          media?: Json
          public_id?: string | null
          reporter_contact?: string | null
          reporter_name?: string | null
          resolution_note?: string | null
          severity?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_count?: number
          assigned_org_id?: string | null
          category?: string
          created_at?: string
          description?: string
          district?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          location_text?: string | null
          media?: Json
          public_id?: string | null
          reporter_contact?: string | null
          reporter_name?: string | null
          resolution_note?: string | null
          severity?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "problems_assigned_org_id_fkey"
            columns: ["assigned_org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          completion_note: string | null
          created_at: string
          deadline: string | null
          description: string
          evidence_media: Json
          id: string
          org_id: string
          problem_id: string
          review_status: string
          status: string
          volunteer_id: string | null
        }
        Insert: {
          completion_note?: string | null
          created_at?: string
          deadline?: string | null
          description: string
          evidence_media?: Json
          id?: string
          org_id: string
          problem_id: string
          review_status?: string
          status?: string
          volunteer_id?: string | null
        }
        Update: {
          completion_note?: string | null
          created_at?: string
          deadline?: string | null
          description?: string
          evidence_media?: Json
          id?: string
          org_id?: string
          problem_id?: string
          review_status?: string
          status?: string
          volunteer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tasks_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_problem_id_fkey"
            columns: ["problem_id"]
            isOneToOne: false
            referencedRelation: "problems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_volunteer_id_fkey"
            columns: ["volunteer_id"]
            isOneToOne: false
            referencedRelation: "volunteers"
            referencedColumns: ["id"]
          },
        ]
      }
      volunteers: {
        Row: {
          availability: string
          created_at: string
          department: string | null
          email: string | null
          experience: string | null
          id: string
          name: string
          org_id: string
          phone: string | null
          photo_url: string | null
          skills: string[]
        }
        Insert: {
          availability?: string
          created_at?: string
          department?: string | null
          email?: string | null
          experience?: string | null
          id?: string
          name: string
          org_id: string
          phone?: string | null
          photo_url?: string | null
          skills?: string[]
        }
        Update: {
          availability?: string
          created_at?: string
          department?: string | null
          email?: string | null
          experience?: string | null
          id?: string
          name?: string
          org_id?: string
          phone?: string | null
          photo_url?: string | null
          skills?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "volunteers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
