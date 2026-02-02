import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLojistaResponsavel } from "./useLojistaResponsavel";
import { isBefore, addDays } from "date-fns";

interface Pendencia {
  id: string;
  tipo: 'notificacao' | 'documento_vencido' | 'documento_vencendo' | 'pad';
  titulo: string;
  descricao: string;
  urgencia: 'alta' | 'media' | 'baixa';
  data?: string;
  link?: string;
}

interface PendenciasResult {
  pendencias: Pendencia[];
  totalNotificacoes: number;
  totalDocumentosVencidos: number;
  totalDocumentosVencendo: number;
  totalPAD: number;
  total: number;
  isLoading: boolean;
}

/**
 * Hook para buscar pendências do lojista (notificações, documentos vencidos, PADs)
 */
export const useLojistaPendencias = (): PendenciasResult => {
  const { responsavelId, isLojista } = useLojistaResponsavel();

  // Buscar boxes vinculados ao responsável
  const { data: boxes } = useQuery({
    queryKey: ["lojista-boxes", responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];
      const { data, error } = await supabase
        .from("boxes")
        .select("id, codigo, boxe")
        .eq("responsavel_id", responsavelId);
      if (error) throw error;
      return data || [];
    },
    enabled: isLojista && !!responsavelId,
  });

  const boxIds = boxes?.map(b => b.id) || [];

  // Buscar notificações ativas
  const { data: notificacoes, isLoading: notificacoesLoading } = useQuery({
    queryKey: ["lojista-notificacoes", boxIds],
    queryFn: async () => {
      if (boxIds.length === 0) return [];
      const { data, error } = await supabase
        .from("notificacoes")
        .select("id, tipo, classificacao, descricao_infracao, data_notificacao, prazo_defesa, status, box_id")
        .in("box_id", boxIds)
        .not("status", "eq", "arquivado");
      if (error) throw error;
      return data || [];
    },
    enabled: isLojista && boxIds.length > 0,
  });

  // Buscar PADs ativos
  const { data: pads, isLoading: padsLoading } = useQuery({
    queryKey: ["lojista-pads", boxIds],
    queryFn: async () => {
      if (boxIds.length === 0) return [];
      const { data, error } = await supabase
        .from("pads")
        .select("id, numero_processo, status, data_autuacao, box_id")
        .in("box_id", boxIds)
        .not("status", "in", "(arquivado,decisao_final)");
      if (error) throw error;
      return data || [];
    },
    enabled: isLojista && boxIds.length > 0,
  });

  // Buscar documentos do box
  const { data: boxDocuments, isLoading: boxDocsLoading } = useQuery({
    queryKey: ["lojista-box-documents", boxIds],
    queryFn: async () => {
      if (boxIds.length === 0) return [];
      const { data, error } = await supabase
        .from("box_documents")
        .select("id, nome, tipo, data_validade, box_id")
        .in("box_id", boxIds)
        .not("data_validade", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: isLojista && boxIds.length > 0,
  });

  // Buscar documentos do responsável
  const { data: respDocuments, isLoading: respDocsLoading } = useQuery({
    queryKey: ["lojista-resp-documents", responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];
      const { data, error } = await supabase
        .from("responsavel_documents")
        .select("id, nome, tipo, data_validade")
        .eq("responsavel_id", responsavelId)
        .not("data_validade", "is", null);
      if (error) throw error;
      return data || [];
    },
    enabled: isLojista && !!responsavelId,
  });

  // Processar pendências
  const pendencias: Pendencia[] = [];
  const hoje = new Date();
  const em30Dias = addDays(hoje, 30);

  // Processar notificações
  notificacoes?.forEach(n => {
    const box = boxes?.find(b => b.id === n.box_id);
    pendencias.push({
      id: `notificacao-${n.id}`,
      tipo: 'notificacao',
      titulo: `Notificação ${n.tipo === 'interna' ? 'Interna' : 'Externa'}`,
      descricao: `${n.descricao_infracao?.slice(0, 80)}${(n.descricao_infracao?.length || 0) > 80 ? '...' : ''} - Box ${box?.codigo || ''}`,
      urgencia: n.classificacao === 'gravissima' ? 'alta' : n.classificacao === 'grave' ? 'media' : 'baixa',
      data: n.prazo_defesa || n.data_notificacao,
      link: `/notificacoes`,
    });
  });

  // Processar PADs
  pads?.forEach(p => {
    const box = boxes?.find(b => b.id === p.box_id);
    pendencias.push({
      id: `pad-${p.id}`,
      tipo: 'pad',
      titulo: `PAD ${p.numero_processo}`,
      descricao: `Processo Administrativo em andamento - Box ${box?.codigo || ''}`,
      urgencia: 'alta',
      data: p.data_autuacao,
      link: `/notificacoes`,
    });
  });

  // Processar documentos do box
  boxDocuments?.forEach(doc => {
    const validade = doc.data_validade ? new Date(doc.data_validade) : null;
    if (!validade) return;

    const box = boxes?.find(b => b.id === doc.box_id);
    const vencido = isBefore(validade, hoje);
    const vencendo = !vencido && isBefore(validade, em30Dias);

    if (vencido) {
      pendencias.push({
        id: `doc-box-${doc.id}`,
        tipo: 'documento_vencido',
        titulo: 'Documento Vencido',
        descricao: `${doc.nome} (${doc.tipo || 'Documento'}) - Box ${box?.codigo || ''}`,
        urgencia: 'alta',
        data: doc.data_validade,
        link: `/documentos`,
      });
    } else if (vencendo) {
      pendencias.push({
        id: `doc-box-${doc.id}`,
        tipo: 'documento_vencendo',
        titulo: 'Documento Vencendo',
        descricao: `${doc.nome} (${doc.tipo || 'Documento'}) - Box ${box?.codigo || ''}`,
        urgencia: 'media',
        data: doc.data_validade,
        link: `/documentos`,
      });
    }
  });

  // Processar documentos do responsável
  respDocuments?.forEach(doc => {
    const validade = doc.data_validade ? new Date(doc.data_validade) : null;
    if (!validade) return;

    const vencido = isBefore(validade, hoje);
    const vencendo = !vencido && isBefore(validade, em30Dias);

    if (vencido) {
      pendencias.push({
        id: `doc-resp-${doc.id}`,
        tipo: 'documento_vencido',
        titulo: 'Documento Pessoal Vencido',
        descricao: `${doc.nome} (${doc.tipo || 'Documento'})`,
        urgencia: 'alta',
        data: doc.data_validade,
        link: `/documentos`,
      });
    } else if (vencendo) {
      pendencias.push({
        id: `doc-resp-${doc.id}`,
        tipo: 'documento_vencendo',
        titulo: 'Documento Pessoal Vencendo',
        descricao: `${doc.nome} (${doc.tipo || 'Documento'})`,
        urgencia: 'media',
        data: doc.data_validade,
        link: `/documentos`,
      });
    }
  });

  // Ordenar por urgência
  pendencias.sort((a, b) => {
    const ordem = { alta: 0, media: 1, baixa: 2 };
    return ordem[a.urgencia] - ordem[b.urgencia];
  });

  const totalNotificacoes = notificacoes?.length || 0;
  const totalPAD = pads?.length || 0;
  const totalDocumentosVencidos = pendencias.filter(p => p.tipo === 'documento_vencido').length;
  const totalDocumentosVencendo = pendencias.filter(p => p.tipo === 'documento_vencendo').length;

  return {
    pendencias,
    totalNotificacoes,
    totalDocumentosVencidos,
    totalDocumentosVencendo,
    totalPAD,
    total: pendencias.length,
    isLoading: notificacoesLoading || padsLoading || boxDocsLoading || respDocsLoading,
  };
};
