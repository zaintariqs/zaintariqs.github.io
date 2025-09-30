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
      market_maker_config: {
        Row: {
          created_at: string
          id: string
          last_trade_at: string | null
          min_trade_interval_seconds: number
          price_threshold: number
          status: Database["public"]["Enums"]["bot_status"]
          target_price: number
          trade_amount_usdt: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_trade_at?: string | null
          min_trade_interval_seconds?: number
          price_threshold?: number
          status?: Database["public"]["Enums"]["bot_status"]
          target_price?: number
          trade_amount_usdt?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_trade_at?: string | null
          min_trade_interval_seconds?: number
          price_threshold?: number
          status?: Database["public"]["Enums"]["bot_status"]
          target_price?: number
          trade_amount_usdt?: number
          updated_at?: string
        }
        Relationships: []
      }
      market_maker_transactions: {
        Row: {
          action: string
          amount_pkrsc: number
          amount_usdt: number
          created_at: string
          error_message: string | null
          gas_used: number | null
          id: string
          price: number
          status: string
          transaction_hash: string
        }
        Insert: {
          action: string
          amount_pkrsc: number
          amount_usdt: number
          created_at?: string
          error_message?: string | null
          gas_used?: number | null
          id?: string
          price: number
          status?: string
          transaction_hash: string
        }
        Update: {
          action?: string
          amount_pkrsc?: number
          amount_usdt?: number
          created_at?: string
          error_message?: string | null
          gas_used?: number | null
          id?: string
          price?: number
          status?: string
          transaction_hash?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          account_number: string
          account_title: string
          bank_name: string
          burn_address: string
          created_at: string
          id: string
          pkrsc_amount: number
          status: Database["public"]["Enums"]["redemption_status"]
          transaction_hash: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account_number: string
          account_title: string
          bank_name: string
          burn_address?: string
          created_at?: string
          id?: string
          pkrsc_amount: number
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account_number?: string
          account_title?: string
          bank_name?: string
          burn_address?: string
          created_at?: string
          id?: string
          pkrsc_amount?: number
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_wallet_owner: {
        Args: { wallet_address: string }
        Returns: boolean
      }
    }
    Enums: {
      bot_status: "active" | "paused" | "error"
      redemption_status:
        | "pending"
        | "burn_confirmed"
        | "processing"
        | "completed"
        | "failed"
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
      bot_status: ["active", "paused", "error"],
      redemption_status: [
        "pending",
        "burn_confirmed",
        "processing",
        "completed",
        "failed",
      ],
    },
  },
} as const
