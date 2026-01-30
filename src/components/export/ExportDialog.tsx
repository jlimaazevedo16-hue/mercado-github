import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText, FileSpreadsheet, FileDown, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ExportFormat, ReportType, ExportColumn } from '@/lib/export';
import { useExport } from '@/hooks/useExport';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  module: string;
  title: string;
  columns: ExportColumn[];
  data: unknown[];
  filters?: Record<string, unknown>;
  permissionKey?: string;
}

export function ExportDialog({
  open,
  onOpenChange,
  module,
  title,
  columns,
  data,
  filters,
  permissionKey,
}: ExportDialogProps) {
  const [format, setFormat] = useState<ExportFormat>('pdf');
  const [reportType, setReportType] = useState<ReportType>('completo');
  const isMobile = useIsMobile();
  
  const { canExport, isExporting, doExport } = useExport({
    module,
    title,
    permissionKey,
  });

  const handleExport = async () => {
    await doExport(format, reportType, columns, data, filters);
    onOpenChange(false);
  };

  const formatOptions = [
    { value: 'pdf' as ExportFormat, label: 'PDF', icon: FileText, description: 'Documento formatado' },
    { value: 'excel' as ExportFormat, label: 'Excel', icon: FileSpreadsheet, description: 'Planilha editável' },
    { value: 'csv' as ExportFormat, label: 'CSV', icon: FileDown, description: 'Dados simples' },
  ];

  const reportOptions = [
    { value: 'completo' as ReportType, label: 'Completo', description: 'Todos os campos' },
    { value: 'resumido' as ReportType, label: 'Resumido', description: 'Campos principais' },
  ];

  const content = (
    <>
      <div className="space-y-6 py-4">
        {/* Format selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Formato do arquivo</Label>
          <RadioGroup
            value={format}
            onValueChange={(val) => setFormat(val as ExportFormat)}
            className="grid grid-cols-3 gap-2"
          >
            {formatOptions.map((opt) => (
              <Label
                key={opt.value}
                className={`flex flex-col items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors ${
                  format === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={opt.value} className="sr-only" />
                <opt.icon className={`h-6 w-6 ${format === opt.value ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground text-center">{opt.description}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Report type selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Tipo de relatório</Label>
          <RadioGroup
            value={reportType}
            onValueChange={(val) => setReportType(val as ReportType)}
            className="grid grid-cols-2 gap-2"
          >
            {reportOptions.map((opt) => (
              <Label
                key={opt.value}
                className={`flex flex-col items-center gap-1 rounded-lg border p-3 cursor-pointer transition-colors ${
                  reportType === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-muted hover:border-primary/50'
                }`}
              >
                <RadioGroupItem value={opt.value} className="sr-only" />
                <span className="text-sm font-medium">{opt.label}</span>
                <span className="text-xs text-muted-foreground">{opt.description}</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {/* Info */}
        <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
          <p><strong>{data.length}</strong> registro(s) serão exportados</p>
          {filters && Object.keys(filters).length > 0 && (
            <p className="mt-1">Filtros ativos aplicados ao relatório</p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isExporting}>
          Cancelar
        </Button>
        <Button onClick={handleExport} disabled={isExporting || !canExport}>
          {isExporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Gerando...
            </>
          ) : (
            'Exportar'
          )}
        </Button>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh]">
          <SheetHeader className="text-left">
            <SheetTitle>Exportar Relatório</SheetTitle>
            <SheetDescription>{title}</SheetDescription>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar Relatório</DialogTitle>
          <DialogDescription>{title}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
