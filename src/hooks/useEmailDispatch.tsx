import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Json } from "@/integrations/supabase/types";

export type EmailDispatchType = 
  | 'pendencia_critica'
  | 'vencimento_certificado'
  | 'geracao_cobranca'
  | 'atualizacao_cadastro'
  | 'verificacao_dados'
  | 'notificacao_pad'
  | 'boas_vindas'
  | 'reset_senha'
  | 'generico';

export interface EmailDispatchParams {
  tipo: EmailDispatchType;
  destinatario: string;
  destinatario_nome?: string;
  assunto: string;
  template?: string;
  variaveis?: Record<string, string>;
  responsavel_id?: string;
  box_id?: string;
  referencia_tipo?: string;
  referencia_id?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  data?: any;
  error?: string;
  logged?: boolean;
}

interface EmailConfig {
  envio_ativo: boolean;
  email_remetente: string | null;
  nome_remetente: string | null;
}

// Get email configuration
async function getEmailConfig(): Promise<EmailConfig | null> {
  const { data, error } = await supabase
    .from('configuracoes_email')
    .select('envio_ativo, email_remetente, nome_remetente')
    .single();

  if (error || !data) {
    console.error('Error fetching email config:', error);
    return null;
  }

  return data;
}

// Log email dispatch
async function logEmailDispatch(
  params: EmailDispatchParams,
  status: 'enviado' | 'erro' | 'desativado',
  erro?: string,
  resposta_api?: any,
  userId?: string
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('email_logs')
      .insert({
        tipo: params.tipo,
        destinatario: params.destinatario,
        destinatario_nome: params.destinatario_nome || null,
        assunto: params.assunto,
        template: params.template || null,
        variaveis: (params.variaveis as Json) || null,
        status,
        erro: erro || null,
        resposta_api: (resposta_api as Json) || null,
        responsavel_id: params.responsavel_id || null,
        box_id: params.box_id || null,
        referencia_tipo: params.referencia_tipo || null,
        referencia_id: params.referencia_id || null,
        created_by: userId || null,
      });

    if (error) {
      console.error('Error logging email dispatch:', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Error logging email dispatch:', err);
    return false;
  }
}

export const useEmailDispatch = () => {
  const { user } = useAuth();

  // Core dispatch function with config check and logging
  const dispatch = async (params: EmailDispatchParams): Promise<EmailDispatchResult> => {
    try {
      // Check email configuration
      const config = await getEmailConfig();

      if (!config) {
        await logEmailDispatch(params, 'erro', 'Configuração de e-mail não encontrada', null, user?.id);
        return { success: false, error: 'Configuração de e-mail não encontrada', logged: true };
      }

      if (!config.envio_ativo) {
        await logEmailDispatch(params, 'desativado', 'Envio de e-mail desativado nas configurações', null, user?.id);
        return { success: false, error: 'Envio de e-mail desativado', logged: true };
      }

      // Send email via edge function
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.destinatario,
          subject: params.assunto,
          template: params.template || 'generic',
          variables: params.variaveis || {},
        },
      });

      if (error) {
        await logEmailDispatch(params, 'erro', error.message, null, user?.id);
        return { success: false, error: error.message, logged: true };
      }

      if (!data?.success) {
        await logEmailDispatch(params, 'erro', data?.error || 'Erro desconhecido', data, user?.id);
        return { success: false, error: data?.error || 'Erro ao enviar e-mail', logged: true };
      }

      await logEmailDispatch(params, 'enviado', undefined, data, user?.id);
      return { success: true, data: data.data, logged: true };

    } catch (err: any) {
      await logEmailDispatch(params, 'erro', err.message, null, user?.id);
      return { success: false, error: err.message, logged: true };
    }
  };

  // Specialized dispatch functions for each type

  // 1. Pendência Crítica
  const dispatchPendenciaCritica = async (params: {
    destinatario: string;
    destinatario_nome: string;
    tipo_pendencia: string;
    descricao: string;
    box_codigo?: string;
    prazo?: string;
    link: string;
    responsavel_id?: string;
    box_id?: string;
  }): Promise<EmailDispatchResult> => {
    return dispatch({
      tipo: 'pendencia_critica',
      destinatario: params.destinatario,
      destinatario_nome: params.destinatario_nome,
      assunto: `⚠️ Pendência Crítica: ${params.tipo_pendencia}`,
      template: 'generic',
      variaveis: {
        titulo: 'Pendência Crítica Identificada',
        assunto: `Pendência Crítica: ${params.tipo_pendencia}`,
        conteudo: `
          <p>Olá <strong>${params.destinatario_nome}</strong>,</p>
          <p>Foi identificada uma <span style="color: #dc2626; font-weight: bold;">pendência crítica</span> que requer sua atenção imediata:</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;"><strong>Tipo:</strong> ${params.tipo_pendencia}</p>
            <p style="margin: 0 0 10px 0;"><strong>Descrição:</strong> ${params.descricao}</p>
            ${params.box_codigo ? `<p style="margin: 0 0 10px 0;"><strong>Box:</strong> ${params.box_codigo}</p>` : ''}
            ${params.prazo ? `<p style="margin: 0;"><strong>Prazo:</strong> ${params.prazo}</p>` : ''}
          </div>
          
          <p>Por favor, acesse o sistema para mais detalhes e regularização:</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${params.link}" style="background: #dc2626; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Ver Pendência</a>
          </p>
        `,
      },
      responsavel_id: params.responsavel_id,
      box_id: params.box_id,
      referencia_tipo: 'pendencia',
    });
  };

  // 2. Vencimento de Certificado
  const dispatchVencimentoCertificado = async (params: {
    destinatario: string;
    destinatario_nome: string;
    documento_nome: string;
    data_vencimento: string;
    dias_restantes: number;
    box_codigo?: string;
    link: string;
    responsavel_id?: string;
    box_id?: string;
    documento_id?: string;
  }): Promise<EmailDispatchResult> => {
    const isVencido = params.dias_restantes <= 0;
    const urgencia = isVencido ? 'VENCIDO' : params.dias_restantes <= 7 ? 'URGENTE' : 'Aviso';
    const bgColor = isVencido ? '#fef2f2' : params.dias_restantes <= 7 ? '#fef3c7' : '#f0fdf4';
    const borderColor = isVencido ? '#dc2626' : params.dias_restantes <= 7 ? '#f59e0b' : '#22c55e';

    return dispatch({
      tipo: 'vencimento_certificado',
      destinatario: params.destinatario,
      destinatario_nome: params.destinatario_nome,
      assunto: `${urgencia}: Vencimento de ${params.documento_nome}`,
      template: 'expiration_alert',
      variaveis: {
        tipo: 'Certificado/Documento',
        documento: params.documento_nome,
        referencia: params.box_codigo || params.destinatario_nome,
        data_vencimento: params.data_vencimento,
        dias_restantes: isVencido ? 'Vencido' : `${params.dias_restantes} dias`,
        link: params.link,
      },
      responsavel_id: params.responsavel_id,
      box_id: params.box_id,
      referencia_tipo: 'documento',
      referencia_id: params.documento_id,
    });
  };

  // 3. Geração de Cobrança
  const dispatchGeracaoCobranca = async (params: {
    destinatario: string;
    destinatario_nome: string;
    box_codigo: string;
    mes_referencia: string;
    valor_total: number;
    valor_aluguel?: number;
    valor_condominio?: number;
    data_vencimento: string;
    link: string;
    responsavel_id?: string;
    box_id?: string;
  }): Promise<EmailDispatchResult> => {
    const formatCurrency = (value: number) => 
      new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

    return dispatch({
      tipo: 'geracao_cobranca',
      destinatario: params.destinatario,
      destinatario_nome: params.destinatario_nome,
      assunto: `Cobrança ${params.mes_referencia} - Box ${params.box_codigo}`,
      template: 'generic',
      variaveis: {
        titulo: 'Cobrança Mensal',
        assunto: `Cobrança ${params.mes_referencia}`,
        conteudo: `
          <p>Olá <strong>${params.destinatario_nome}</strong>,</p>
          <p>Segue a cobrança referente ao mês de <strong>${params.mes_referencia}</strong>:</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Box:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">${params.box_codigo}</td></tr>
              ${params.valor_aluguel ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">Aluguel:</td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">${formatCurrency(params.valor_aluguel)}</td></tr>` : ''}
              ${params.valor_condominio ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">Condomínio:</td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef; text-align: right;">${formatCurrency(params.valor_condominio)}</td></tr>` : ''}
              <tr><td style="padding: 12px 0; font-weight: bold; font-size: 1.1em;">TOTAL:</td><td style="padding: 12px 0; text-align: right; font-weight: bold; font-size: 1.1em; color: #059669;">${formatCurrency(params.valor_total)}</td></tr>
            </table>
          </div>
          
          <p><strong>Vencimento:</strong> ${params.data_vencimento}</p>
          
          <p style="text-align: center; margin: 20px 0;">
            <a href="${params.link}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Ver Detalhes</a>
          </p>
        `,
      },
      responsavel_id: params.responsavel_id,
      box_id: params.box_id,
      referencia_tipo: 'cobranca',
    });
  };

  // 4. Atualização de Dados Cadastrais
  const dispatchAtualizacaoCadastro = async (params: {
    destinatario: string;
    destinatario_nome: string;
    campos_alterados: string[];
    alterado_por?: string;
    link: string;
    responsavel_id?: string;
  }): Promise<EmailDispatchResult> => {
    return dispatch({
      tipo: 'atualizacao_cadastro',
      destinatario: params.destinatario,
      destinatario_nome: params.destinatario_nome,
      assunto: 'Atualização de Dados Cadastrais',
      template: 'generic',
      variaveis: {
        titulo: 'Dados Cadastrais Atualizados',
        assunto: 'Atualização de Dados Cadastrais',
        conteudo: `
          <p>Olá <strong>${params.destinatario_nome}</strong>,</p>
          <p>Seus dados cadastrais foram atualizados em nosso sistema.</p>
          
          <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 4px;">
            <p style="margin: 0 0 10px 0;"><strong>Campos alterados:</strong></p>
            <ul style="margin: 0; padding-left: 20px;">
              ${params.campos_alterados.map(c => `<li>${c}</li>`).join('')}
            </ul>
            ${params.alterado_por ? `<p style="margin: 10px 0 0 0; font-size: 0.9em; color: #666;">Alterado por: ${params.alterado_por}</p>` : ''}
          </div>
          
          <p>Se você não reconhece esta alteração, entre em contato conosco imediatamente:</p>
          <p style="text-align: center; margin: 20px 0;">
            <a href="${params.link}" style="background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">Ver Meus Dados</a>
          </p>
        `,
      },
      responsavel_id: params.responsavel_id,
      referencia_tipo: 'responsavel',
      referencia_id: params.responsavel_id,
    });
  };

  // 5. Solicitação de Verificação de Dados
  const dispatchVerificacaoDados = async (params: {
    destinatario: string;
    destinatario_nome: string;
    dados_cadastrais: {
      box?: string;
      setor?: string;
      telefone?: string;
      email?: string;
      data_nascimento?: string;
    };
    link_confirmar: string;
    link_corrigir: string;
    responsavel_id?: string;
    box_id?: string;
  }): Promise<EmailDispatchResult> => {
    const dados = params.dados_cadastrais;

    return dispatch({
      tipo: 'verificacao_dados',
      destinatario: params.destinatario,
      destinatario_nome: params.destinatario_nome,
      assunto: `Verificação de Dados Cadastrais - ${dados.box || 'Mercado Municipal'}`,
      template: 'generic',
      variaveis: {
        titulo: 'Verificação de Dados Cadastrais',
        assunto: 'Verificação de Dados Cadastrais',
        conteudo: `
          <p>Olá <strong>${params.destinatario_nome}</strong>,</p>
          <p>Solicitamos a verificação dos seus dados cadastrais em nosso sistema.</p>
          
          <div style="background: #f8f9fa; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Seus Dados Cadastrais</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Nome:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">${params.destinatario_nome}</td></tr>
              ${dados.box ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Box:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">${dados.box}</td></tr>` : ''}
              ${dados.setor ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Setor:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">${dados.setor}</td></tr>` : ''}
              ${dados.telefone ? `<tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>Telefone:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">${dados.telefone}</td></tr>` : ''}
              <tr><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;"><strong>E-mail:</strong></td><td style="padding: 8px 0; border-bottom: 1px solid #e9ecef;">${params.destinatario}</td></tr>
              ${dados.data_nascimento ? `<tr><td style="padding: 8px 0;"><strong>Data de Nascimento:</strong></td><td style="padding: 8px 0;">${dados.data_nascimento}</td></tr>` : ''}
            </table>
          </div>
          
          <p>Por favor, verifique se as informações acima estão corretas:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${params.link_confirmar}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-right: 10px;">✓ Confirmar Dados</a>
            <a href="${params.link_corrigir}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold;">✎ Solicitar Correção</a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            <em>Este link expira em 7 dias. Caso não reconheça esta solicitação, ignore este e-mail.</em>
          </p>
        `,
      },
      responsavel_id: params.responsavel_id,
      box_id: params.box_id,
      referencia_tipo: 'verificacao',
    });
  };

  // 6. Notificação/PAD
  const dispatchNotificacaoPAD = async (params: {
    destinatario: string;
    destinatario_nome: string;
    numero_notificacao: string;
    tipo_notificacao: string;
    descricao: string;
    artigo_violado: string;
    prazo_defesa?: string;
    box_codigo?: string;
    link: string;
    responsavel_id?: string;
    box_id?: string;
    notificacao_id?: string;
  }): Promise<EmailDispatchResult> => {
    return dispatch({
      tipo: 'notificacao_pad',
      destinatario: params.destinatario,
      destinatario_nome: params.destinatario_nome,
      assunto: `Notificação ${params.numero_notificacao} - ${params.tipo_notificacao}`,
      template: 'notification',
      variaveis: {
        titulo: `Notificação ${params.numero_notificacao}`,
        box: params.box_codigo || 'N/A',
        responsavel: params.destinatario_nome,
        mensagem: `
          <p><strong>Tipo:</strong> ${params.tipo_notificacao}</p>
          <p><strong>Descrição:</strong> ${params.descricao}</p>
          <p><strong>Artigo Violado:</strong> ${params.artigo_violado}</p>
        `,
        prazo: params.prazo_defesa || 'Consulte o documento',
        link: params.link,
      },
      responsavel_id: params.responsavel_id,
      box_id: params.box_id,
      referencia_tipo: 'notificacao',
      referencia_id: params.notificacao_id,
    });
  };

  return {
    dispatch,
    dispatchPendenciaCritica,
    dispatchVencimentoCertificado,
    dispatchGeracaoCobranca,
    dispatchAtualizacaoCadastro,
    dispatchVerificacaoDados,
    dispatchNotificacaoPAD,
  };
};
