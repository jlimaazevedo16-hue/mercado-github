import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import type { ExportOptions, ExportResult } from './types';
import { exportToPDF } from './pdfExporter';
import { exportToExcel } from './excelExporter';
import { exportToCSV } from './csvExporter';

export * from './types';
export { getInstitutionalConfig, updateInstitutionalConfig } from './institutionalConfig';

async function logExport(options: ExportOptions): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const newValues: Json = {
      formato: options.format,
      tipo_relatorio: options.reportType,
      titulo: options.title,
      total_registros: options.data.length,
      filtros: JSON.stringify(options.filters || {}),
    };

    await supabase.from('audit_logs').insert([{
      user_id: user.id,
      action: 'export_report',
      table_name: options.module,
      record_id: null,
      old_values: null,
      new_values: newValues,
      user_agent: navigator.userAgent,
    }]);
  } catch (error) {
    console.error('Error logging export:', error);
  }
}

export async function exportReport(options: ExportOptions): Promise<ExportResult> {
  let result: ExportResult;

  switch (options.format) {
    case 'pdf':
      result = await exportToPDF(options);
      break;
    case 'excel':
      result = await exportToExcel(options);
      break;
    case 'csv':
      result = await exportToCSV(options);
      break;
    default:
      return { success: false, error: 'Formato não suportado' };
  }

  if (result.success) {
    await logExport(options);
  }

  return result;
}
