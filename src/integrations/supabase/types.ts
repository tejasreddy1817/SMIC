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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      content_ideas: {
        Row: {
          angle: string | null
          created_at: string
          creator_fit_score: number | null
          creator_id: string
          difficulty: string | null
          emotion: string | null
          estimated_length: string | null
          format: Database["public"]["Enums"]["content_format"] | null
          hook: string
          id: string
          originality_score: number | null
          SMICplicity_score: number | null
          status: Database["public"]["Enums"]["content_status"] | null
          trend_id: string | null
          viral_potential: number | null
        }
        Insert: {
          angle?: string | null
          created_at?: string
          creator_fit_score?: number | null
          creator_id: string
          difficulty?: string | null
          emotion?: string | null
          estimated_length?: string | null
          format?: Database["public"]["Enums"]["content_format"] | null
          hook: string
          id?: string
          originality_score?: number | null
          SMICplicity_score?: number | null
          status?: Database["public"]["Enums"]["content_status"] | null
          trend_id?: string | null
          viral_potential?: number | null
        }
        Update: {
          angle?: string | null
          created_at?: string
          creator_fit_score?: number | null
          creator_id?: string
          difficulty?: string | null
          emotion?: string | null
          estimated_length?: string | null
          format?: Database["public"]["Enums"]["content_format"] | null
          hook?: string
          id?: string
          originality_score?: number | null
          SMICplicity_score?: number | null
          status?: Database["public"]["Enums"]["content_status"] | null
          trend_id?: string | null
          viral_potential?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_ideas_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_ideas_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_voice_profiles: {
        Row: {
          creator_id: string
          embedding: string | null
          id: string
          style_tags: string[] | null
          tone_descriptors: Json | null
          updated_at: string
          vocabulary_patterns: Json | null
        }
        Insert: {
          creator_id: string
          embedding?: string | null
          id?: string
          style_tags?: string[] | null
          tone_descriptors?: Json | null
          updated_at?: string
          vocabulary_patterns?: Json | null
        }
        Update: {
          creator_id?: string
          embedding?: string | null
          id?: string
          style_tags?: string[] | null
          tone_descriptors?: Json | null
          updated_at?: string
          vocabulary_patterns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_voice_profiles_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_voice_samples: {
        Row: {
          content: string
          content_type: Database["public"]["Enums"]["content_type"]
          created_at: string
          creator_id: string
          id: string
          language: string | null
        }
        Insert: {
          content: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          creator_id: string
          id?: string
          language?: string | null
        }
        Update: {
          content?: string
          content_type?: Database["public"]["Enums"]["content_type"]
          created_at?: string
          creator_id?: string
          id?: string
          language?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_voice_samples_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
          languages: string[] | null
          niches: string[] | null
          onboarded_at: string | null
          platform_focus: Database["public"]["Enums"]["platform_type"][] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id?: string
          languages?: string[] | null
          niches?: string[] | null
          onboarded_at?: string | null
          platform_focus?: Database["public"]["Enums"]["platform_type"][] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          languages?: string[] | null
          niches?: string[] | null
          onboarded_at?: string | null
          platform_focus?: Database["public"]["Enums"]["platform_type"][] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      posted_content: {
        Row: {
          actual_comments: number | null
          actual_likes: number | null
          actual_saves: number | null
          actual_shares: number | null
          actual_views: number | null
          creator_id: string
          external_url: string | null
          id: string
          performance_captured_at: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          posted_at: string
          script_id: string | null
        }
        Insert: {
          actual_comments?: number | null
          actual_likes?: number | null
          actual_saves?: number | null
          actual_shares?: number | null
          actual_views?: number | null
          creator_id: string
          external_url?: string | null
          id?: string
          performance_captured_at?: string | null
          platform: Database["public"]["Enums"]["platform_type"]
          posted_at?: string
          script_id?: string | null
        }
        Update: {
          actual_comments?: number | null
          actual_likes?: number | null
          actual_saves?: number | null
          actual_shares?: number | null
          actual_views?: number | null
          creator_id?: string
          external_url?: string | null
          id?: string
          performance_captured_at?: string | null
          platform?: Database["public"]["Enums"]["platform_type"]
          posted_at?: string
          script_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "posted_content_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posted_content_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      predictions: {
        Row: {
          confidence: number | null
          created_at: string
          cta_strength: number | null
          emotional_arc: number | null
          feature_breakdown: Json | null
          hook_strength: number | null
          id: string
          improvement_suggestions: Json | null
          pacing_score: number | null
          predicted_views_high: number | null
          predicted_views_low: number | null
          retention_score: number | null
          script_id: string
          virality_score: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          cta_strength?: number | null
          emotional_arc?: number | null
          feature_breakdown?: Json | null
          hook_strength?: number | null
          id?: string
          improvement_suggestions?: Json | null
          pacing_score?: number | null
          predicted_views_high?: number | null
          predicted_views_low?: number | null
          retention_score?: number | null
          script_id: string
          virality_score?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          cta_strength?: number | null
          emotional_arc?: number | null
          feature_breakdown?: Json | null
          hook_strength?: number | null
          id?: string
          improvement_suggestions?: Json | null
          pacing_score?: number | null
          predicted_views_high?: number | null
          predicted_views_low?: number | null
          retention_score?: number | null
          script_id?: string
          virality_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "predictions_script_id_fkey"
            columns: ["script_id"]
            isOneToOne: false
            referencedRelation: "scripts"
            referencedColumns: ["id"]
          },
        ]
      }
      scripts: {
        Row: {
          body_beats: Json | null
          caption: string | null
          created_at: string
          creator_id: string
          cta: string | null
          estimated_duration: number | null
          hook_text: string
          id: string
          idea_id: string | null
          language: string | null
          status: Database["public"]["Enums"]["script_status"] | null
          title: string | null
          updated_at: string
          version: number | null
          visual_cues: Json | null
          word_count: number | null
        }
        Insert: {
          body_beats?: Json | null
          caption?: string | null
          created_at?: string
          creator_id: string
          cta?: string | null
          estimated_duration?: number | null
          hook_text: string
          id?: string
          idea_id?: string | null
          language?: string | null
          status?: Database["public"]["Enums"]["script_status"] | null
          title?: string | null
          updated_at?: string
          version?: number | null
          visual_cues?: Json | null
          word_count?: number | null
        }
        Update: {
          body_beats?: Json | null
          caption?: string | null
          created_at?: string
          creator_id?: string
          cta?: string | null
          estimated_duration?: number | null
          hook_text?: string
          id?: string
          idea_id?: string | null
          language?: string | null
          status?: Database["public"]["Enums"]["script_status"] | null
          title?: string | null
          updated_at?: string
          version?: number | null
          visual_cues?: Json | null
          word_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "scripts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scripts_idea_id_fkey"
            columns: ["idea_id"]
            isOneToOne: false
            referencedRelation: "content_ideas"
            referencedColumns: ["id"]
          },
        ]
      }
      trend_analysis: {
        Row: {
          ai_summary: string | null
          analyzed_at: string
          competition_score: number | null
          embedding: string | null
          id: string
          novelty_score: number | null
          opportunity_score: number | null
          relevance_niches: string[] | null
          trend_id: string
          velocity_score: number | null
        }
        Insert: {
          ai_summary?: string | null
          analyzed_at?: string
          competition_score?: number | null
          embedding?: string | null
          id?: string
          novelty_score?: number | null
          opportunity_score?: number | null
          relevance_niches?: string[] | null
          trend_id: string
          velocity_score?: number | null
        }
        Update: {
          ai_summary?: string | null
          analyzed_at?: string
          competition_score?: number | null
          embedding?: string | null
          id?: string
          novelty_score?: number | null
          opportunity_score?: number | null
          relevance_niches?: string[] | null
          trend_id?: string
          velocity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trend_analysis_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: true
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      trends: {
        Row: {
          created_by: string | null
          detected_at: string
          id: string
          language: string | null
          metadata: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          raw_content: string | null
          source_url: string | null
          title: string
          trend_type: Database["public"]["Enums"]["trend_type"]
        }
        Insert: {
          created_by?: string | null
          detected_at?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          platform: Database["public"]["Enums"]["platform_type"]
          raw_content?: string | null
          source_url?: string | null
          title: string
          trend_type?: Database["public"]["Enums"]["trend_type"]
        }
        Update: {
          created_by?: string | null
          detected_at?: string
          id?: string
          language?: string | null
          metadata?: Json | null
          platform?: Database["public"]["Enums"]["platform_type"]
          raw_content?: string | null
          source_url?: string | null
          title?: string
          trend_type?: Database["public"]["Enums"]["trend_type"]
        }
        Relationships: [
          {
            foreignKeyName: "trends_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "creators"
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
      content_format:
        | "skit"
        | "explainer"
        | "pov"
        | "reaction"
        | "storytime"
        | "listicle"
        | "tutorial"
        | "challenge"
      content_status: "draft" | "saved" | "used"
      content_type: "caption" | "script" | "bio" | "comment"
      platform_type: "instagram" | "youtube_shorts" | "tiktok"
      script_status: "draft" | "approved" | "posted"
      trend_type: "hashtag" | "audio" | "topic" | "keyword"
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
      content_format: [
        "skit",
        "explainer",
        "pov",
        "reaction",
        "storytime",
        "listicle",
        "tutorial",
        "challenge",
      ],
      content_status: ["draft", "saved", "used"],
      content_type: ["caption", "script", "bio", "comment"],
      platform_type: ["instagram", "youtube_shorts", "tiktok"],
      script_status: ["draft", "approved", "posted"],
      trend_type: ["hashtag", "audio", "topic", "keyword"],
    },
  },
} as const
