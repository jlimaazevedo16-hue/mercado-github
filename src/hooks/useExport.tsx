import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { exportReport, type ExportOptions, type ExportColumn, type ExportFormat, type ReportType } from '@/lib/export';
import { useToast } from '@/hooks/use-toast';

interface UseExportProps {
  module: string;
  title: string;
  permissionKey?: string;
}

export function useExport({ module, title, permissionKey }: UseExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { user } = useAuth();
  const { hasPermission, role } = useUserRole();
  const { toast } = useToast();

  const canExport = (): boolean => {
    if (!user) return false;
    
    // Admin master can export everything
    if (role === 'administrador_master') return true;
    
    // Check permission if key provided
    if (permissionKey) {
      return hasPermission(permissionKey, 'view');
    }
    
    // Default role-based access
    switch (role) {
      case 'administrador':
        return true;
      case 'fiscal':
        // Fiscais can export operational reports
        return ['boxes', 'notificacoes', 'pads', 'pendencias', 'frequencia'].includes(module);
      case 'funcionario':
        // Limited to their assigned modules
        return ['almoxarifado', 'frequencia'].includes(module);
      case 'lojista':
        // Only their own box data (future)
        return module === 'meu-box';
      default:
        return false;
    }
  };

  const doExport = async (
    format: ExportFormat,
    reportType: ReportType,
    columns: ExportColumn[],
    data: unknown[],
    filters?: Record<string, unknown>
  ) => {
    if (!canExport()) {
      toast({
        title: 'Sem permissão',
        description: 'Você não tem permissão para exportar este relatório.',
        variant: 'destructive',
      });
      return;
    }

    setIsExporting(true);

    try {
      const options: ExportOptions = {
        format,
        reportType,
        title,
        module,
        columns,
        data,
        filters,
        userName: user?.email || 'Sistema',
      };

      const result = await exportReport(options);

      if (result.success) {
        toast({
          title: 'Exportação concluída',
          description: `Arquivo ${result.filename} gerado com sucesso.`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: 'Erro na exportação',
        description: error instanceof Error ? error.message : 'Erro ao gerar relatório.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  return {
    canExport: canExport(),
    isExporting,
    doExport,
  };
}
