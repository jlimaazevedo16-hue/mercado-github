import { useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileSpreadsheet, X, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";
import { ImportData } from "@/pages/Importacao";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface ImportacaoUploadProps {
  onFileUploaded: (data: ImportData) => void;
}

const REQUIRED_HEADERS = [
  "setor_nome",
  "segmento_nome",
  "box_codigo",
  "box_nome",
  "box_area_m2",
  "box_status"
];

export function ImportacaoUpload({ onFileUploaded }: ImportacaoUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<ImportData | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { toast } = useToast();

  const processFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON with headers
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
        defval: "",
        raw: false
      });

      if (jsonData.length === 0) {
        throw new Error("A planilha está vazia");
      }

      const headers = Object.keys(jsonData[0]);
      
      // Validate required headers
      const missingHeaders = REQUIRED_HEADERS.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Colunas obrigatórias ausentes: ${missingHeaders.join(", ")}`);
      }

      setFile(file);
      setPreviewData({
        fileName: file.name,
        data: jsonData,
        headers
      });

      toast({
        title: "Arquivo carregado",
        description: `${jsonData.length} linhas encontradas. Revise os dados antes de continuar.`
      });
    } catch (error) {
      toast({
        title: "Erro ao processar arquivo",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
      setFile(null);
      setPreviewData(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      processFile(selectedFile);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      const validTypes = [
        "text/csv",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      ];
      if (validTypes.includes(droppedFile.type) || 
          droppedFile.name.endsWith(".csv") || 
          droppedFile.name.endsWith(".xlsx") ||
          droppedFile.name.endsWith(".xls")) {
        processFile(droppedFile);
      } else {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Selecione um arquivo CSV ou Excel (.xlsx, .xls)",
          variant: "destructive"
        });
      }
    }
  }, [toast]);

  const clearFile = () => {
    setFile(null);
    setPreviewData(null);
  };

  const handleContinue = () => {
    if (previewData) {
      onFileUploaded(previewData);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Enviar Planilha
          </CardTitle>
          <CardDescription>
            Faça upload do arquivo CSV ou Excel preenchido com os dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!file ? (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragging 
                  ? "border-primary bg-primary/5" 
                  : "border-muted-foreground/25 hover:border-primary/50"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Arraste e solte seu arquivo aqui, ou clique para selecionar
              </p>
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Selecionar Arquivo
                </label>
              </Button>
              <p className="text-xs text-muted-foreground mt-4">
                Formatos aceitos: CSV, Excel (.xlsx, .xls)
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {previewData?.data.length} linhas encontradas
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {previewData && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Prévia dos Dados
              </CardTitle>
              <CardDescription>
                Exibindo as primeiras 10 linhas. Verifique se os dados estão corretos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="w-full">
                <div className="min-w-[800px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        {previewData.headers.slice(0, 8).map((header) => (
                          <TableHead key={header}>
                            <Badge variant={REQUIRED_HEADERS.includes(header) ? "default" : "secondary"}>
                              {header}
                            </Badge>
                          </TableHead>
                        ))}
                        {previewData.headers.length > 8 && (
                          <TableHead>
                            <Badge variant="outline">+{previewData.headers.length - 8}</Badge>
                          </TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {previewData.data.slice(0, 10).map((row, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs">{idx + 1}</TableCell>
                          {previewData.headers.slice(0, 8).map((header) => (
                            <TableCell key={header} className="max-w-[150px] truncate">
                              {String(row[header] || "-")}
                            </TableCell>
                          ))}
                          {previewData.headers.length > 8 && (
                            <TableCell className="text-muted-foreground">...</TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
              {previewData.data.length > 10 && (
                <p className="text-sm text-muted-foreground mt-2 text-center">
                  ... e mais {previewData.data.length - 10} linhas
                </p>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={clearFile}>
              Cancelar
            </Button>
            <Button onClick={handleContinue}>
              Continuar para Validação
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
