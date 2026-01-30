import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportOptions, ExportResult } from './types';

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function exportToCSV(options: ExportOptions): Promise<ExportResult> {
  try {
    // Prepare headers
    const headers = options.columns.map(col => escapeCSV(col.header));
    
    // Prepare data rows
    const dataRows = options.data.map(row => {
      const rowObj = row as Record<string, unknown>;
      return options.columns.map(col => {
        const value = rowObj[col.key];
        if (col.formatter) {
          return escapeCSV(col.formatter(value));
        }
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        if (value instanceof Date) return format(value, 'dd/MM/yyyy', { locale: ptBR });
        return escapeCSV(String(value));
      });
    });
    
    // Combine all rows
    const csvContent = [
      headers.join(','),
      ...dataRows.map(row => row.join(','))
    ].join('\n');
    
    // Add BOM for UTF-8 compatibility
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // Generate filename
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `${options.module}_${options.reportType}_${timestamp}.csv`;
    
    // Download
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
    
    return { success: true, filename };
  } catch (error) {
    console.error('CSV export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao gerar CSV' 
    };
  }
}
