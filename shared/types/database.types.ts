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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          is_active: boolean
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          is_active?: boolean
          organization_id: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_users_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_settings: {
        Row: {
          config: Json
          created_at: string
          enabled: boolean
          id: string
          organization_id: string
          provider: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id: string
          provider: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          enabled?: boolean
          id?: string
          organization_id?: string
          provider?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "integration_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_branding: {
        Row: {
          accent_color: string | null
          created_at: string
          default_locale: Database["public"]["Enums"]["locale_code"]
          favicon_path: string | null
          footer_note_ar: string | null
          footer_note_en: string | null
          logo_dark_path: string | null
          logo_path: string | null
          og_image_path: string | null
          organization_id: string
          primary_color: string | null
          primary_foreground_color: string | null
          updated_at: string
        }
        Insert: {
          accent_color?: string | null
          created_at?: string
          default_locale?: Database["public"]["Enums"]["locale_code"]
          favicon_path?: string | null
          footer_note_ar?: string | null
          footer_note_en?: string | null
          logo_dark_path?: string | null
          logo_path?: string | null
          og_image_path?: string | null
          organization_id: string
          primary_color?: string | null
          primary_foreground_color?: string | null
          updated_at?: string
        }
        Update: {
          accent_color?: string | null
          created_at?: string
          default_locale?: Database["public"]["Enums"]["locale_code"]
          favicon_path?: string | null
          footer_note_ar?: string | null
          footer_note_en?: string | null
          logo_dark_path?: string | null
          logo_path?: string | null
          og_image_path?: string | null
          organization_id?: string
          primary_color?: string | null
          primary_foreground_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_branding_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          address_ar: string | null
          address_en: string | null
          created_at: string
          email: string | null
          id: string
          logo_path: string | null
          name_ar: string
          name_en: string
          phone: string | null
          slug: string
          tagline_ar: string | null
          tagline_en: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          address_ar?: string | null
          address_en?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_path?: string | null
          name_ar: string
          name_en: string
          phone?: string | null
          slug: string
          tagline_ar?: string | null
          tagline_en?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          address_ar?: string | null
          address_en?: string | null
          created_at?: string
          email?: string | null
          id?: string
          logo_path?: string | null
          name_ar?: string
          name_en?: string
          phone?: string | null
          slug?: string
          tagline_ar?: string | null
          tagline_en?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      profile_links: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          label_ar: string | null
          label_en: string | null
          profile_id: string
          sort_order: number
          type: Database["public"]["Enums"]["profile_link_type"]
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          label_ar?: string | null
          label_en?: string | null
          profile_id: string
          sort_order?: number
          type: Database["public"]["Enums"]["profile_link_type"]
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          label_ar?: string | null
          label_en?: string | null
          profile_id?: string
          sort_order?: number
          type?: Database["public"]["Enums"]["profile_link_type"]
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio_ar: string | null
          bio_en: string | null
          created_at: string
          created_by: string | null
          department_ar: string | null
          department_en: string | null
          email: string | null
          id: string
          job_title_ar: string | null
          job_title_en: string | null
          linkedin_url: string | null
          location_ar: string | null
          location_en: string | null
          name_ar: string
          name_en: string
          organization_id: string
          phone: string | null
          photo_path: string | null
          profile_type: Database["public"]["Enums"]["profile_type"]
          published_at: string | null
          slug: string
          status: Database["public"]["Enums"]["profile_status"]
          updated_at: string
          updated_by: string | null
          website_url: string | null
          whatsapp: string | null
        }
        Insert: {
          bio_ar?: string | null
          bio_en?: string | null
          created_at?: string
          created_by?: string | null
          department_ar?: string | null
          department_en?: string | null
          email?: string | null
          id?: string
          job_title_ar?: string | null
          job_title_en?: string | null
          linkedin_url?: string | null
          location_ar?: string | null
          location_en?: string | null
          name_ar: string
          name_en: string
          organization_id: string
          phone?: string | null
          photo_path?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          published_at?: string | null
          slug: string
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          whatsapp?: string | null
        }
        Update: {
          bio_ar?: string | null
          bio_en?: string | null
          created_at?: string
          created_by?: string | null
          department_ar?: string | null
          department_en?: string | null
          email?: string | null
          id?: string
          job_title_ar?: string | null
          job_title_en?: string | null
          linkedin_url?: string | null
          location_ar?: string | null
          location_en?: string | null
          name_ar?: string
          name_en?: string
          organization_id?: string
          phone?: string | null
          photo_path?: string | null
          profile_type?: Database["public"]["Enums"]["profile_type"]
          published_at?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["profile_status"]
          updated_at?: string
          updated_by?: string | null
          website_url?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_passes: {
        Row: {
          created_at: string
          external_id: string | null
          id: string
          last_error: string | null
          last_generated_at: string | null
          profile_id: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          status: Database["public"]["Enums"]["wallet_pass_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_error?: string | null
          last_generated_at?: string | null
          profile_id: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          status?: Database["public"]["Enums"]["wallet_pass_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_id?: string | null
          id?: string
          last_error?: string | null
          last_generated_at?: string | null
          profile_id?: string
          provider?: Database["public"]["Enums"]["wallet_provider"]
          status?: Database["public"]["Enums"]["wallet_pass_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_passes_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_organization: {
        Args: { target_organization_id: string }
        Returns: boolean
      }
      current_admin_role: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      current_organization_id: { Args: never; Returns: string }
      is_active_admin: { Args: never; Returns: boolean }
      is_safe_link: { Args: { value: string }; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      is_valid_e164: { Args: { value: string }; Returns: boolean }
      is_valid_email: { Args: { value: string }; Returns: boolean }
      is_valid_hex_color: { Args: { value: string }; Returns: boolean }
      is_valid_slug: { Args: { value: string }; Returns: boolean }
      is_valid_storage_path: { Args: { value: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "super_admin"
      locale_code: "en" | "ar"
      profile_link_type:
        | "website"
        | "linkedin"
        | "x"
        | "instagram"
        | "facebook"
        | "youtube"
        | "whatsapp"
        | "telegram"
        | "email"
        | "phone"
        | "location"
        | "custom"
      profile_status: "draft" | "published" | "inactive"
      profile_type: "individual" | "company"
      wallet_pass_status: "pending" | "active" | "revoked" | "failed"
      wallet_provider: "apple" | "google"
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
      app_role: ["admin", "super_admin"],
      locale_code: ["en", "ar"],
      profile_link_type: [
        "website",
        "linkedin",
        "x",
        "instagram",
        "facebook",
        "youtube",
        "whatsapp",
        "telegram",
        "email",
        "phone",
        "location",
        "custom",
      ],
      profile_status: ["draft", "published", "inactive"],
      profile_type: ["individual", "company"],
      wallet_pass_status: ["pending", "active", "revoked", "failed"],
      wallet_provider: ["apple", "google"],
    },
  },
} as const
