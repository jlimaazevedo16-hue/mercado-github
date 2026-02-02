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
      assistant_logs: {
        Row: {
          created_at: string
          duracao_ms: number | null
          id: string
          metadata: Json | null
          pergunta: string
          resposta: string | null
          tipo_consulta: string
          tokens_usados: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          duracao_ms?: number | null
          id?: string
          metadata?: Json | null
          pergunta: string
          resposta?: string | null
          tipo_consulta: string
          tokens_usados?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          duracao_ms?: number | null
          id?: string
          metadata?: Json | null
          pergunta?: string
          resposta?: string | null
          tipo_consulta?: string
          tokens_usados?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
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
          segmento_id: string | null
          setor: string | null
          setor_id: string | null
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
          segmento_id?: string | null
          setor?: string | null
          setor_id?: string | null
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
          segmento_id?: string | null
          setor?: string | null
          setor_id?: string | null
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
          {
            foreignKeyName: "boxes_segmento_id_fkey"
            columns: ["segmento_id"]
            isOneToOne: false
            referencedRelation: "segmentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boxes_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
            referencedColumns: ["id"]
          },
        ]
      }
      configuracoes_administrativas: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          unidade: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          unidade?: string | null
          updated_at?: string
          valor: number
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          unidade?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
      configuracoes_email: {
        Row: {
          created_at: string
          email_remetente: string | null
          envio_ativo: boolean | null
          id: string
          nome_remetente: string | null
          template_alerta: string | null
          template_financeiro: string | null
          template_institucional: string | null
          template_verificacao: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_remetente?: string | null
          envio_ativo?: boolean | null
          id?: string
          nome_remetente?: string | null
          template_alerta?: string | null
          template_financeiro?: string | null
          template_institucional?: string | null
          template_verificacao?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_remetente?: string | null
          envio_ativo?: boolean | null
          id?: string
          nome_remetente?: string | null
          template_alerta?: string | null
          template_financeiro?: string | null
          template_institucional?: string | null
          template_verificacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      configuracoes_integracoes: {
        Row: {
          config_encrypted: string | null
          config_public: Json | null
          created_at: string
          id: string
          integracao: string
          mensagem_erro: string | null
          obrigatoria: boolean
          ordem: number
          status: Database["public"]["Enums"]["integration_status"]
          ultima_verificacao: string | null
          updated_at: string
        }
        Insert: {
          config_encrypted?: string | null
          config_public?: Json | null
          created_at?: string
          id?: string
          integracao: string
          mensagem_erro?: string | null
          obrigatoria?: boolean
          ordem?: number
          status?: Database["public"]["Enums"]["integration_status"]
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Update: {
          config_encrypted?: string | null
          config_public?: Json | null
          created_at?: string
          id?: string
          integracao?: string
          mensagem_erro?: string | null
          obrigatoria?: boolean
          ordem?: number
          status?: Database["public"]["Enums"]["integration_status"]
          ultima_verificacao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          assunto: string
          box_id: string | null
          created_at: string
          created_by: string | null
          destinatario: string
          destinatario_nome: string | null
          erro: string | null
          id: string
          referencia_id: string | null
          referencia_tipo: string | null
          responsavel_id: string | null
          resposta_api: Json | null
          status: string
          template: string | null
          tipo: string
          variaveis: Json | null
        }
        Insert: {
          assunto: string
          box_id?: string | null
          created_at?: string
          created_by?: string | null
          destinatario: string
          destinatario_nome?: string | null
          erro?: string | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          responsavel_id?: string | null
          resposta_api?: Json | null
          status?: string
          template?: string | null
          tipo: string
          variaveis?: Json | null
        }
        Update: {
          assunto?: string
          box_id?: string | null
          created_at?: string
          created_by?: string | null
          destinatario?: string
          destinatario_nome?: string | null
          erro?: string | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          responsavel_id?: string | null
          resposta_api?: Json | null
          status?: string
          template?: string | null
          tipo?: string
          variaveis?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          assunto: string
          ativo: boolean | null
          categoria: string
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          slug: string
          updated_at: string
          variaveis: string[] | null
        }
        Insert: {
          assunto: string
          ativo?: boolean | null
          categoria?: string
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          slug: string
          updated_at?: string
          variaveis?: string[] | null
        }
        Update: {
          assunto?: string
          ativo?: boolean | null
          categoria?: string
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          slug?: string
          updated_at?: string
          variaveis?: string[] | null
        }
        Relationships: []
      }
      export_logs: {
        Row: {
          created_at: string
          filtros_aplicados: Json | null
          formato: string
          id: string
          modulo: string
          tipo_relatorio: string
          total_registros: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          filtros_aplicados?: Json | null
          formato: string
          id?: string
          modulo: string
          tipo_relatorio: string
          total_registros?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          filtros_aplicados?: Json | null
          formato?: string
          id?: string
          modulo?: string
          tipo_relatorio?: string
          total_registros?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
      extracoes_mensais: {
        Row: {
          arquivo_url: string | null
          created_at: string
          data_geracao: string
          gerado_por: string | null
          id: string
          mes_referencia: string
          total_boxes: number | null
          valor_total_aluguel: number | null
          valor_total_condominio: number | null
          valor_total_multas: number | null
        }
        Insert: {
          arquivo_url?: string | null
          created_at?: string
          data_geracao?: string
          gerado_por?: string | null
          id?: string
          mes_referencia: string
          total_boxes?: number | null
          valor_total_aluguel?: number | null
          valor_total_condominio?: number | null
          valor_total_multas?: number | null
        }
        Update: {
          arquivo_url?: string | null
          created_at?: string
          data_geracao?: string
          gerado_por?: string | null
          id?: string
          mes_referencia?: string
          total_boxes?: number | null
          valor_total_aluguel?: number | null
          valor_total_condominio?: number | null
          valor_total_multas?: number | null
        }
        Relationships: []
      }
      import_logs: {
        Row: {
          created_at: string
          detalhes_erros: Json | null
          duracao_segundos: number | null
          id: string
          linhas_erro: number | null
          linhas_importadas: number | null
          nome_arquivo: string
          status: string | null
          tipo_importacao: string
          total_linhas: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detalhes_erros?: Json | null
          duracao_segundos?: number | null
          id?: string
          linhas_erro?: number | null
          linhas_importadas?: number | null
          nome_arquivo: string
          status?: string | null
          tipo_importacao: string
          total_linhas?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detalhes_erros?: Json | null
          duracao_segundos?: number | null
          id?: string
          linhas_erro?: number | null
          linhas_importadas?: number | null
          nome_arquivo?: string
          status?: string | null
          tipo_importacao?: string
          total_linhas?: number | null
          user_id?: string | null
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
      logs_receitas_operacionais: {
        Row: {
          acao: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          data_hora: string
          id: string
          receita_operacional_id: string
          usuario_id: string | null
        }
        Insert: {
          acao: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_hora?: string
          id?: string
          receita_operacional_id: string
          usuario_id?: string | null
        }
        Update: {
          acao?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          data_hora?: string
          id?: string
          receita_operacional_id?: string
          usuario_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "logs_receitas_operacionais_receita_operacional_id_fkey"
            columns: ["receita_operacional_id"]
            isOneToOne: false
            referencedRelation: "receitas_operacionais"
            referencedColumns: ["id"]
          },
        ]
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
          numero_auto_externo: string | null
          numero_interno: string | null
          observacoes: string | null
          orgao_fiscalizador: string | null
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
          numero_auto_externo?: string | null
          numero_interno?: string | null
          observacoes?: string | null
          orgao_fiscalizador?: string | null
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
          numero_auto_externo?: string | null
          numero_interno?: string | null
          observacoes?: string | null
          orgao_fiscalizador?: string | null
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
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string
          foto_url: string | null
          id: string
          nome: string
          sobrenome: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email: string
          foto_url?: string | null
          id?: string
          nome: string
          sobrenome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ativo?: boolean | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string
          foto_url?: string | null
          id?: string
          nome?: string
          sobrenome?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      receitas_operacionais: {
        Row: {
          bloqueado: boolean
          comprovante_url: string | null
          created_at: string
          data_fechamento: string | null
          data_referencia: string
          descricao: string | null
          forma_pagamento: string
          id: string
          observacoes: string | null
          origem_caixa: string | null
          responsavel_lancamento: string | null
          tipo_receita_id: string
          updated_at: string
          valor_bruto: number
        }
        Insert: {
          bloqueado?: boolean
          comprovante_url?: string | null
          created_at?: string
          data_fechamento?: string | null
          data_referencia?: string
          descricao?: string | null
          forma_pagamento: string
          id?: string
          observacoes?: string | null
          origem_caixa?: string | null
          responsavel_lancamento?: string | null
          tipo_receita_id: string
          updated_at?: string
          valor_bruto: number
        }
        Update: {
          bloqueado?: boolean
          comprovante_url?: string | null
          created_at?: string
          data_fechamento?: string | null
          data_referencia?: string
          descricao?: string | null
          forma_pagamento?: string
          id?: string
          observacoes?: string | null
          origem_caixa?: string | null
          responsavel_lancamento?: string | null
          tipo_receita_id?: string
          updated_at?: string
          valor_bruto?: number
        }
        Relationships: [
          {
            foreignKeyName: "receitas_operacionais_tipo_receita_id_fkey"
            columns: ["tipo_receita_id"]
            isOneToOne: false
            referencedRelation: "tipos_receita"
            referencedColumns: ["id"]
          },
        ]
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
          verificacao_data: string | null
          verificacao_status: string | null
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
          verificacao_data?: string | null
          verificacao_status?: string | null
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
          verificacao_data?: string | null
          verificacao_status?: string | null
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
      reuniao_presencas: {
        Row: {
          box_id: string | null
          created_at: string
          hora_chegada: string | null
          id: string
          observacoes: string | null
          presente: boolean | null
          responsavel_id: string
          reuniao_id: string
        }
        Insert: {
          box_id?: string | null
          created_at?: string
          hora_chegada?: string | null
          id?: string
          observacoes?: string | null
          presente?: boolean | null
          responsavel_id: string
          reuniao_id: string
        }
        Update: {
          box_id?: string | null
          created_at?: string
          hora_chegada?: string | null
          id?: string
          observacoes?: string | null
          presente?: boolean | null
          responsavel_id?: string
          reuniao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reuniao_presencas_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reuniao_presencas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reuniao_presencas_reuniao_id_fkey"
            columns: ["reuniao_id"]
            isOneToOne: false
            referencedRelation: "reunioes"
            referencedColumns: ["id"]
          },
        ]
      }
      reunioes: {
        Row: {
          ata: string | null
          created_at: string
          data_evento: string
          hora_fim: string | null
          hora_inicio: string | null
          id: string
          local: string | null
          pauta: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ata?: string | null
          created_at?: string
          data_evento?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local?: string | null
          pauta?: string | null
          status?: string | null
          tipo: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ata?: string | null
          created_at?: string
          data_evento?: string
          hora_fim?: string | null
          hora_inicio?: string | null
          id?: string
          local?: string | null
          pauta?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
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
      segmentos: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      setores: {
        Row: {
          created_at: string
          id: string
          mercado: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mercado?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mercado?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      sistema_setup: {
        Row: {
          concluido_por: string | null
          created_at: string
          data_conclusao: string | null
          id: string
          setup_concluido: boolean
          updated_at: string
          versao_schema: string | null
        }
        Insert: {
          concluido_por?: string | null
          created_at?: string
          data_conclusao?: string | null
          id?: string
          setup_concluido?: boolean
          updated_at?: string
          versao_schema?: string | null
        }
        Update: {
          concluido_por?: string | null
          created_at?: string
          data_conclusao?: string | null
          id?: string
          setup_concluido?: boolean
          updated_at?: string
          versao_schema?: string | null
        }
        Relationships: []
      }
      system_backups: {
        Row: {
          arquivo_url: string | null
          completed_at: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          id: string
          nome: string
          status: string | null
          tabelas_incluidas: string[] | null
          tamanho_bytes: number | null
          total_registros: number | null
        }
        Insert: {
          arquivo_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome: string
          status?: string | null
          tabelas_incluidas?: string[] | null
          tamanho_bytes?: number | null
          total_registros?: number | null
        }
        Update: {
          arquivo_url?: string | null
          completed_at?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          status?: string | null
          tabelas_incluidas?: string[] | null
          tamanho_bytes?: number | null
          total_registros?: number | null
        }
        Relationships: []
      }
      teste_conexao_supabase: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
        }
        Relationships: []
      }
      tipos_receita: {
        Row: {
          ativo: boolean
          categoria: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          ativo?: boolean
          categoria?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      ufms_historico: {
        Row: {
          created_at: string
          created_by: string | null
          data_fim_vigencia: string | null
          data_inicio_vigencia: string
          fator_aluguel: number
          fator_condominio: number
          id: string
          ufms_valor: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          fator_aluguel: number
          fator_condominio: number
          id?: string
          ufms_valor: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fim_vigencia?: string | null
          data_inicio_vigencia?: string
          fator_aluguel?: number
          fator_condominio?: number
          id?: string
          ufms_valor?: number
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          can_edit: boolean | null
          can_view: boolean | null
          created_at: string | null
          id: string
          permission_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          permission_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          can_edit?: boolean | null
          can_view?: boolean | null
          created_at?: string | null
          id?: string
          permission_key?: string
          updated_at?: string | null
          user_id?: string
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
      verificacao_historico: {
        Row: {
          acao: string
          created_at: string
          created_by: string | null
          detalhes: Json | null
          id: string
          ip_address: string | null
          responsavel_id: string
          user_agent: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          created_by?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          responsavel_id: string
          user_agent?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          created_by?: string | null
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          responsavel_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verificacao_historico_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      verificacao_tokens: {
        Row: {
          created_at: string
          created_by: string | null
          expires_at: string
          id: string
          ip_address: string | null
          responsavel_id: string
          tipo: string
          token: string
          usado: boolean | null
          usado_em: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          expires_at: string
          id?: string
          ip_address?: string | null
          responsavel_id: string
          tipo: string
          token: string
          usado?: boolean | null
          usado_em?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          expires_at?: string
          id?: string
          ip_address?: string | null
          responsavel_id?: string
          tipo?: string
          token?: string
          usado?: boolean | null
          usado_em?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "verificacao_tokens_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_automacoes: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          created_by: string | null
          gatilho_tipo: string
          gatilho_valor: string
          id: string
          nome: string
          respeitar_horario: boolean | null
          resposta_customizada: string | null
          template_id: string | null
          uma_vez_por_conversa: boolean | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          gatilho_tipo: string
          gatilho_valor: string
          id?: string
          nome: string
          respeitar_horario?: boolean | null
          resposta_customizada?: string | null
          template_id?: string | null
          uma_vez_por_conversa?: boolean | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          created_by?: string | null
          gatilho_tipo?: string
          gatilho_valor?: string
          id?: string
          nome?: string
          respeitar_horario?: boolean | null
          resposta_customizada?: string | null
          template_id?: string | null
          uma_vez_por_conversa?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_automacoes_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_config: {
        Row: {
          created_at: string
          espera_entre_lotes_minutos: number
          hora_fim_envio: string | null
          hora_inicio_envio: string | null
          id: string
          intervalo_max_segundos: number
          intervalo_min_segundos: number
          max_mensagens_lote: number
          max_tentativas: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          espera_entre_lotes_minutos?: number
          hora_fim_envio?: string | null
          hora_inicio_envio?: string | null
          id?: string
          intervalo_max_segundos?: number
          intervalo_min_segundos?: number
          max_mensagens_lote?: number
          max_tentativas?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          espera_entre_lotes_minutos?: number
          hora_fim_envio?: string | null
          hora_inicio_envio?: string | null
          id?: string
          intervalo_max_segundos?: number
          intervalo_min_segundos?: number
          max_mensagens_lote?: number
          max_tentativas?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_conversas: {
        Row: {
          automacao_id: string | null
          created_at: string | null
          id: string
          instance_id: string | null
          telefone: string
          ultima_mensagem_recebida: string | null
          ultima_resposta_automatica: string | null
        }
        Insert: {
          automacao_id?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          telefone: string
          ultima_mensagem_recebida?: string | null
          ultima_resposta_automatica?: string | null
        }
        Update: {
          automacao_id?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          telefone?: string
          ultima_mensagem_recebida?: string | null
          ultima_resposta_automatica?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversas_automacao_id_fkey"
            columns: ["automacao_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_automacoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversas_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_instances: {
        Row: {
          api_key: string
          api_url: string
          created_at: string
          created_by: string | null
          id: string
          instance_name: string
          nome: string
          phone_number: string | null
          qr_code: string | null
          status: string
          updated_at: string
        }
        Insert: {
          api_key: string
          api_url: string
          created_at?: string
          created_by?: string | null
          id?: string
          instance_name: string
          nome: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          api_key?: string
          api_url?: string
          created_at?: string
          created_by?: string | null
          id?: string
          instance_name?: string
          nome?: string
          phone_number?: string | null
          qr_code?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      whatsapp_logs: {
        Row: {
          conteudo: string
          created_at: string
          destinatario_nome: string | null
          destinatario_telefone: string
          entregue_em: string | null
          enviado_por: string | null
          falha_em: string | null
          id: string
          instance_id: string | null
          lido_em: string | null
          message_id: string | null
          queue_id: string | null
          resposta_api: Json | null
          status: string
          status_entrega: string | null
          template_id: string | null
        }
        Insert: {
          conteudo: string
          created_at?: string
          destinatario_nome?: string | null
          destinatario_telefone: string
          entregue_em?: string | null
          enviado_por?: string | null
          falha_em?: string | null
          id?: string
          instance_id?: string | null
          lido_em?: string | null
          message_id?: string | null
          queue_id?: string | null
          resposta_api?: Json | null
          status: string
          status_entrega?: string | null
          template_id?: string | null
        }
        Update: {
          conteudo?: string
          created_at?: string
          destinatario_nome?: string | null
          destinatario_telefone?: string
          entregue_em?: string | null
          enviado_por?: string | null
          falha_em?: string | null
          id?: string
          instance_id?: string | null
          lido_em?: string | null
          message_id?: string | null
          queue_id?: string | null
          resposta_api?: Json | null
          status?: string
          status_entrega?: string | null
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_logs_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_queue: {
        Row: {
          agendado_para: string | null
          box_id: string | null
          conteudo: string
          created_at: string
          created_by: string | null
          destinatario_nome: string | null
          destinatario_telefone: string
          erro_mensagem: string | null
          id: string
          instance_id: string | null
          responsavel_id: string | null
          status: string
          template_id: string | null
          tentativas: number
          updated_at: string
        }
        Insert: {
          agendado_para?: string | null
          box_id?: string | null
          conteudo: string
          created_at?: string
          created_by?: string | null
          destinatario_nome?: string | null
          destinatario_telefone: string
          erro_mensagem?: string | null
          id?: string
          instance_id?: string | null
          responsavel_id?: string | null
          status?: string
          template_id?: string | null
          tentativas?: number
          updated_at?: string
        }
        Update: {
          agendado_para?: string | null
          box_id?: string | null
          conteudo?: string
          created_at?: string
          created_by?: string | null
          destinatario_nome?: string | null
          destinatario_telefone?: string
          erro_mensagem?: string | null
          id?: string
          instance_id?: string | null
          responsavel_id?: string | null
          status?: string
          template_id?: string | null
          tentativas?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_queue_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_queue_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_queue_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_queue_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_recebidas: {
        Row: {
          box_id: string | null
          created_at: string | null
          id: string
          instance_id: string | null
          lida: boolean | null
          mensagem: string
          message_id: string | null
          nome_contato: string | null
          recebida_em: string | null
          respondida: boolean | null
          responsavel_id: string | null
          telefone_origem: string
          tipo: string | null
        }
        Insert: {
          box_id?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          lida?: boolean | null
          mensagem: string
          message_id?: string | null
          nome_contato?: string | null
          recebida_em?: string | null
          respondida?: boolean | null
          responsavel_id?: string | null
          telefone_origem: string
          tipo?: string | null
        }
        Update: {
          box_id?: string | null
          created_at?: string | null
          id?: string
          instance_id?: string | null
          lida?: boolean | null
          mensagem?: string
          message_id?: string | null
          nome_contato?: string | null
          recebida_em?: string | null
          respondida?: boolean | null
          responsavel_id?: string | null
          telefone_origem?: string
          tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_recebidas_box_id_fkey"
            columns: ["box_id"]
            isOneToOne: false
            referencedRelation: "boxes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_recebidas_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_recebidas_responsavel_id_fkey"
            columns: ["responsavel_id"]
            isOneToOne: false
            referencedRelation: "responsaveis"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          ativo: boolean
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
          variaveis: string[] | null
        }
        Insert: {
          ativo?: boolean
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          tipo: string
          updated_at?: string
          variaveis?: string[] | null
        }
        Update: {
          ativo?: boolean
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
          variaveis?: string[] | null
        }
        Relationships: []
      }
      whatsapp_webhooks: {
        Row: {
          created_at: string | null
          erro: string | null
          evento: string
          id: string
          instance_id: string | null
          payload: Json
          processado: boolean | null
        }
        Insert: {
          created_at?: string | null
          erro?: string | null
          evento: string
          id?: string
          instance_id?: string | null
          payload: Json
          processado?: boolean | null
        }
        Update: {
          created_at?: string | null
          erro?: string | null
          evento?: string
          id?: string
          instance_id?: string | null
          payload?: Json
          processado?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_webhooks_instance_id_fkey"
            columns: ["instance_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_instances"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      generate_notification_number: { Args: never; Returns: string }
      get_user_permission: {
        Args: { _action?: string; _permission_key: string; _user_id: string }
        Returns: boolean
      }
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
      is_admin_master: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "administrador"
        | "fiscal"
        | "funcionario"
        | "administrador_master"
        | "lojista"
      box_status:
        | "ASSINADO"
        | "DISPONIVEL"
        | "PROCESSO"
        | "CANCELADO"
        | "DESATIVADO"
        | "DEVOLVIDO"
        | "INTERDITADO"
      infraction_classification: "leve" | "media" | "grave" | "gravissima"
      integration_status: "not_configured" | "testing" | "configured" | "error"
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
      app_role: [
        "administrador",
        "fiscal",
        "funcionario",
        "administrador_master",
        "lojista",
      ],
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
      integration_status: ["not_configured", "testing", "configured", "error"],
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
