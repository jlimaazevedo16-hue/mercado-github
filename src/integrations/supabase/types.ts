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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      box_documents: {
        Row: {
          arquivo_url: string | null
          box_id: string
          created_at: string
          data_emissao: string | null
          data_validade: string | null
          descricao: string | null
          id: string
          nome: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          box_id: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          box_id?: string
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_documents_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      box_history: {
        Row: {
          box_id: string
          campo: string
          created_at: string
          id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          box_id: string
          campo: string
          created_at?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          box_id?: string
          campo?: string
          created_at?: string
          id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "box_history_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
      box_maintenances: {
        Row: {
          box_id: string
          created_at: string
          custo: number | null
          data_execucao: string | null
          data_solicitacao: string
          descricao: string | null
          id: string
          observacoes: string | null
          responsavel: string | null
          status: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          box_id: string
          created_at?: string
          custo?: number | null
          data_execucao?: string | null
          data_solicitacao?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          box_id?: string
          created_at?: string
          custo?: number | null
          data_execucao?: string | null
          data_solicitacao?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "box_maintenances_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
        ]
      }
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
          planta_height: number | null
          planta_width: number | null
          pos_x: number | null
          pos_y: number | null
          responsavel_id: string | null
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
          planta_height?: number | null
          planta_width?: number | null
          pos_x?: number | null
          pos_y?: number | null
          responsavel_id?: string | null
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
          planta_height?: number | null
          planta_width?: number | null
          pos_x?: number | null
          pos_y?: number | null
          responsavel_id?: string | null
          setor?: string | null
          status?: Database["public"]["Enums"]["box_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boxes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
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
          estoque_minimo: number | null
          id: string
          qtd_atual: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          embalagem?: string | null
          estoque_minimo?: number | null
          id?: string
          qtd_atual?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          embalagem?: string | null
          estoque_minimo?: number | null
          id?: string
          qtd_atual?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      moc_produtos: {
        Row: {
          created_at: string
          familia: string | null
          id: string
          nome_cientifico: string | null
          nome_popular: string
          segmento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          familia?: string | null
          id?: string
          nome_cientifico?: string | null
          nome_popular: string
          segmento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          familia?: string | null
          id?: string
          nome_cientifico?: string | null
          nome_popular?: string
          segmento?: string
          updated_at?: string
        }
        Relationships: []
      }
      moc_registros: {
        Row: {
          box_id: string | null
          created_at: string
          data_coleta: string
          destinacao: string
          estado_produto: string
          id: string
          observacoes: string | null
          origem_comunidade: string | null
          origem_municipio: string | null
          origem_rio: string | null
          produto_id: string
          quantidade_kg: number
          responsavel_id: string | null
          updated_at: string
        }
        Insert: {
          box_id?: string | null
          created_at?: string
          data_coleta?: string
          destinacao: string
          estado_produto: string
          id?: string
          observacoes?: string | null
          origem_comunidade?: string | null
          origem_municipio?: string | null
          origem_rio?: string | null
          produto_id: string
          quantidade_kg: number
          responsavel_id?: string | null
          updated_at?: string
        }
        Update: {
          box_id?: string | null
          created_at?: string
          data_coleta?: string
          destinacao?: string
          estado_produto?: string
          id?: string
          observacoes?: string | null
          origem_comunidade?: string | null
          origem_municipio?: string | null
          origem_rio?: string | null
          produto_id?: string
          quantidade_kg?: number
          responsavel_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "moc_registros_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moc_registros_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "moc_produtos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moc_registros_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      notificacoes: {
        Row: {
          artigo_violado: string
          box_id: string | null
          classificacao: Database["public"]["Enums"]["infraction_classification"]
          created_at: string
          data_notificacao: string
          descricao_infracao: string
          fiscal_id: string | null
          id: string
          numero_interno: string | null
          observacoes: string | null
          prazo_adequacao: string | null
          prazo_defesa: string | null
          responsavel_id: string | null
          status: string | null
          tipo: Database["public"]["Enums"]["notification_type"]
          updated_at: string
        }
        Insert: {
          artigo_violado: string
          box_id?: string | null
          classificacao: Database["public"]["Enums"]["infraction_classification"]
          created_at?: string
          data_notificacao?: string
          descricao_infracao: string
          fiscal_id?: string | null
          id?: string
          numero_interno?: string | null
          observacoes?: string | null
          prazo_adequacao?: string | null
          prazo_defesa?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Update: {
          artigo_violado?: string
          box_id?: string | null
          classificacao?: Database["public"]["Enums"]["infraction_classification"]
          created_at?: string
          data_notificacao?: string
          descricao_infracao?: string
          fiscal_id?: string | null
          id?: string
          numero_interno?: string | null
          observacoes?: string | null
          prazo_adequacao?: string | null
          prazo_defesa?: string | null
          responsavel_id?: string | null
          status?: string | null
          tipo?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notificacoes_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_sequence: {
        Row: {
          ano: number
          created_at: string
          id: string
          ultimo_numero: number
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          id?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          id?: string
          ultimo_numero?: number
          updated_at?: string
        }
        Relationships: []
      }
      pad_documents: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_upload: string | null
          descricao: string | null
          id: string
          nome: string
          pad_id: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          id?: string
          nome: string
          pad_id: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_upload?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          pad_id?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pad_documents_pad_id_fkey"
            columns: ["pad_id"]
            isOneToOne: false
            referencedRelation: "pads"
            referencedColumns: ["id"]
          },
        ]
      }
      pad_etapas: {
        Row: {
          created_at: string
          data_etapa: string
          descricao: string | null
          documento_url: string | null
          etapa: Database["public"]["Enums"]["pad_status"]
          id: string
          pad_id: string
          responsavel_etapa: string | null
        }
        Insert: {
          created_at?: string
          data_etapa?: string
          descricao?: string | null
          documento_url?: string | null
          etapa: Database["public"]["Enums"]["pad_status"]
          id?: string
          pad_id: string
          responsavel_etapa?: string | null
        }
        Update: {
          created_at?: string
          data_etapa?: string
          descricao?: string | null
          documento_url?: string | null
          etapa?: Database["public"]["Enums"]["pad_status"]
          id?: string
          pad_id?: string
          responsavel_etapa?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pad_etapas_pad_id_fkey"
            columns: ["pad_id"]
            isOneToOne: false
            referencedRelation: "pads"
            referencedColumns: ["id"]
          },
        ]
      }
      pads: {
        Row: {
          box_id: string | null
          created_at: string
          data_autuacao: string
          data_decisao_final: string | null
          data_defesa: string | null
          data_julgamento: string | null
          data_recurso: string | null
          decisao_final: string | null
          fundamentacao: string | null
          id: string
          notificacao_id: string
          numero_processo: string
          percentual_multa: number | null
          relator: string | null
          responsavel_id: string | null
          status: Database["public"]["Enums"]["pad_status"]
          taxa_condominio_base: number | null
          updated_at: string
          valor_multa: number | null
        }
        Insert: {
          box_id?: string | null
          created_at?: string
          data_autuacao?: string
          data_decisao_final?: string | null
          data_defesa?: string | null
          data_julgamento?: string | null
          data_recurso?: string | null
          decisao_final?: string | null
          fundamentacao?: string | null
          id?: string
          notificacao_id: string
          numero_processo: string
          percentual_multa?: number | null
          relator?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["pad_status"]
          taxa_condominio_base?: number | null
          updated_at?: string
          valor_multa?: number | null
        }
        Update: {
          box_id?: string | null
          created_at?: string
          data_autuacao?: string
          data_decisao_final?: string | null
          data_defesa?: string | null
          data_julgamento?: string | null
          data_recurso?: string | null
          decisao_final?: string | null
          fundamentacao?: string | null
          id?: string
          notificacao_id?: string
          numero_processo?: string
          percentual_multa?: number | null
          relator?: string | null
          responsavel_id?: string | null
          status?: Database["public"]["Enums"]["pad_status"]
          taxa_condominio_base?: number | null
          updated_at?: string
          valor_multa?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pads_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pads_notificacao_id_fkey"
            columns: ["notificacao_id"]
            isOneToOne: false
            referencedRelation: "notificacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pads_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ativo: boolean | null
          created_at: string
          email: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          email: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      responsaveis: {
        Row: {
          cep: string | null
          cidade: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          imagem_url: string | null
          nome: string
          observacoes: string | null
          rg: string | null
          status: string | null
          telefone: string | null
          telefone_secundario: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          imagem_url?: string | null
          nome: string
          observacoes?: string | null
          rg?: string | null
          status?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          imagem_url?: string | null
          nome?: string
          observacoes?: string | null
          rg?: string | null
          status?: string | null
          telefone?: string | null
          telefone_secundario?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      responsavel_documents: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_emissao: string | null
          data_validade: string | null
          descricao: string | null
          id: string
          nome: string
          responsavel_id: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
          nome: string
          responsavel_id: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_emissao?: string | null
          data_validade?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          responsavel_id?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "responsavel_documents_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      responsavel_history: {
        Row: {
          campo: string
          created_at: string
          id: string
          responsavel_id: string
          usuario_id: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          created_at?: string
          id?: string
          responsavel_id: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          created_at?: string
          id?: string
          responsavel_id?: string
          usuario_id?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "responsavel_history_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string
          id: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          permission_key: string
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string
          id?: string
          permission_key?: string
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
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
      generate_notification_number: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_permission: {
        Args: { _action?: string; _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "administrador" | "fiscal" | "funcionario"
      box_status:
        | "ASSINADO"
        | "DISPONIVEL"
        | "PROCESSO"
        | "CANCELADO"
        | "DESATIVADO"
        | "DEVOLVIDO"
        | "INTERDITADO"
      infraction_classification: "leve" | "media" | "grave" | "gravissima"
      notification_type: "interna" | "externa"
      pad_status:
        | "autuacao"
        | "defesa"
        | "julgamento"
        | "recurso"
        | "decisao_final"
        | "arquivado"
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
      app_role: ["administrador", "fiscal", "funcionario"],
      box_status: [
        "ASSINADO",
        "DISPONIVEL",
        "PROCESSO",
        "CANCELADO",
        "DESATIVADO",
        "DEVOLVIDO",
        "INTERDITADO",
      ],
      infraction_classification: ["leve", "media", "grave", "gravissima"],
      notification_type: ["interna", "externa"],
      pad_status: [
        "autuacao",
        "defesa",
        "julgamento",
        "recurso",
        "decisao_final",
        "arquivado",
      ],
    },
  },
} as const
