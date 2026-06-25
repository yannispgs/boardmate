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
          created_at: string
          has_games: boolean
          id: string
          is_active: boolean
          kind: string
          logo_url: string | null
          max_players: number | null
          min_players: number | null
          name: string
          rec_max_players: number | null
          rec_min_players: number | null
          tags: string[]
        }
        Insert: {
          avg_duration_min?: number | null
          created_at?: string
          has_games?: boolean
          id?: string
          is_active?: boolean
          kind?: string
          logo_url?: string | null
          max_players?: number | null
          min_players?: number | null
          name: string
          rec_max_players?: number | null
          rec_min_players?: number | null
          tags?: string[]
        }
        Update: {
          avg_duration_min?: number | null
          created_at?: string
          has_games?: boolean
          id?: string
          is_active?: boolean
          kind?: string
          logo_url?: string | null
          max_players?: number | null
          min_players?: number | null
          name?: string
          rec_max_players?: number | null
          rec_min_players?: number | null
          tags?: string[]
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
      game_players: {
        Row: {
          game_id: string
          is_winner: boolean
          player_id: string
          seat_order: number
        }
        Insert: {
          game_id: string
          is_winner?: boolean
          player_id: string
          seat_order: number
        }
        Update: {
          game_id?: string
          is_winner?: boolean
          player_id?: string
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
      game_turns: {
        Row: {
          created_at: string
          duration_s: number
          game_id: string
          id: string
          player_id: string
          round: number
          turn_no: number
        }
        Insert: {
          created_at?: string
          duration_s: number
          game_id: string
          id?: string
          player_id: string
          round: number
          turn_no: number
        }
        Update: {
          created_at?: string
          duration_s?: number
          game_id?: string
          id?: string
          player_id?: string
          round?: number
          turn_no?: number
        }
        Relationships: [
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
          current_player_id: string | null
          ended_at: string | null
          id: string
          round: number
          started_at: string
          status: string
          turn: number
        }
        Insert: {
          boardgame_id: string
          config_id?: string | null
          current_player_id?: string | null
          ended_at?: string | null
          id?: string
          round?: number
          started_at?: string
          status?: string
          turn?: number
        }
        Update: {
          boardgame_id?: string
          config_id?: string | null
          current_player_id?: string | null
          ended_at?: string | null
          id?: string
          round?: number
          started_at?: string
          status?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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

