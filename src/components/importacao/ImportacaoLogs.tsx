import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileSpreadsheet, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ImportLog {
  id: string;
  created_at: string;
  tipo_importacao: string;
  nome_arquivo: string;
  total_linhas: number;
  linhas_importadas: number;
  linhas_erro: number;
  status: string;
  duracao_segundos: number;
}

export function ImportacaoLogs() {
  const [logs, setLogs] = useState<ImportLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchLogs() {
      const { data } = await supabase
        .from("import_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      setLogs(data || []);
      setIsLoading(false);
    }
    fetchLogs();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "concluido":
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Concluído</Badge>;
      case "em_andamento":
        return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">Em andamento</Badge>;
      case "erro":
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTipoLabel = (tipo: string) => {
    const labels: Record<string, string> = {
      completa: "Importação Completa",
      setores: "Setores",
      segmentos: "Segmentos",
      responsaveis: "Responsáveis",
      boxes: "Boxes"
    };
    return labels[tipo] || tipo;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileSpreadsheet className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Nenhuma importação realizada ainda</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5" />
          Histórico de Importações
        </CardTitle>
        <CardDescription>
          Últimas 50 importações realizadas no sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Arquivo</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    OK
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center">
                    <XCircle className="h-4 w-4 text-red-600" />
                    Erro
                  </span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center">
                    <Clock className="h-4 w-4" />
                    Tempo
                  </span>
                </TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{getTipoLabel(log.tipo_importacao)}</Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate" title={log.nome_arquivo}>
                    {log.nome_arquivo}
                  </TableCell>
                  <TableCell className="text-center font-mono">{log.total_linhas}</TableCell>
                  <TableCell className="text-center font-mono text-green-600">
                    {log.linhas_importadas}
                  </TableCell>
                  <TableCell className="text-center font-mono text-red-600">
                    {log.linhas_erro}
                  </TableCell>
                  <TableCell className="text-center font-mono">
                    {log.duracao_segundos}s
                  </TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
