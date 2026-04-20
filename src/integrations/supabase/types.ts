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
      calls: {
        Row: {
          call_date: string
          call_type: string | null
          created_at: string
          db_note_line: string | null
          event_id: string | null
          id: string
          outcome: Database["public"]["Enums"]["call_outcome"] | null
          summary: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          call_date?: string
          call_type?: string | null
          created_at?: string
          db_note_line?: string | null
          event_id?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          summary?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          call_date?: string
          call_type?: string | null
          created_at?: string
          db_note_line?: string | null
          event_id?: string | null
          id?: string
          outcome?: Database["public"]["Enums"]["call_outcome"] | null
          summary?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calls_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      cm_schedules: {
        Row: {
          created_at: string
          day_of_week: number
          id: string
          shift1_end: string | null
          shift1_start: string | null
          shift2_end: string | null
          shift2_start: string | null
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          id?: string
          shift1_end?: string | null
          shift1_start?: string | null
          shift2_end?: string | null
          shift2_start?: string | null
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          id?: string
          shift1_end?: string | null
          shift1_start?: string | null
          shift2_end?: string | null
          shift2_start?: string | null
          updated_at?: string
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          organization_id: string | null
          phone: string | null
          role: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          phone?: string | null
          role?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          slug: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          slug: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          slug?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emails: {
        Row: {
          body: string | null
          created_at: string
          event_id: string | null
          id: string
          sent_status: string
          subject: string | null
          template_used: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          sent_status?: string
          subject?: string | null
          template_used?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          event_id?: string | null
          id?: string
          sent_status?: string
          subject?: string | null
          template_used?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emails_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          amateur_endorsement_sent: boolean
          auction_referred: boolean
          cgt_created: boolean
          cgt_url: string | null
          check_address: string | null
          check_mail_to: string | null
          check_payable_to: string | null
          course: string | null
          created_at: string
          custom_products_sold: boolean
          dixon_tournament_id: string | null
          entry_fee: number | null
          event_date: string | null
          event_name: string
          event_time: string | null
          event_website: string | null
          funds_use: string | null
          hot_lead: boolean
          id: string
          interest_amateur_endorsement: boolean
          interest_auction: boolean
          interest_cgt: boolean
          interest_custom_products: boolean
          interest_par3: boolean
          interest_par5: boolean
          last_contact_at: string | null
          lead_source: string | null
          notes: string | null
          organization_id: string | null
          pain_points: string | null
          par3_booked: boolean
          par5_booked: boolean
          player_count: number | null
          player_gift_budget: string | null
          primary_contact_id: string | null
          registration_method: string | null
          sponsorship_details: string | null
          stage: Database["public"]["Enums"]["pipeline_stage"]
          territory: string | null
          updated_at: string
          user_id: string
          where_left_off: string | null
        }
        Insert: {
          amateur_endorsement_sent?: boolean
          auction_referred?: boolean
          cgt_created?: boolean
          cgt_url?: string | null
          check_address?: string | null
          check_mail_to?: string | null
          check_payable_to?: string | null
          course?: string | null
          created_at?: string
          custom_products_sold?: boolean
          dixon_tournament_id?: string | null
          entry_fee?: number | null
          event_date?: string | null
          event_name: string
          event_time?: string | null
          event_website?: string | null
          funds_use?: string | null
          hot_lead?: boolean
          id?: string
          interest_amateur_endorsement?: boolean
          interest_auction?: boolean
          interest_cgt?: boolean
          interest_custom_products?: boolean
          interest_par3?: boolean
          interest_par5?: boolean
          last_contact_at?: string | null
          lead_source?: string | null
          notes?: string | null
          organization_id?: string | null
          pain_points?: string | null
          par3_booked?: boolean
          par5_booked?: boolean
          player_count?: number | null
          player_gift_budget?: string | null
          primary_contact_id?: string | null
          registration_method?: string | null
          sponsorship_details?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          territory?: string | null
          updated_at?: string
          user_id: string
          where_left_off?: string | null
        }
        Update: {
          amateur_endorsement_sent?: boolean
          auction_referred?: boolean
          cgt_created?: boolean
          cgt_url?: string | null
          check_address?: string | null
          check_mail_to?: string | null
          check_payable_to?: string | null
          course?: string | null
          created_at?: string
          custom_products_sold?: boolean
          dixon_tournament_id?: string | null
          entry_fee?: number | null
          event_date?: string | null
          event_name?: string
          event_time?: string | null
          event_website?: string | null
          funds_use?: string | null
          hot_lead?: boolean
          id?: string
          interest_amateur_endorsement?: boolean
          interest_auction?: boolean
          interest_cgt?: boolean
          interest_custom_products?: boolean
          interest_par3?: boolean
          interest_par5?: boolean
          last_contact_at?: string | null
          lead_source?: string | null
          notes?: string | null
          organization_id?: string | null
          pain_points?: string | null
          par3_booked?: boolean
          par5_booked?: boolean
          player_count?: number | null
          player_gift_budget?: string | null
          primary_contact_id?: string | null
          registration_method?: string | null
          sponsorship_details?: string | null
          stage?: Database["public"]["Enums"]["pipeline_stage"]
          territory?: string | null
          updated_at?: string
          user_id?: string
          where_left_off?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      next_action_presets: {
        Row: {
          created_at: string
          id: string
          label: string
          sort_order: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          sort_order?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          sort_order?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notes: {
        Row: {
          body: string
          created_at: string
          id: string
          pinned: boolean
          reminder_at: string | null
          task_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          reminder_at?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          pinned?: boolean
          reminder_at?: string | null
          task_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notes_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_pdfs: {
        Row: {
          created_at: string
          drive_file_id: string | null
          drive_url: string | null
          id: string
          name: string
          offer_slug: string
          public_url: string | null
          sort_order: number
          storage_path: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          name: string
          offer_slug: string
          public_url?: string | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          drive_file_id?: string | null
          drive_url?: string | null
          id?: string
          name?: string
          offer_slug?: string
          public_url?: string | null
          sort_order?: number
          storage_path?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          cost: string | null
          created_at: string
          details: string | null
          expanded_details: string | null
          id: string
          name: string
          slug: string
          sort_order: number
          type: string | null
          updated_at: string
          user_id: string
          when_to_introduce: string | null
        }
        Insert: {
          cost?: string | null
          created_at?: string
          details?: string | null
          expanded_details?: string | null
          id?: string
          name: string
          slug: string
          sort_order?: number
          type?: string | null
          updated_at?: string
          user_id: string
          when_to_introduce?: string | null
        }
        Update: {
          cost?: string | null
          created_at?: string
          details?: string | null
          expanded_details?: string | null
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          type?: string | null
          updated_at?: string
          user_id?: string
          when_to_introduce?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          cause: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cause?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cause?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      point_logs: {
        Row: {
          activity: Database["public"]["Enums"]["point_activity"]
          created_at: string
          event_id: string | null
          id: string
          log_date: string
          notes: string | null
          points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity: Database["public"]["Enums"]["point_activity"]
          created_at?: string
          event_id?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          points: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity?: Database["public"]["Enums"]["point_activity"]
          created_at?: string
          event_id?: string | null
          id?: string
          log_date?: string
          notes?: string | null
          points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      script_sections: {
        Row: {
          body: string
          created_at: string
          id: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          next_action: string
          next_action_at: string
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          next_action: string
          next_action_at: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          next_action?: string
          next_action_at?: string
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_goals: {
        Row: {
          created_at: string
          goal: number
          id: string
          updated_at: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          goal?: number
          id?: string
          updated_at?: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          goal?: number
          id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
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
      call_outcome:
        | "connected"
        | "voicemail"
        | "no_answer"
        | "wrong_number"
        | "not_interested"
        | "booked"
        | "follow_up"
      pipeline_stage:
        | "new_lead"
        | "contacted"
        | "left_voicemail"
        | "call_back_needed"
        | "pitch_delivered"
        | "challenges_booked"
        | "cgt_created"
        | "proposal_sent"
        | "follow_up_scheduled"
        | "closed_won"
        | "closed_lost"
      point_activity:
        | "par3_booked_with_poc"
        | "poc_watched_sponsorship_video"
        | "poc_watched_pricing_video"
        | "poc_watched_swag_video"
        | "cgt_ta_appointment_booked"
        | "auction_referred"
        | "event_worked_as_rep"
      task_priority: "low" | "normal" | "high" | "urgent"
      task_status: "pending" | "done" | "snoozed"
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
      call_outcome: [
        "connected",
        "voicemail",
        "no_answer",
        "wrong_number",
        "not_interested",
        "booked",
        "follow_up",
      ],
      pipeline_stage: [
        "new_lead",
        "contacted",
        "left_voicemail",
        "call_back_needed",
        "pitch_delivered",
        "challenges_booked",
        "cgt_created",
        "proposal_sent",
        "follow_up_scheduled",
        "closed_won",
        "closed_lost",
      ],
      point_activity: [
        "par3_booked_with_poc",
        "poc_watched_sponsorship_video",
        "poc_watched_pricing_video",
        "poc_watched_swag_video",
        "cgt_ta_appointment_booked",
        "auction_referred",
        "event_worked_as_rep",
      ],
      task_priority: ["low", "normal", "high", "urgent"],
      task_status: ["pending", "done", "snoozed"],
    },
  },
} as const
