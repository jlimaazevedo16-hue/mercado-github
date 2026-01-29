import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ListOrdered, Loader2, Trash2, Play, RefreshCw, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
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
          whatsapp_templates (nome)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as QueueItem[];
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

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

  // Simulated queue processing - no real API calls
  const processQueueMutation = useMutation({
    mutationFn: async () => {
      // Get pending items
      const { data: pendingItems, error: fetchError } = await supabase
        .from("whatsapp_queue")
        .select("*")
        .eq("status", "pendente")
        .limit(10);

      if (fetchError) throw fetchError;
      if (!pendingItems || pendingItems.length === 0) return { processed: 0 };

      let processed = 0;
      for (const item of pendingItems) {
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 300));

        // Update queue status to simulated
        await supabase
          .from("whatsapp_queue")
          .update({ 
            status: "simulado_enviado",
            tentativas: (item.tentativas || 0) + 1
          })
          .eq("id", item.id);

        // Create log entry for simulated send
        await supabase
          .from("whatsapp_logs")
          .insert({
            queue_id: item.id,
            instance_id: item.instance_id,
            template_id: item.template_id,
            destinatario_telefone: item.destinatario_telefone,
            destinatario_nome: item.destinatario_nome,
            conteudo: item.conteudo,
            status: "simulado_enviado",
            resposta_api: { simulated: true, message: "Modo de simulação ativo" }
          });

        processed++;
      }

      return { processed };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-logs"] });
      toast.success(`Simulação concluída: ${data?.processed || 0} mensagens processadas`);
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
              disabled={processQueueMutation.isPending || pendingCount === 0}
              title="Processa mensagens em modo simulado (sem envio real)"
            >
              {processQueueMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Simular Envio
            </Button>
          </div>
        </div>

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
                    {getStatusBadge(item.status)}
                    {item.erro_mensagem && (
                      <p className="text-xs text-destructive mt-1">{item.erro_mensagem}</p>
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
                  <TableCell className="text-right">
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
