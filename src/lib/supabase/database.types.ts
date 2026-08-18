export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      auth_rate_limits: {
        Row: {
          blocked_until: string | null
          count: number
          key: string
          updated_at: string
          violations: number
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          count?: number
          key: string
          updated_at?: string
          violations?: number
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          count?: number
          key?: string
          updated_at?: string
          violations?: number
          window_start?: string
        }
        Relationships: []
      }
      boardgames: {
        Row: {
          avg_duration_min: number | null
          board_generator: string | null
          created_at: string
          dice: Json | null
          has_games: boolean
          id: string
          is_active: boolean
          is_timed: boolean
          kind: string
          logo_url: string | null
          max_players: number | null
          milestones: Json | null
          min_players: number | null
          name: string
          phases: Json | null
          rec_max_players: number | null
          rec_min_players: number | null
          round_goals: Json
          round_limit: number | null
          scoring: Json | null
          stages: Json | null
          tags: string[]
          track_seat_stats: boolean
          turn_count_varies: boolean
          turn_mode: string
        }
        Insert: {
          avg_duration_min?: number | null
          board_generator?: string | null
          created_at?: string
          dice?: Json | null
          has_games?: boolean
          id?: string
          is_active?: boolean
          is_timed?: boolean
          kind?: string
          logo_url?: string | null
          max_players?: number | null
          milestones?: Json | null
          min_players?: number | null
          name: string
          phases?: Json | null
          rec_max_players?: number | null
          rec_min_players?: number | null
          round_goals?: Json
          round_limit?: number | null
          scoring?: Json | null
          stages?: Json | null
          tags?: string[]
          track_seat_stats?: boolean
          turn_count_varies?: boolean
          turn_mode?: string
        }
        Update: {
          avg_duration_min?: number | null
          board_generator?: string | null
          created_at?: string
          dice?: Json | null
          has_games?: boolean
          id?: string
          is_active?: boolean
          is_timed?: boolean
          kind?: string
          logo_url?: string | null
          max_players?: number | null
          milestones?: Json | null
          min_players?: number | null
          name?: string
          phases?: Json | null
          rec_max_players?: number | null
          rec_min_players?: number | null
          round_goals?: Json
          round_limit?: number | null
          scoring?: Json | null
          stages?: Json | null
          tags?: string[]
          track_seat_stats?: boolean
          turn_count_varies?: boolean
          turn_mode?: string
        }
        Relationships: []
      }
      config_templates: {
        Row: {
          boardgame_id: string
          fields: Json
        }
        Insert: {
          boardgame_id: string
          fields?: Json
        }
        Update: {
          boardgame_id?: string
          fields?: Json
        }
        Relationships: [
          {
            foreignKeyName: "config_templates_boardgame_id_fkey"
            columns: ["boardgame_id"]
            isOneToOne: true
            referencedRelation: "boardgames"
            referencedColumns: ["id"]
          },
        ]
      }
      configs: {
        Row: {
          boardgame_id: string
          created_at: string
          id: string
          name: string
          values: Json
        }
        Insert: {
          boardgame_id: string
          created_at?: string
          id?: string
          name: string
          values?: Json
        }
        Update: {
          boardgame_id?: string
          created_at?: string
          id?: string
          name?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "configs_boardgame_id_fkey"
            columns: ["boardgame_id"]
            isOneToOne: false
            referencedRelation: "boardgames"
            referencedColumns: ["id"]
          },
        ]
      }
      dice_rolls: {
        Row: {
          created_at: string
          game_id: string
          id: string
          value: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          value: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "dice_rolls_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      extension_scenarios: {
        Row: {
          board_spec: Json | null
          extension_id: string
          id: string
          is_official: boolean
          name: string
          sort_order: number
          target_score: number | null
        }
        Insert: {
          board_spec?: Json | null
          extension_id: string
          id?: string
          is_official?: boolean
          name: string
          sort_order?: number
          target_score?: number | null
        }
        Update: {
          board_spec?: Json | null
          extension_id?: string
          id?: string
          is_official?: boolean
          name?: string
          sort_order?: number
          target_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "extension_scenarios_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      extensions: {
        Row: {
          base_game_id: string
          changes_board: boolean
          config_fields: Json
          created_at: string
          has_scenarios: boolean
          id: string
          is_active: boolean
          key: string | null
          name: string
          round_goals: Json
          scoring_delta: Json | null
          sort_order: number
          target_modifier: number
        }
        Insert: {
          base_game_id: string
          changes_board?: boolean
          config_fields?: Json
          created_at?: string
          has_scenarios?: boolean
          id?: string
          is_active?: boolean
          key?: string | null
          name: string
          round_goals?: Json
          scoring_delta?: Json | null
          sort_order?: number
          target_modifier?: number
        }
        Update: {
          base_game_id?: string
          changes_board?: boolean
          config_fields?: Json
          created_at?: string
          has_scenarios?: boolean
          id?: string
          is_active?: boolean
          key?: string | null
          name?: string
          round_goals?: Json
          scoring_delta?: Json | null
          sort_order?: number
          target_modifier?: number
        }
        Relationships: [
          {
            foreignKeyName: "extensions_base_game_id_fkey"
            columns: ["base_game_id"]
            isOneToOne: false
            referencedRelation: "boardgames"
            referencedColumns: ["id"]
          },
        ]
      }
      faq_entries: {
        Row: {
          answer: string
          boardgame_id: string | null
          created_at: string
          extension_id: string | null
          id: string
          question: string
          sort_order: number
        }
        Insert: {
          answer: string
          boardgame_id?: string | null
          created_at?: string
          extension_id?: string | null
          id?: string
          question: string
          sort_order?: number
        }
        Update: {
          answer?: string
          boardgame_id?: string | null
          created_at?: string
          extension_id?: string | null
          id?: string
          question?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "faq_entries_boardgame_id_fkey"
            columns: ["boardgame_id"]
            isOneToOne: false
            referencedRelation: "boardgames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faq_entries_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extensions"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          created_at: string
          id: string
          message: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          status?: string
        }
        Relationships: []
      }
      game_extensions: {
        Row: {
          extension_id: string
          game_id: string
          scenario_id: string | null
        }
        Insert: {
          extension_id: string
          game_id: string
          scenario_id?: string | null
        }
        Update: {
          extension_id?: string
          game_id?: string
          scenario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "game_extensions_extension_id_fkey"
            columns: ["extension_id"]
            isOneToOne: false
            referencedRelation: "extensions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_extensions_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_extensions_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "extension_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      game_milestones: {
        Row: {
          created_at: string
          game_id: string
          id: string
          milestone_key: string
          player_id: string
          stage: number | null
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          milestone_key: string
          player_id: string
          stage?: number | null
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          milestone_key?: string
          player_id?: string
          stage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_milestones_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_milestones_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_players: {
        Row: {
          game_id: string
          is_winner: boolean
          player_id: string
          score: number | null
          score_breakdown: Json | null
          seat_order: number
        }
        Insert: {
          game_id: string
          is_winner?: boolean
          player_id: string
          score?: number | null
          score_breakdown?: Json | null
          seat_order: number
        }
        Update: {
          game_id?: string
          is_winner?: boolean
          player_id?: string
          score?: number | null
          score_breakdown?: Json | null
          seat_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_players_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_phases: {
        Row: {
          duration_s: number
          game_id: string
          phase_key: string
          stage: number
        }
        Insert: {
          duration_s?: number
          game_id: string
          phase_key: string
          stage: number
        }
        Update: {
          duration_s?: number
          game_id?: string
          phase_key?: string
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_phases_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_stage_passes: {
        Row: {
          created_at: string
          game_id: string
          id: string
          player_id: string
          stage: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          player_id: string
          stage: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_stage_passes_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stage_passes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_stage_scores: {
        Row: {
          game_id: string
          player_id: string
          points: number
          stage: number
        }
        Insert: {
          game_id: string
          player_id: string
          points?: number
          stage: number
        }
        Update: {
          game_id?: string
          player_id?: string
          points?: number
          stage?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_stage_scores_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_stage_scores_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_stages: {
        Row: {
          game_id: string
          goal_key: string
          goal_params: Json
          stage: number
          turns: number
        }
        Insert: {
          game_id: string
          goal_key: string
          goal_params?: Json
          stage: number
          turns: number
        }
        Update: {
          game_id?: string
          goal_key?: string
          goal_params?: Json
          stage?: number
          turns?: number
        }
        Relationships: [
          {
            foreignKeyName: "game_stages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      game_turns: {
        Row: {
          blocked_by_player_id: string | null
          created_at: string
          duration_s: number
          game_id: string
          id: string
          overtime_s: number
          pause_count: number
          pause_duration_s: number
          player_id: string | null
          round: number
          stage: number | null
          turn_no: number
          waited_s: number | null
        }
        Insert: {
          blocked_by_player_id?: string | null
          created_at?: string
          duration_s: number
          game_id: string
          id?: string
          overtime_s?: number
          pause_count?: number
          pause_duration_s?: number
          player_id?: string | null
          round: number
          stage?: number | null
          turn_no: number
          waited_s?: number | null
        }
        Update: {
          blocked_by_player_id?: string | null
          created_at?: string
          duration_s?: number
          game_id?: string
          id?: string
          overtime_s?: number
          pause_count?: number
          pause_duration_s?: number
          player_id?: string | null
          round?: number
          stage?: number | null
          turn_no?: number
          waited_s?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_turns_blocked_by_player_id_fkey"
            columns: ["blocked_by_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_turns_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_turns_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          boardgame_id: string
          config_id: string | null
          config_values: Json | null
          current_player_id: string | null
          ended_at: string | null
          id: string
          phase: number
          round: number
          stage: number
          started_at: string
          status: string
          tie_break: Json | null
          turn: number
        }
        Insert: {
          boardgame_id: string
          config_id?: string | null
          config_values?: Json | null
          current_player_id?: string | null
          ended_at?: string | null
          id?: string
          phase?: number
          round?: number
          stage?: number
          started_at?: string
          status?: string
          tie_break?: Json | null
          turn?: number
        }
        Update: {
          boardgame_id?: string
          config_id?: string | null
          config_values?: Json | null
          current_player_id?: string | null
          ended_at?: string | null
          id?: string
          phase?: number
          round?: number
          stage?: number
          started_at?: string
          status?: string
          tie_break?: Json | null
          turn?: number
        }
        Relationships: [
          {
            foreignKeyName: "games_boardgame_id_fkey"
            columns: ["boardgame_id"]
            isOneToOne: false
            referencedRelation: "boardgames"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_config_id_fkey"
            columns: ["config_id"]
            isOneToOne: false
            referencedRelation: "configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_current_player_id_fkey"
            columns: ["current_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          billable: boolean
          key: string
          label: string
          section: string
          sort_order: number
        }
        Insert: {
          action: string
          billable?: boolean
          key: string
          label: string
          section: string
          sort_order?: number
        }
        Update: {
          action?: string
          billable?: boolean
          key?: string
          label?: string
          section?: string
          sort_order?: number
        }
        Relationships: []
      }
      players: {
        Row: {
          created_at: string
          has_played: boolean
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          created_at?: string
          has_played?: boolean
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          created_at?: string
          has_played?: boolean
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_admin: boolean
          is_system: boolean
          key: string
          label: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_admin?: boolean
          is_system?: boolean
          key: string
          label: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_admin?: boolean
          is_system?: boolean
          key?: string
          label?: string
        }
        Relationships: []
      }
      score_events: {
        Row: {
          created_at: string
          game_id: string
          id: string
          player_id: string
          round: number
          score: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          player_id: string
          round?: number
          score: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          player_id?: string
          round?: number
          score?: number
        }
        Relationships: [
          {
            foreignKeyName: "score_events_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "score_events_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accounts: {
        Args: never
        Returns: {
          created_at: string
          email: string
          last_sign_in_at: string
          user_id: string
        }[]
      }
      assert_activation_permission: {
        Args: { p_family: string; p_now: boolean; p_was: boolean }
        Returns: undefined
      }
      check_auth_rate_limit: {
        Args: {
          p_base_block_s?: number
          p_key: string
          p_max?: number
          p_max_block_s?: number
          p_window_s?: number
        }
        Returns: {
          allowed: boolean
          retry_after_s: number
        }[]
      }
      game_is_ongoing: { Args: { p_game_id: string }; Returns: boolean }
      has_permission: { Args: { p_key: string }; Returns: boolean }
      is_admin_role: { Args: { p_role_id: string }; Returns: boolean }
      my_permissions: { Args: never; Returns: string[] }
      set_game_seat_order: {
        Args: { p_game: string; p_players: string[] }
        Returns: undefined
      }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

