import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, FileWarning, Scale, Wrench } from 'lucide-react';
import { differenceInDays } from 'date-fns';

interface PendingIndicatorsProps {
  boxId: string;
}

interface PendingCounts {
  notificacoes: number;
  certificadosVencidos: number;
  certificadosVencendo: number;
  manutencoes: number;
  processos: number;
}

export const PendingIndicators = ({ boxId }: PendingIndicatorsProps) => {
  const { data: counts } = useQuery({
    queryKey: ['box-pending-counts', boxId],
    queryFn: async (): Promise<PendingCounts> => {
      // Get notification count
      const { count: notifCount } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('box_id', boxId)
        .in('status', ['pendente', 'em_analise']);

      // Get certificate status
      const { data: docs } = await supabase
        .from('box_documents')
        .select('data_validade')
        .eq('box_id', boxId)
        .not('data_validade', 'is', null);

      let vencidos = 0;
      let vencendo = 0;
      const today = new Date();
      
      docs?.forEach((doc) => {
        if (doc.data_validade) {
          const dias = differenceInDays(new Date(doc.data_validade), today);
          if (dias < 0) vencidos++;
          else if (dias <= 30) vencendo++;
        }
      });

      // Get maintenance count
      const { count: manutCount } = await supabase
        .from('box_maintenances')
        .select('*', { count: 'exact', head: true })
        .eq('box_id', boxId)
        .in('status', ['PENDENTE', 'EM_ANDAMENTO']);

      // Get process count
      const { count: padCount } = await supabase
        .from('pads')
        .select('*', { count: 'exact', head: true })
        .eq('box_id', boxId)
        .not('status', 'in', '("arquivado","decisao_final")');

      return {
        notificacoes: notifCount || 0,
        certificadosVencidos: vencidos,
        certificadosVencendo: vencendo,
        manutencoes: manutCount || 0,
        processos: padCount || 0,
      };
    },
    staleTime: 60000, // Cache por 1 minuto
  });

  if (!counts) return null;

  const hasAnyPending = 
    counts.notificacoes > 0 || 
    counts.certificadosVencidos > 0 || 
    counts.certificadosVencendo > 0 ||
    counts.manutencoes > 0 ||
    counts.processos > 0;

  if (!hasAnyPending) return null;

  return (
    <div className="flex items-center gap-1">
      {counts.notificacoes > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
              <AlertTriangle className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {counts.notificacoes} notificação(ões) pendente(s)
          </TooltipContent>
        </Tooltip>
      )}

      {counts.certificadosVencidos > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
              <FileWarning className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {counts.certificadosVencidos} certificado(s) vencido(s)
          </TooltipContent>
        </Tooltip>
      )}

      {counts.certificadosVencendo > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-yellow-500 hover:bg-yellow-600">
              <FileWarning className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {counts.certificadosVencendo} certificado(s) vencendo em breve
          </TooltipContent>
        </Tooltip>
      )}

      {counts.manutencoes > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center">
              <Wrench className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {counts.manutencoes} manutenção(ões) pendente(s)
          </TooltipContent>
        </Tooltip>
      )}

      {counts.processos > 0 && (
        <Tooltip>
          <TooltipTrigger>
            <Badge className="h-5 w-5 p-0 flex items-center justify-center bg-orange-500 hover:bg-orange-600">
              <Scale className="h-3 w-3" />
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            {counts.processos} processo(s) em andamento
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

// Versão compacta para tabelas
export const PendingIndicatorsBadge = ({ boxId }: PendingIndicatorsProps) => {
  const { data: totalPending } = useQuery({
    queryKey: ['box-total-pending', boxId],
    queryFn: async (): Promise<number> => {
      const { count: notifCount } = await supabase
        .from('notificacoes')
        .select('*', { count: 'exact', head: true })
        .eq('box_id', boxId)
        .in('status', ['pendente', 'em_analise']);

      const { data: docs } = await supabase
        .from('box_documents')
        .select('data_validade')
        .eq('box_id', boxId)
        .not('data_validade', 'is', null);

      let certCount = 0;
      const today = new Date();
      docs?.forEach((doc) => {
        if (doc.data_validade) {
          const dias = differenceInDays(new Date(doc.data_validade), today);
          if (dias < 0 || dias <= 30) certCount++;
        }
      });

      return (notifCount || 0) + certCount;
    },
    staleTime: 60000,
  });

  if (!totalPending || totalPending === 0) return null;

  return (
    <Badge variant="destructive" className="ml-2">
      {totalPending}
    </Badge>
  );
};
