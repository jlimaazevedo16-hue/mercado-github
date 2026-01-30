import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ExportOptions, InstitutionalConfig, ExportResult } from './types';
import { getInstitutionalConfig } from './institutionalConfig';

const HEADER_HEIGHT = 45;
const FOOTER_HEIGHT = 25;
const MARGIN = 14;

async function loadLogoAsBase64(): Promise<string | null> {
  try {
    const response = await fetch('/src/assets/logo_associacao.jpeg');
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function addHeader(
  doc: jsPDF,
  config: InstitutionalConfig,
  title: string,
  logoBase64: string | null,
  pageWidth: number
) {
  const centerX = pageWidth / 2;
  
  // Logo
  if (logoBase64) {
    try {
      doc.addImage(logoBase64, 'JPEG', MARGIN, 8, 25, 25);
    } catch {
      // Logo loading failed, continue without it
    }
  }

  // Institution info
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(config.nome, centerX, 12, { align: 'center' });
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`CNPJ: ${config.cnpj}`, centerX, 18, { align: 'center' });
  doc.text(`${config.endereco} - ${config.cidade}`, centerX, 23, { align: 'center' });
  doc.text(`Tel: ${config.telefone}`, centerX, 28, { align: 'center' });
  
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(config.sistemaNome, centerX, 33, { align: 'center' });
  doc.setTextColor(0);
  
  // Report title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(title.toUpperCase(), centerX, 41, { align: 'center' });
  
  // Separator line
  doc.setDrawColor(200);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, HEADER_HEIGHT, pageWidth - MARGIN, HEADER_HEIGHT);
}

function addFooter(
  doc: jsPDF,
  config: InstitutionalConfig,
  userName: string,
  pageNum: number,
  totalPages: number,
  pageWidth: number,
  pageHeight: number
) {
  const footerY = pageHeight - FOOTER_HEIGHT;
  
  // Separator line
  doc.setDrawColor(200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, footerY, pageWidth - MARGIN, footerY);
  
  // Footer content
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100);
  
  const now = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  
  // Left: institutional text
  doc.text(config.rodapeTexto, MARGIN, footerY + 6);
  
  // Center: generation info
  doc.text(
    `Gerado em: ${now} | Por: ${userName}`,
    pageWidth / 2,
    footerY + 12,
    { align: 'center' }
  );
  
  // Right: page number
  doc.text(
    `Página ${pageNum} de ${totalPages}`,
    pageWidth - MARGIN,
    footerY + 12,
    { align: 'right' }
  );
  
  doc.setTextColor(0);
}

export async function exportToPDF(options: ExportOptions): Promise<ExportResult> {
  try {
    const config = await getInstitutionalConfig();
    const logoBase64 = await loadLogoAsBase64();
    
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4',
    });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Prepare table data
    const headers = options.columns.map(col => col.header);
    const body = options.data.map(row => {
      const rowObj = row as Record<string, unknown>;
      return options.columns.map(col => {
        const value = rowObj[col.key];
        if (col.formatter) {
          return col.formatter(value);
        }
        if (value === null || value === undefined) return '-';
        if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
        if (value instanceof Date) return format(value, 'dd/MM/yyyy', { locale: ptBR });
        return String(value);
      });
    });

    // Add table with auto-paging
    autoTable(doc, {
      head: [headers],
      body,
      startY: HEADER_HEIGHT + 5,
      margin: { top: HEADER_HEIGHT + 5, bottom: FOOTER_HEIGHT + 5, left: MARGIN, right: MARGIN },
      styles: {
        fontSize: 8,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [41, 65, 114],
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250],
      },
      didDrawPage: (data) => {
        addHeader(doc, config, options.title, logoBase64, pageWidth);
      },
    });

    // Add footers to all pages
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      addFooter(doc, config, options.userName || 'Sistema', i, totalPages, pageWidth, pageHeight);
    }

    // Generate filename
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `${options.module}_${options.reportType}_${timestamp}.pdf`;
    
    // Save
    doc.save(filename);

    return { success: true, filename };
  } catch (error) {
    console.error('PDF export error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro ao gerar PDF' 
    };
  }
}
