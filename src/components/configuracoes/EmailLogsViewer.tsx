import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Mail, CheckCircle, XCircle, Clock, Search, 
  RefreshCw, Loader2, AlertTriangle, Filter
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

const tipoLabels: Record<string, { label: string; color: string }> = {
  pendencia_critica: { label: 'Pendência Crítica', color: 'bg-red-100 text-red-700' },
  vencimento_certificado: { label: 'Vencimento', color: 'bg-orange-100 text-orange-700' },
  geracao_cobranca: { label: 'Cobrança', color: 'bg-blue-100 text-blue-700' },
  atualizacao_cadastro: { label: 'Atualização', color: 'bg-purple-100 text-purple-700' },
  verificacao_dados: { label: 'Verificação', color: 'bg-cyan-100 text-cyan-700' },
  notificacao_pad: { label: 'Notificação/PAD', color: 'bg-yellow-100 text-yellow-700' },
  boas_vindas: { label: 'Boas-vindas', color: 'bg-green-100 text-green-700' },
  reset_senha: { label: 'Reset Senha', color: 'bg-gray-100 text-gray-700' },
  generico: { label: 'Genérico', color: 'bg-gray-100 text-gray-700' },
};

const statusLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  enviado: { label: 'Enviado', icon: <CheckCircle className="h-4 w-4" />, color: 'text-green-600' },
  erro: { label: 'Erro', icon: <XCircle className="h-4 w-4" />, color: 'text-red-600' },
  desativado: { label: 'Desativado', icon: <AlertTriangle className="h-4 w-4" />, color: 'text-yellow-600' },
};

export function EmailLogsViewer() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: logs, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["email-logs", tipoFilter, statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("email_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tipoFilter !== "all") {
        query = query.eq("tipo", tipoFilter);
      }

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const filteredLogs = logs?.filter(log => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      log.destinatario?.toLowerCase().includes(term) ||
      log.destinatario_nome?.toLowerCase().includes(term) ||
      log.assunto?.toLowerCase().includes(term)
    );
  });

  const stats = logs ? {
    total: logs.length,
    enviados: logs.filter(l => l.status === 'enviado').length,
    erros: logs.filter(l => l.status === 'erro').length,
    desativados: logs.filter(l => l.status === 'desativado').length,
  } : null;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-600">{stats.enviados}</p>
                  <p className="text-xs text-muted-foreground">Enviados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-5 w-5 text-red-600" />
                <div>
                  <p className="text-2xl font-bold text-red-600">{stats.erros}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-2xl font-bold text-yellow-600">{stats.desativados}</p>
                  <p className="text-xs text-muted-foreground">Desativados</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Logs de E-mail</CardTitle>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por destinatário ou assunto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(tipoLabels).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="enviado">Enviados</SelectItem>
                <SelectItem value="erro">Erros</SelectItem>
                <SelectItem value="desativado">Desativados</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !filteredLogs || filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum e-mail encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Destinatário</TableHead>
                    <TableHead>Assunto</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => {
                    const tipoInfo = tipoLabels[log.tipo] || { label: log.tipo, color: 'bg-gray-100 text-gray-700' };
                    const statusInfo = statusLabels[log.status] || statusLabels.erro;

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap text-sm">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={tipoInfo.color}>
                            {tipoInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{log.destinatario_nome || '—'}</p>
                            <p className="text-xs text-muted-foreground">{log.destinatario}</p>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <p className="truncate text-sm" title={log.assunto}>
                            {log.assunto}
                          </p>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1.5 ${statusInfo.color}`}>
                            {statusInfo.icon}
                            <span className="text-sm">{statusInfo.label}</span>
                          </div>
                          {log.erro && (
                            <p className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={log.erro}>
                              {log.erro}
                            </p>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
