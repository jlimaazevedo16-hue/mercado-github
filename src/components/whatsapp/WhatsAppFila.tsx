import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListOrdered, Loader2, Trash2, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface QueueItem {
  id: string;
  destinatario_telefone: string;
  destinatario_nome: string | null;
  conteudo: string;
  status: string;
  agendado_para: string | null;
  tentativas: number;
  erro_mensagem: string | null;
  created_at: string;
  whatsapp_templates: { nome: string } | null;
  whatsapp_instances: { nome: string; status: string } | null;
}

export const WhatsAppFila = () => {
  const queryClient = useQueryClient();

  const { data: queueItems, isLoading, refetch } = useQuery({
    queryKey: ["whatsapp-queue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_queue")
        .select(`
          id,
          destinatario_telefone,
          destinatario_nome,
          conteudo,
          status,
          agendado_para,
          tentativas,
          erro_mensagem,
          created_at,
          whatsapp_templates (nome),
          whatsapp_instances (nome, status)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as QueueItem[];
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  // Check if there's a connected instance
  const { data: instances } = useQuery({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, nome, status")
        .eq("status", "connected");

      if (error) throw error;
      return data;
    },
  });

  const hasConnectedInstance = instances && instances.length > 0;

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("whatsapp_queue").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue"] });
      toast.success("Item removido da fila");
    },
    onError: (error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  const retryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "retry_message", queue_id: id },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue"] });
      toast.success("Mensagem reenfileirada para reprocessamento");
    },
    onError: (error) => {
      toast.error("Erro ao reprocessar: " + error.message);
    },
  });

  // Real queue processing via Evolution API
  const processQueueMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: { action: "process_queue" },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
      
      if (data?.skipped) {
        toast.warning(data.message || "Processamento fora do horário permitido");
      } else {
        toast.success(`Fila processada: ${data?.processed || 0} enviadas, ${data?.errors || 0} erros`);
      }
    },
    onError: (error) => {
      toast.error("Erro ao processar fila: " + error.message);
    },
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "enviado":
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Enviado</Badge>;
      case "simulado_enviado":
        return <Badge className="bg-blue-500"><CheckCircle className="w-3 h-3 mr-1" /> Simulado</Badge>;
      case "processando":
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Processando</Badge>;
      case "erro":
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Erro</Badge>;
      case "erro_simulado":
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="w-3 h-3 mr-1" /> Erro (Sim.)</Badge>;
      case "agendado":
        return <Badge variant="outline" className="text-purple-600 border-purple-600"><Clock className="w-3 h-3 mr-1" /> Agendado</Badge>;
      case "pausado":
        return <Badge variant="outline" className="text-orange-600 border-orange-600"><Clock className="w-3 h-3 mr-1" /> Pausado</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  const pendingCount = queueItems?.filter((i) => i.status === "pendente" || i.status === "pausado").length || 0;
  const processingCount = queueItems?.filter((i) => i.status === "processando").length || 0;
  const sentCount = queueItems?.filter((i) => i.status === "enviado" || i.status === "simulado_enviado").length || 0;
  const errorCount = queueItems?.filter((i) => i.status === "erro" || i.status === "erro_simulado").length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              Fila de Mensagens
            </CardTitle>
            <CardDescription>
              Acompanhe o status das mensagens pendentes e enviadas
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
            <Button
              onClick={() => processQueueMutation.mutate()}
              disabled={processQueueMutation.isPending || pendingCount === 0 || !hasConnectedInstance}
              title={!hasConnectedInstance ? "Nenhuma instância conectada" : "Processar mensagens pendentes"}
            >
              {processQueueMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Processar Fila
            </Button>
          </div>
        </div>

        {!hasConnectedInstance && (
          <div className="mt-4 bg-yellow-50 dark:bg-yellow-950 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Nenhuma instância WhatsApp conectada. Conecte uma instância para processar a fila.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-muted rounded-lg p-3 text-center">
            <p className="text-2xl font-bold">{pendingCount}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{processingCount}</p>
            <p className="text-xs text-muted-foreground">Processando</p>
          </div>
          <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{sentCount}</p>
            <p className="text-xs text-muted-foreground">Enviados</p>
          </div>
          <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{errorCount}</p>
            <p className="text-xs text-muted-foreground">Erros</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : queueItems?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <ListOrdered className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Fila vazia</p>
            <p className="text-sm">As mensagens enfileiradas aparecerão aqui</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Destinatário</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Instância</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agendado</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueItems?.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{item.destinatario_nome || "—"}</p>
                      <p className="text-xs text-muted-foreground">{item.destinatario_telefone}</p>
                    </div>
                  </TableCell>
                  <TableCell>{item.whatsapp_templates?.nome || "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <span>{item.whatsapp_instances?.nome || "—"}</span>
                      {item.whatsapp_instances?.status === "connected" && (
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(item.status)}
                    {item.erro_mensagem && (
                      <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={item.erro_mensagem}>
                        {item.erro_mensagem}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {item.agendado_para
                      ? format(new Date(item.agendado_para), "dd/MM HH:mm", { locale: ptBR })
                      : "—"}
                  </TableCell>
                  <TableCell>{item.tentativas}</TableCell>
                  <TableCell>
                    {format(new Date(item.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    {item.status === "erro" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => retryMutation.mutate(item.id)}
                        disabled={retryMutation.isPending}
                        title="Reprocessar mensagem"
                      >
                        <RotateCcw className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(item.id)}
                      disabled={item.status === "processando"}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
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
