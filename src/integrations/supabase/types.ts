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
          nonce: string | null
          signature: string | null
          signed_message: string | null
          wallet_address: string
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          nonce?: string | null
          signature?: string | null
          signed_message?: string | null
          wallet_address: string
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          nonce?: string | null
          signature?: string | null
          signed_message?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      admin_rate_limits: {
        Row: {
          created_at: string
          id: string
          last_operation_at: string
          operation_count: number
          operation_type: string
          wallet_address: string
          window_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_operation_at?: string
          operation_count?: number
          operation_type: string
          wallet_address: string
          window_start?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_operation_at?: string
          operation_count?: number
          operation_type?: string
          wallet_address?: string
          window_start?: string
        }
        Relationships: []
      }
      admin_roles: {
        Row: {
          granted_at: string
          granted_by: string
          id: string
          permission: Database["public"]["Enums"]["admin_permission"]
          wallet_address: string
        }
        Insert: {
          granted_at?: string
          granted_by: string
          id?: string
          permission: Database["public"]["Enums"]["admin_permission"]
          wallet_address: string
        }
        Update: {
          granted_at?: string
          granted_by?: string
          id?: string
          permission?: Database["public"]["Enums"]["admin_permission"]
          wallet_address?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_roles_wallet_address_fkey"
            columns: ["wallet_address"]
            isOneToOne: false
            referencedRelation: "admin_wallets"
            referencedColumns: ["wallet_address"]
          },
        ]
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
      bank_reserves: {
        Row: {
          amount: number
          created_at: string
          id: string
          last_updated: string
          reserve_type: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          last_updated?: string
          reserve_type: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          last_updated?: string
          reserve_type?: string
          updated_at?: string
          updated_by?: string | null
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
          email_verified: boolean | null
          full_phone_accessed_at: string | null
          full_phone_accessed_by: string | null
          id: string
          mint_transaction_hash: string | null
          payment_method: string
          phone_encrypted: boolean | null
          phone_encryption_version: number | null
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
          verification_attempts: number | null
          verification_code: string | null
          verification_expires_at: string | null
        }
        Insert: {
          amount_pkr: number
          created_at?: string
          email_verified?: boolean | null
          full_phone_accessed_at?: string | null
          full_phone_accessed_by?: string | null
          id?: string
          mint_transaction_hash?: string | null
          payment_method: string
          phone_encrypted?: boolean | null
          phone_encryption_version?: number | null
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
          verification_attempts?: number | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Update: {
          amount_pkr?: number
          created_at?: string
          email_verified?: boolean | null
          full_phone_accessed_at?: string | null
          full_phone_accessed_by?: string | null
          id?: string
          mint_transaction_hash?: string | null
          payment_method?: string
          phone_encrypted?: boolean | null
          phone_encryption_version?: number | null
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
          verification_attempts?: number | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Relationships: []
      }
      deposits_public: {
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
          created_at: string
          id: string
          mint_transaction_hash?: string | null
          payment_method: string
          phone_number: string
          receipt_url?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status: string
          submitted_at?: string | null
          transaction_id?: string | null
          updated_at: string
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
      encrypted_emails: {
        Row: {
          accessed_at: string | null
          accessed_by: string | null
          created_at: string
          encrypted_email: string
          id: string
          wallet_address: string
        }
        Insert: {
          accessed_at?: string | null
          accessed_by?: string | null
          created_at?: string
          encrypted_email: string
          id?: string
          wallet_address: string
        }
        Update: {
          accessed_at?: string | null
          accessed_by?: string | null
          created_at?: string
          encrypted_email?: string
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          created_at: string
          fingerprint: string
          id: string
          ip_address: string | null
          user_agent: string | null
          wallet_address: string
        }
        Insert: {
          created_at?: string
          fingerprint: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          wallet_address: string
        }
        Update: {
          created_at?: string
          fingerprint?: string
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          wallet_address?: string
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
      master_minter_config: {
        Row: {
          created_at: string
          id: string
          master_minter_address: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          master_minter_address: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          master_minter_address?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      master_minter_history: {
        Row: {
          approved_by: string[] | null
          change_reason: string | null
          changed_by: string
          created_at: string
          id: string
          new_address: string
          old_address: string | null
        }
        Insert: {
          approved_by?: string[] | null
          change_reason?: string | null
          changed_by: string
          created_at?: string
          id?: string
          new_address: string
          old_address?: string | null
        }
        Update: {
          approved_by?: string[] | null
          change_reason?: string | null
          changed_by?: string
          created_at?: string
          id?: string
          new_address?: string
          old_address?: string | null
        }
        Relationships: []
      }
      pii_access_log: {
        Row: {
          access_reason: string | null
          access_timestamp: string
          accessed_by_wallet: string
          accessed_fields: string[]
          accessed_record_id: string
          accessed_table: string
          id: string
          ip_address: string | null
        }
        Insert: {
          access_reason?: string | null
          access_timestamp?: string
          accessed_by_wallet: string
          accessed_fields: string[]
          accessed_record_id: string
          accessed_table: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          access_reason?: string | null
          access_timestamp?: string
          accessed_by_wallet?: string
          accessed_fields?: string[]
          accessed_record_id?: string
          accessed_table?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          account_number: string
          account_title: string
          bank_details_accessed_at: string | null
          bank_details_accessed_by: string | null
          bank_name: string
          bank_transaction_id: string | null
          burn_address: string
          cancellation_reason: string | null
          created_at: string
          email_verified: boolean | null
          id: string
          pkrsc_amount: number
          status: Database["public"]["Enums"]["redemption_status"]
          transaction_hash: string | null
          updated_at: string
          user_id: string
          verification_attempts: number | null
          verification_code: string | null
          verification_expires_at: string | null
        }
        Insert: {
          account_number: string
          account_title: string
          bank_details_accessed_at?: string | null
          bank_details_accessed_by?: string | null
          bank_name: string
          bank_transaction_id?: string | null
          burn_address?: string
          cancellation_reason?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          pkrsc_amount: number
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_hash?: string | null
          updated_at?: string
          user_id: string
          verification_attempts?: number | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Update: {
          account_number?: string
          account_title?: string
          bank_details_accessed_at?: string | null
          bank_details_accessed_by?: string | null
          bank_name?: string
          bank_transaction_id?: string | null
          burn_address?: string
          cancellation_reason?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          pkrsc_amount?: number
          status?: Database["public"]["Enums"]["redemption_status"]
          transaction_hash?: string | null
          updated_at?: string
          user_id?: string
          verification_attempts?: number | null
          verification_code?: string | null
          verification_expires_at?: string | null
        }
        Relationships: []
      }
      special_addresses: {
        Row: {
          address: string
          created_at: string
          id: string
          label: string
          label_type: string
          updated_at: string
        }
        Insert: {
          address: string
          created_at?: string
          id?: string
          label: string
          label_type: string
          updated_at?: string
        }
        Update: {
          address?: string
          created_at?: string
          id?: string
          label?: string
          label_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_fees: {
        Row: {
          created_at: string
          fee_amount: number
          fee_percentage: number
          id: string
          net_amount: number
          original_amount: number
          transaction_id: string
          transaction_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          fee_amount: number
          fee_percentage?: number
          id?: string
          net_amount: number
          original_amount: number
          transaction_id: string
          transaction_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          fee_amount?: number
          fee_percentage?: number
          id?: string
          net_amount?: number
          original_amount?: number
          transaction_id?: string
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      used_transaction_hashes: {
        Row: {
          created_at: string
          id: string
          transaction_hash: string
          transaction_type: string
          used_at: string
          used_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          transaction_hash: string
          transaction_type: string
          used_at?: string
          used_by: string
        }
        Update: {
          created_at?: string
          id?: string
          transaction_hash?: string
          transaction_type?: string
          used_at?: string
          used_by?: string
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
      welcome_bonuses: {
        Row: {
          amount: number
          created_at: string
          distributed_at: string | null
          error_message: string | null
          id: string
          status: Database["public"]["Enums"]["bonus_status"]
          transaction_hash: string | null
          wallet_address: string
        }
        Insert: {
          amount?: number
          created_at?: string
          distributed_at?: string | null
          error_message?: string | null
          id?: string
          status?: Database["public"]["Enums"]["bonus_status"]
          transaction_hash?: string | null
          wallet_address: string
        }
        Update: {
          amount?: number
          created_at?: string
          distributed_at?: string | null
          error_message?: string | null
          id?: string
          status?: Database["public"]["Enums"]["bonus_status"]
          transaction_hash?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
      whitelist_access_log: {
        Row: {
          access_type: string
          accessed_by: string
          created_at: string
          id: string
          wallet_address: string
        }
        Insert: {
          access_type: string
          accessed_by: string
          created_at?: string
          id?: string
          wallet_address: string
        }
        Update: {
          access_type?: string
          accessed_by?: string
          created_at?: string
          id?: string
          wallet_address?: string
        }
        Relationships: []
      }
      whitelist_requests: {
        Row: {
          client_ip: string | null
          created_at: string
          email_verified: boolean | null
          id: string
          nonce: string | null
          rejection_reason: string | null
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          signature: string | null
          status: string
          updated_at: string
          verification_attempts: number | null
          verification_code: string | null
          verification_expires_at: string | null
          wallet_address: string
        }
        Insert: {
          client_ip?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          nonce?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature?: string | null
          status?: string
          updated_at?: string
          verification_attempts?: number | null
          verification_code?: string | null
          verification_expires_at?: string | null
          wallet_address: string
        }
        Update: {
          client_ip?: string | null
          created_at?: string
          email_verified?: boolean | null
          id?: string
          nonce?: string | null
          rejection_reason?: string | null
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          signature?: string | null
          status?: string
          updated_at?: string
          verification_attempts?: number | null
          verification_code?: string | null
          verification_expires_at?: string | null
          wallet_address?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_and_update_rate_limit: {
        Args: {
          p_max_operations?: number
          p_operation_type: string
          p_wallet_address: string
          p_window_minutes?: number
        }
        Returns: {
          allowed: boolean
          retry_after_seconds: number
        }[]
      }
      cleanup_old_rate_limits: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_market_maker_cron_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          active: boolean
          jobname: string
          last_run: string
          next_run: string
          schedule: string
        }[]
      }
      get_market_maker_status: {
        Args: Record<PropertyKey, never>
        Returns: {
          last_trade_at: string
          status: Database["public"]["Enums"]["bot_status"]
        }[]
      }
      get_master_minter_address: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_promotional_reserve_balance: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      has_admin_permission: {
        Args: {
          _permission: Database["public"]["Enums"]["admin_permission"]
          _wallet_address: string
        }
        Returns: boolean
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
      is_nonce_used: {
        Args: { _nonce: string }
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
      log_pii_access: {
        Args: {
          p_accessed_by: string
          p_fields: string[]
          p_ip?: string
          p_reason?: string
          p_record_id: string
          p_table: string
        }
        Returns: undefined
      }
      mask_phone_number: {
        Args: { phone: string }
        Returns: string
      }
      toggle_market_maker_cron: {
        Args: { enable: boolean }
        Returns: boolean
      }
      update_pkr_reserves: {
        Args: { amount_change: number; updated_by_wallet: string }
        Returns: undefined
      }
      update_promotional_reserves: {
        Args: { amount_change: number; updated_by_wallet: string }
        Returns: undefined
      }
    }
    Enums: {
      admin_permission:
        | "view_deposits"
        | "approve_deposits"
        | "view_redemptions"
        | "process_redemptions"
        | "manage_whitelist"
        | "manage_blacklist"
        | "view_reserves"
        | "manage_reserves"
        | "manage_market_maker"
        | "manage_admins"
        | "view_transaction_fees"
        | "view_audit_logs"
      app_role: "admin" | "user"
      bonus_status: "pending" | "completed" | "failed" | "insufficient_funds"
      bot_status: "active" | "paused" | "error"
      redemption_status:
        | "pending"
        | "burn_confirmed"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "draft"
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
      admin_permission: [
        "view_deposits",
        "approve_deposits",
        "view_redemptions",
        "process_redemptions",
        "manage_whitelist",
        "manage_blacklist",
        "view_reserves",
        "manage_reserves",
        "manage_market_maker",
        "manage_admins",
        "view_transaction_fees",
        "view_audit_logs",
      ],
      app_role: ["admin", "user"],
      bonus_status: ["pending", "completed", "failed", "insufficient_funds"],
      bot_status: ["active", "paused", "error"],
      redemption_status: [
        "pending",
        "burn_confirmed",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "draft",
      ],
    },
  },
} as const
