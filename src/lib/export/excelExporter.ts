import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportOptions, ExportResult } from './types';
import { getInstitutionalConfig } from './institutionalConfig';

export async function exportToExcel(options: ExportOptions): Promise<ExportResult> {
  try {
    const config = await getInstitutionalConfig();
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    
    // Prepare header rows with institutional info
    const headerRows = [
      [config.nome],
      [`CNPJ: ${config.cnpj}`],
      [`${config.endereco} - ${config.cidade}`],
      [`Tel: ${config.telefone}`],
      [],
      [options.title.toUpperCase()],
      [`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`],
      [`Por: ${options.userName || 'Sistema'}`],
      [],
    ];
    
    // Prepare data rows
    const headers = options.columns.map(col => col.header);
    const dataRows = options.data.map(row => {
      const rowObj = row as Record<string, unknown>;
      return options.columns.map(col => {
        const value = rowObj[col.key];
        if (col.formatter) {
          return col.formatter(value);
        }
        if (value === null || value === undefined) return '';
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        if (value instanceof Date) return format(value, 'dd/MM/yyyy', { locale: ptBR });
        return value;
      });
    });
    
    // Combine all rows
    const allRows = [...headerRows, headers, ...dataRows];
    
    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(allRows);
    
    // Set column widths
    const colWidths = options.columns.map(col => ({ wch: col.width || 15 }));
    ws['!cols'] = colWidths;
    
    // Merge cells for header
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: options.columns.length - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: options.columns.length - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: options.columns.length - 1 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: options.columns.length - 1 } },
      { s: { r: 5, c: 0 }, e: { r: 5, c: options.columns.length - 1 } },
      { s: { r: 6, c: 0 }, e: { r: 6, c: options.columns.length - 1 } },
      { s: { r: 7, c: 0 }, e: { r: 7, c: options.columns.length - 1 } },
    ];
    
    // Add footer
    const footerRow = headerRows.length + 1 + dataRows.length + 1;
    XLSX.utils.sheet_add_aoa(ws, [[]], { origin: footerRow });
    XLSX.utils.sheet_add_aoa(ws, [[config.rodapeTexto]], { origin: footerRow + 1 });
    
    // Append worksheet
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    
    // Generate filename
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `${options.module}_${options.reportType}_${timestamp}.xlsx`;
    
    // Save
    XLSX.writeFile(wb, filename);
    
    return { success: true, filename };
  } catch (error) {
    console.error('Excel export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao gerar Excel' 
    };
  }
}
