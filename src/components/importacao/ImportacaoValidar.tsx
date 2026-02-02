import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, AlertTriangle, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useAuth } from "@/hooks/useAuth";
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
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";

interface ImportacaoValidarProps {
  importData: ImportData;
  onImportComplete: () => void;
  onCancel: () => void;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ValidatedRow {
  index: number;
  data: Record<string, unknown>;
  errors: ValidationError[];
  isValid: boolean;
}

// CPF validation
function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, "");
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

export function ImportacaoValidar({ importData, onImportComplete, onCancel }: ImportacaoValidarProps) {
  const [validatedRows, setValidatedRows] = useState<ValidatedRow[]>([]);
  const [isValidating, setIsValidating] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importOnlyValid, setImportOnlyValid] = useState(true);
  const [existingSetores, setExistingSetores] = useState<string[]>([]);
  const [existingSegmentos, setExistingSegmentos] = useState<string[]>([]);
  const [existingBoxCodes, setExistingBoxCodes] = useState<string[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch existing data for validation
  useEffect(() => {
    async function fetchExistingData() {
      const [setoresRes, segmentosRes, boxesRes] = await Promise.all([
        supabase.from("setores").select("nome"),
        supabase.from("segmentos").select("nome"),
        supabase.from("boxes").select("codigo")
      ]);

      setExistingSetores(setoresRes.data?.map(s => s.nome.toLowerCase()) || []);
      setExistingSegmentos(segmentosRes.data?.map(s => s.nome.toLowerCase()) || []);
      setExistingBoxCodes(boxesRes.data?.map(b => b.codigo.toLowerCase()) || []);
    }
    fetchExistingData();
  }, []);

  // Validate all rows
  useEffect(() => {
    if (existingSetores.length === 0 && existingSegmentos.length === 0) return;

    const boxCodesInFile = new Map<string, number[]>();
    
    // First pass: collect all box codes in file
    importData.data.forEach((row, idx) => {
      const code = String(row.box_codigo || "").toLowerCase().trim();
      if (code) {
        if (!boxCodesInFile.has(code)) {
          boxCodesInFile.set(code, []);
        }
        boxCodesInFile.get(code)!.push(idx + 1);
      }
    });

    const validated: ValidatedRow[] = importData.data.map((row, idx) => {
      const errors: ValidationError[] = [];
      const rowNum = idx + 1;

      // Required fields
      if (!row.setor_nome) {
        errors.push({ row: rowNum, field: "setor_nome", message: "Setor é obrigatório" });
      }
      if (!row.segmento_nome) {
        errors.push({ row: rowNum, field: "segmento_nome", message: "Segmento é obrigatório" });
      }
      if (!row.box_codigo) {
        errors.push({ row: rowNum, field: "box_codigo", message: "Código do box é obrigatório" });
      }
      if (!row.box_nome) {
        errors.push({ row: rowNum, field: "box_nome", message: "Nome do box é obrigatório" });
      }
      
      // Area validation
      const area = parseFloat(String(row.box_area_m2 || "0").replace(",", "."));
      if (isNaN(area) || area <= 0) {
        errors.push({ row: rowNum, field: "box_area_m2", message: "Área deve ser um número positivo" });
      }

      // Status validation - map user-friendly values to DB enum
      const statusInput = String(row.box_status || "").toLowerCase().trim();
      const validStatuses = ["assinado", "disponivel", "processo", "cancelado", "desativado", "devolvido", "interditado", "ocupado", "vago", "manutencao"];
      if (!validStatuses.includes(statusInput)) {
        errors.push({ row: rowNum, field: "box_status", message: "Status deve ser: ocupado, vago, assinado, disponivel, processo, etc." });
      }

      // Box code uniqueness (in database)
      const boxCode = String(row.box_codigo || "").toLowerCase().trim();
      if (boxCode && existingBoxCodes.includes(boxCode)) {
        errors.push({ row: rowNum, field: "box_codigo", message: "Código já existe no banco de dados" });
      }

      // Check for duplicates in file (more than 2 is error - max 2 responsáveis)
      const occurrences = boxCodesInFile.get(boxCode) || [];
      if (occurrences.length > 2) {
        errors.push({ row: rowNum, field: "box_codigo", message: `Código duplicado mais de 2x (linhas: ${occurrences.join(", ")})` });
      }

      // Responsável validation based on status
      const hasResponsavel = row.responsavel_nome && String(row.responsavel_nome).trim();
      const cpf = String(row.responsavel_cpf || "").trim();

      if (statusInput === "ocupado" || statusInput === "assinado") {
        if (!hasResponsavel) {
          errors.push({ row: rowNum, field: "responsavel_nome", message: "Box ocupado deve ter responsável" });
        }
        if (hasResponsavel && !cpf) {
          errors.push({ row: rowNum, field: "responsavel_cpf", message: "CPF é obrigatório para responsável" });
        }
      }

      if ((statusInput === "vago" || statusInput === "disponivel") && hasResponsavel) {
        errors.push({ row: rowNum, field: "responsavel_nome", message: "Box vago/disponivel não pode ter responsável" });
      }

      // CPF validation
      if (cpf && !validateCPF(cpf)) {
        errors.push({ row: rowNum, field: "responsavel_cpf", message: "CPF inválido" });
      }

      return {
        index: idx,
        data: row,
        errors,
        isValid: errors.length === 0
      };
    });

    setValidatedRows(validated);
    setIsValidating(false);
  }, [importData.data, existingSetores, existingSegmentos, existingBoxCodes]);

  const stats = useMemo(() => {
    const valid = validatedRows.filter(r => r.isValid).length;
    const invalid = validatedRows.filter(r => !r.isValid).length;
    return { valid, invalid, total: validatedRows.length };
  }, [validatedRows]);

  const handleImport = async () => {
    setIsImporting(true);
    setImportProgress(0);
    const startTime = Date.now();

    try {
      const rowsToImport = importOnlyValid 
        ? validatedRows.filter(r => r.isValid)
        : validatedRows;

      if (rowsToImport.length === 0) {
        toast({
          title: "Nenhuma linha para importar",
          description: "Não há linhas válidas para importação",
          variant: "destructive"
        });
        setIsImporting(false);
        return;
      }

      // 1. Collect unique setores and segmentos
      const uniqueSetores = [...new Set(rowsToImport.map(r => String(r.data.setor_nome).trim()))];
      const uniqueSegmentos = [...new Set(rowsToImport.map(r => String(r.data.segmento_nome).trim()))];
      
      setImportProgress(10);

      // 2. Create setores that don't exist
      const setoresMap = new Map<string, string>();
      for (const setor of uniqueSetores) {
        const existing = await supabase
          .from("setores")
          .select("id, nome")
          .ilike("nome", setor)
          .single();
        
        if (existing.data) {
          setoresMap.set(setor.toLowerCase(), existing.data.id);
        } else {
          const { data: newSetor } = await supabase
            .from("setores")
            .insert({ nome: setor })
            .select("id")
            .single();
          if (newSetor) {
            setoresMap.set(setor.toLowerCase(), newSetor.id);
          }
        }
      }
      
      setImportProgress(25);

      // 3. Create segmentos that don't exist
      const segmentosMap = new Map<string, string>();
      for (const segmento of uniqueSegmentos) {
        const existing = await supabase
          .from("segmentos")
          .select("id, nome")
          .ilike("nome", segmento)
          .single();
        
        if (existing.data) {
          segmentosMap.set(segmento.toLowerCase(), existing.data.id);
        } else {
          const { data: newSegmento } = await supabase
            .from("segmentos")
            .insert({ nome: segmento })
            .select("id")
            .single();
          if (newSegmento) {
            segmentosMap.set(segmento.toLowerCase(), newSegmento.id);
          }
        }
      }

      setImportProgress(40);

      // 4. Create responsáveis and collect their IDs
      const responsaveisMap = new Map<string, string>();
      const responsaveisToCreate = rowsToImport
        .filter(r => r.data.responsavel_cpf)
        .map(r => ({
          cpf: String(r.data.responsavel_cpf).replace(/\D/g, ""),
          nome: String(r.data.responsavel_nome || ""),
          telefone: String(r.data.responsavel_telefone || "") || null,
          email: String(r.data.responsavel_email || "") || null,
          endereco: String(r.data.responsavel_endereco || "") || null,
          cidade: String(r.data.responsavel_cidade || "") || null,
          estado: String(r.data.responsavel_estado || "") || null,
          cep: String(r.data.responsavel_cep || "") || null
        }));

      // Deduplicate by CPF
      const uniqueResponsaveis = Array.from(
        new Map(responsaveisToCreate.map(r => [r.cpf, r])).values()
      );

      for (const resp of uniqueResponsaveis) {
        if (!resp.cpf) continue;
        
        const existing = await supabase
          .from("responsaveis")
          .select("id")
          .eq("cpf", resp.cpf)
          .single();
        
        if (existing.data) {
          responsaveisMap.set(resp.cpf, existing.data.id);
        } else {
          const { data: newResp } = await supabase
            .from("responsaveis")
            .insert({
              nome: resp.nome,
              cpf: resp.cpf,
              telefone: resp.telefone,
              email: resp.email,
              endereco: resp.endereco,
              cidade: resp.cidade,
              estado: resp.estado,
              cep: resp.cep,
              status: "ativo"
            })
            .select("id")
            .single();
          if (newResp) {
            responsaveisMap.set(resp.cpf, newResp.id);
          }
        }
      }

      setImportProgress(60);

      // 5. Group rows by box_codigo to handle multiple responsáveis
      const boxGroups = new Map<string, typeof rowsToImport>();
      for (const row of rowsToImport) {
        const code = String(row.data.box_codigo).toLowerCase().trim();
        if (!boxGroups.has(code)) {
          boxGroups.set(code, []);
        }
        boxGroups.get(code)!.push(row);
      }

      // 6. Create boxes
      let importedCount = 0;
      for (const [code, rows] of boxGroups) {
        const firstRow = rows[0].data;
        const status = String(firstRow.box_status).toLowerCase().trim();
        const area = parseFloat(String(firstRow.box_area_m2 || "0").replace(",", "."));
        
        // Map status to enum - support both legacy and new values
        type BoxStatus = "ASSINADO" | "DISPONIVEL" | "PROCESSO" | "CANCELADO" | "DESATIVADO" | "DEVOLVIDO" | "INTERDITADO";
        const statusMap: Record<string, BoxStatus> = {
          "ocupado": "ASSINADO",
          "assinado": "ASSINADO",
          "vago": "DISPONIVEL",
          "disponivel": "DISPONIVEL",
          "manutencao": "INTERDITADO",
          "interditado": "INTERDITADO",
          "processo": "PROCESSO",
          "cancelado": "CANCELADO",
          "desativado": "DESATIVADO",
          "devolvido": "DEVOLVIDO"
        };
        const dbStatus: BoxStatus = statusMap[status] || "DISPONIVEL";

        // Get responsável ID for this box (first one)
        const cpf = String(firstRow.responsavel_cpf || "").replace(/\D/g, "");
        const responsavelId = cpf ? responsaveisMap.get(cpf) : null;

        const { error: boxError } = await supabase
          .from("boxes")
          .insert([{
            codigo: String(firstRow.box_codigo).trim(),
            boxe: String(firstRow.box_nome).trim(),
            area_m2: area,
            status: dbStatus,
            setor_id: setoresMap.get(String(firstRow.setor_nome).toLowerCase().trim()),
            segmento_id: segmentosMap.get(String(firstRow.segmento_nome).toLowerCase().trim()),
            responsavel_id: responsavelId
          }]);

        if (!boxError) {
          importedCount++;
        }
      }

      setImportProgress(90);

      // 7. Log the import
      const duration = Math.round((Date.now() - startTime) / 1000);
      await supabase.from("import_logs").insert([{
        user_id: user?.id,
        tipo_importacao: "completa",
        nome_arquivo: importData.fileName,
        total_linhas: stats.total,
        linhas_importadas: importedCount,
        linhas_erro: stats.invalid,
        status: "concluido",
        duracao_segundos: duration,
        detalhes_erros: JSON.parse(JSON.stringify(validatedRows
          .filter(r => !r.isValid)
          .map(r => ({ linha: r.index + 1, erros: r.errors.map(e => ({ row: e.row, field: e.field, message: e.message })) })))) as Json
      }]);

      setImportProgress(100);

      toast({
        title: "Importação concluída!",
        description: `${importedCount} boxes importados com sucesso em ${duration}s`
      });

      onImportComplete();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      });
    } finally {
      setIsImporting(false);
    }
  };

  const downloadErrorReport = () => {
    const errorRows = validatedRows.filter(r => !r.isValid);
    const report = errorRows.map(r => ({
      linha: r.index + 1,
      ...r.data,
      erros: r.errors.map(e => `${e.field}: ${e.message}`).join("; ")
    }));

    const csv = [
      Object.keys(report[0] || {}).join(";"),
      ...report.map(r => Object.values(r).join(";"))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "erros_importacao.csv";
    link.click();
  };

  if (isValidating) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Validando dados...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-muted">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
                <p className="text-sm text-muted-foreground">Linhas válidas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-muted">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{stats.invalid}</p>
                <p className="text-sm text-muted-foreground">Linhas com erro</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-muted">
                <AlertTriangle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total de linhas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Errors Table */}
      {stats.invalid > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-5 w-5" />
                  Erros Encontrados
                </CardTitle>
                <CardDescription>
                  Corrija os erros na planilha original ou importe apenas as linhas válidas
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={downloadErrorReport} className="gap-2">
                <Download className="h-4 w-4" />
                Baixar Relatório
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[300px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">Linha</TableHead>
                    <TableHead>Box</TableHead>
                    <TableHead>Campo</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {validatedRows
                    .filter(r => !r.isValid)
                    .flatMap(r => 
                      r.errors.map((err, i) => (
                        <TableRow key={`${r.index}-${i}`}>
                          <TableCell className="font-mono">{r.index + 1}</TableCell>
                          <TableCell>{String(r.data.box_codigo || "-")}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{err.field}</Badge>
                          </TableCell>
                          <TableCell className="text-red-600">{err.message}</TableCell>
                        </TableRow>
                      ))
                    )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Import Progress */}
      {isImporting && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importando...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="import-valid" 
                checked={importOnlyValid}
                onCheckedChange={(checked) => setImportOnlyValid(checked as boolean)}
              />
              <label htmlFor="import-valid" className="text-sm">
                Importar apenas linhas válidas ({stats.valid} linhas)
              </label>
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onCancel} disabled={isImporting}>
                Cancelar
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={isImporting || (importOnlyValid && stats.valid === 0)}
                className="gap-2"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Importar {importOnlyValid ? stats.valid : stats.total} Linhas
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
