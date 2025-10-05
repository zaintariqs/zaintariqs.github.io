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
      admin_actions: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          wallet_address: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          wallet_address: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      admin_wallets: {
        Row: {
          added_at: string
          added_by: string | null
          id: string
          is_active: boolean
          wallet_address: string
        }
        Insert: {
          added_at?: string
          added_by?: string | null
          id?: string
          is_active?: boolean
          wallet_address: string
        }
        Update: {
          added_at?: string
          added_by?: string | null
          id?: string
          is_active?: boolean
          wallet_address?: string
        }
        Relationships: []
      }
      blacklisted_addresses: {
        Row: {
          blacklisted_at: string
          blacklisted_by: string
          id: string
          is_active: boolean
          reason: string
          wallet_address: string
        }
        Insert: {
          blacklisted_at?: string
          blacklisted_by: string
          id?: string
          is_active?: boolean
          reason: string
          wallet_address: string
        }
        Update: {
          blacklisted_at?: string
          blacklisted_by?: string
          id?: string
          is_active?: boolean
          reason?: string
          wallet_address?: string
        }
        Relationships: []
      }
      deposits: {
        Row: {
          amount_pkr: number
          created_at: string
          id: string
          mint_transaction_hash: string | null
          payment_method: string
          phone_number: string
          receipt_url: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
          user_transaction_id: string | null
        }
        Insert: {
          amount_pkr: number
          created_at?: string
          id?: string
          mint_transaction_hash?: string | null
          payment_method: string
          phone_number: string
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
          user_transaction_id?: string | null
        }
        Update: {
          amount_pkr?: number
          created_at?: string
          id?: string
          mint_transaction_hash?: string | null
          payment_method?: string
          phone_number?: string
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
          user_transaction_id?: string | null
        }
        Relationships: []
      }
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
          bank_transaction_id: string | null
          burn_address: string
          cancellation_reason: string | null
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
          bank_transaction_id?: string | null
          burn_address?: string
          cancellation_reason?: string | null
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
          bank_transaction_id?: string | null
          burn_address?: string
          cancellation_reason?: string | null
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
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      whitelist_requests: {
        Row: {
          created_at: string
          email: string
          id: string
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          wallet_address: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          wallet_address: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_market_maker_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_trade_at: string
          status: Database["public"]["Enums"]["bot_status"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_wallet: {
        Args: { wallet_addr: string }
        Returns: boolean
      }
      is_wallet_owner: {
        Args: { wallet_address: string }
        Returns: boolean
      }
      is_wallet_whitelisted: {
        Args: { wallet_addr: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      bot_status: "active" | "paused" | "error"
      redemption_status:
        | "pending"
        | "burn_confirmed"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
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
      app_role: ["admin", "user"],
      bot_status: ["active", "paused", "error"],
      redemption_status: [
        "pending",
        "burn_confirmed",
        "processing",
        "completed",
        "failed",
        "cancelled",
      ],
    },
  },
} as const
