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
      boxes: {
        Row: {
          area_m2: number | null
          atividades: string | null
          boxe: string
          codigo: string
          created_at: string
          id: string
          imagem_url: string | null
          inquilino: string | null
          setor: string | null
          status: Database["public"]["Enums"]["box_status"]
          updated_at: string
        }
        Insert: {
          area_m2?: number | null
          atividades?: string | null
          boxe: string
          codigo: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          inquilino?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["box_status"]
          updated_at?: string
        }
        Update: {
          area_m2?: number | null
          atividades?: string | null
          boxe?: string
          codigo?: string
          created_at?: string
          id?: string
          imagem_url?: string | null
          inquilino?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["box_status"]
          updated_at?: string
        }
        Relationships: []
      }
      inventory_entries: {
        Row: {
          created_at: string
          data: string
          embalagem: string | null
          id: string
          item_id: string
          qtd: number
        }
        Insert: {
          created_at?: string
          data?: string
          embalagem?: string | null
          id?: string
          item_id: string
          qtd: number
        }
        Update: {
          created_at?: string
          data?: string
          embalagem?: string | null
          id?: string
          item_id?: string
          qtd?: number
        }
        Relationships: [
          {
            foreignKeyName: "inventory_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_exits: {
        Row: {
          created_at: string
          data: string
          embalagem: string | null
          entregue_por: string | null
          id: string
          item_id: string
          qtd: number
          recebido_por: string | null
        }
        Insert: {
          created_at?: string
          data?: string
          embalagem?: string | null
          entregue_por?: string | null
          id?: string
          item_id: string
          qtd: number
          recebido_por?: string | null
        }
        Update: {
          created_at?: string
          data?: string
          embalagem?: string | null
          entregue_por?: string | null
          id?: string
          item_id?: string
          qtd?: number
          recebido_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_exits_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          created_at: string
          descricao: string
          embalagem: string | null
          id: string
          qtd_atual: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          embalagem?: string | null
          id?: string
          qtd_atual?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          embalagem?: string | null
          id?: string
          qtd_atual?: number | null
          updated_at?: string
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
      box_status:
        | "ASSINADO"
        | "DISPONIVEL"
        | "PROCESSO"
        | "CANCELADO"
        | "DESATIVADO"
        | "DEVOLVIDO"
        | "INTERDITADO"
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
      box_status: [
        "ASSINADO",
        "DISPONIVEL",
        "PROCESSO",
        "CANCELADO",
        "DESATIVADO",
        "DEVOLVIDO",
        "INTERDITADO",
      ],
    },
  },
} as const
