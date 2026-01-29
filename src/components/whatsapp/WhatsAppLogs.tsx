import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollText, Loader2, Search, Eye, CheckCircle, XCircle, Ban, Check, CheckCheck } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LogItem {
  id: string;
  destinatario_telefone: string;
  destinatario_nome: string | null;
  conteudo: string;
  status: string;
  status_entrega: string | null;
  entregue_em: string | null;
  lido_em: string | null;
  resposta_api: any;
  created_at: string;
  whatsapp_templates: { nome: string } | null;
  profiles: { nome: string } | null;
}

export const WhatsAppLogs = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLog, setSelectedLog] = useState<LogItem | null>(null);

  const { data: logs, isLoading } = useQuery({
    queryKey: ["whatsapp-logs", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_logs")
        .select(`
          id,
          destinatario_telefone,
          destinatario_nome,
          conteudo,
          status,
          status_entrega,
          entregue_em,
          lido_em,
          resposta_api,
          created_at,
          whatsapp_templates (nome),
          profiles:enviado_por (nome)
        `)
        .order("created_at", { ascending: false })
        .limit(200);

      if (statusFilter !== "all") {
        if (statusFilter === "entregue" || statusFilter === "lido") {
          query = query.eq("status_entrega", statusFilter);
        } else {
          query = query.eq("status", statusFilter);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as LogItem[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      log.destinatario_nome?.toLowerCase().includes(search) ||
      log.destinatario_telefone.includes(search) ||
      log.conteudo.toLowerCase().includes(search)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviado":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case "simulado_enviado":
        return <Badge className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" /> Simulado</Badge>;
      case "erro":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      case "erro_simulado":
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" /> Erro (Sim.)</Badge>;
      case "bloqueado":
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Ban className="w-3 h-3 mr-1" /> Bloqueado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getDeliveryIcon = (statusEntrega: string | null) => {
    switch (statusEntrega) {
      case "lido":
        return (
          <span className="flex items-center gap-1 text-blue-500" title="Lido">
            <CheckCheck className="w-4 h-4" />
          </span>
        );
      case "entregue":
        return (
          <span className="flex items-center gap-1 text-gray-500" title="Entregue">
            <CheckCheck className="w-4 h-4" />
          </span>
        );
      case "enviado":
        return (
          <span className="flex items-center gap-1 text-gray-400" title="Enviado">
            <Check className="w-4 h-4" />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5" />
              Logs de Envio
            </CardTitle>
            <CardDescription>
              Histórico completo de mensagens enviadas
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou conteúdo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="entregue">Entregue</SelectItem>
              <SelectItem value="lido">Lido</SelectItem>
              <SelectItem value="simulado_enviado">Simulado</SelectItem>
              <SelectItem value="erro">Erro</SelectItem>
              <SelectItem value="bloqueado">Bloqueado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredLogs?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ScrollText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum log encontrado</p>
            <p className="text-sm">Os registros de envio aparecerão aqui</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Enviado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Entrega</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs?.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{log.destinatario_nome || "—"}</p>
                      <p className="text-xs text-muted-foreground">{log.destinatario_telefone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{log.whatsapp_templates?.nome || "—"}</TableCell>
                  <TableCell>{log.profiles?.nome || "Sistema"}</TableCell>
                  <TableCell>{getStatusBadge(log.status)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getDeliveryIcon(log.status_entrega)}
                      {log.lido_em && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(log.lido_em), "HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedLog(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-lg">
                        <DialogHeader>
                          <DialogTitle>Detalhes do Envio</DialogTitle>
                        </DialogHeader>
                        {selectedLog && (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Destinatário</p>
                                <p className="font-medium">{selectedLog.destinatario_nome}</p>
                                <p>{selectedLog.destinatario_telefone}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Data/Hora</p>
                                <p className="font-medium">
                                  {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                                </p>
                              </div>
                            </div>

                            {/* Delivery Timeline */}
                            <div className="bg-muted p-3 rounded-lg space-y-2">
                              <p className="text-sm font-medium">Status de Entrega</p>
                              <div className="flex items-center gap-4 text-sm">
                                <div className="flex items-center gap-1">
                                  <Check className="w-4 h-4 text-green-500" />
                                  <span>Enviado</span>
                                </div>
                                {(selectedLog.status_entrega === "entregue" || selectedLog.status_entrega === "lido") && (
                                  <div className="flex items-center gap-1">
                                    <CheckCheck className="w-4 h-4 text-gray-500" />
                                    <span>Entregue</span>
                                    {selectedLog.entregue_em && (
                                      <span className="text-xs text-muted-foreground">
                                        ({format(new Date(selectedLog.entregue_em), "HH:mm", { locale: ptBR })})
                                      </span>
                                    )}
                                  </div>
                                )}
                                {selectedLog.status_entrega === "lido" && (
                                  <div className="flex items-center gap-1">
                                    <CheckCheck className="w-4 h-4 text-blue-500" />
                                    <span>Lido</span>
                                    {selectedLog.lido_em && (
                                      <span className="text-xs text-muted-foreground">
                                        ({format(new Date(selectedLog.lido_em), "HH:mm", { locale: ptBR })})
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="text-muted-foreground text-sm mb-1">Conteúdo</p>
                              <div className="bg-muted p-3 rounded-lg text-sm whitespace-pre-wrap">
                                {selectedLog.conteudo}
                              </div>
                            </div>

                            <div>
                              <p className="text-muted-foreground text-sm mb-1">Status</p>
                              {getStatusBadge(selectedLog.status)}
                            </div>

                            {selectedLog.resposta_api && (
                              <div>
                                <p className="text-muted-foreground text-sm mb-1">Resposta da API</p>
                                <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-40">
                                  {JSON.stringify(selectedLog.resposta_api, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
