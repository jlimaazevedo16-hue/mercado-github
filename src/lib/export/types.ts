export type ExportFormat = 'pdf' | 'excel' | 'csv';
export type ReportType = 'completo' | 'resumido';

export interface InstitutionalConfig {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  telefone: string;
  sistemaNome: string;
  rodapeTexto: string;
  logoUrl?: string;
}

export interface ExportOptions {
  format: ExportFormat;
  reportType: ReportType;
  title: string;
  module: string;
  filters?: Record<string, unknown>;
  columns: ExportColumn[];
  data: unknown[];
  userName?: string;
}

export interface ExportColumn {
  key: string;
  header: string;
  width?: number;
  formatter?: (value: unknown) => string;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}
