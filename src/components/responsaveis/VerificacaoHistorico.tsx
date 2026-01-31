import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle, Clock, AlertTriangle, Mail, RefreshCw, 
  History, Send, Loader2, ShieldCheck, Edit3
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useState } from "react";
import { useEmailDispatch } from "@/hooks/useEmailDispatch";

interface VerificacaoHistoricoProps {
  responsavelId: string;
  responsavelData: {
    nome: string;
    email?: string | null;
    telefone?: string | null;
    data_nascimento?: string | null;
    verificacao_status?: string | null;
    verificacao_data?: string | null;
  };
  boxes?: Array<{ codigo: string; setor?: string | null }>;
}

const acaoLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  email_enviado: { 
    label: 'E-mail Enviado', 
    icon: <Mail className="h-4 w-4" />, 
    color: 'bg-blue-100 text-blue-700' 
  },
  confirmado: { 
    label: 'Dados Confirmados', 
    icon: <CheckCircle className="h-4 w-4" />, 
    color: 'bg-green-100 text-green-700' 
  },
  correcao_solicitada: { 
    label: 'Correção Solicitada', 
    icon: <Edit3 className="h-4 w-4" />, 
    color: 'bg-orange-100 text-orange-700' 
  },
  dados_atualizados: { 
    label: 'Dados Atualizados', 
    icon: <RefreshCw className="h-4 w-4" />, 
    color: 'bg-purple-100 text-purple-700' 
  },
};

const statusLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pendente: { label: 'Pendente', variant: 'secondary' },
  confirmado: { label: 'Confirmado', variant: 'default' },
  pendente_correcao: { label: 'Aguardando Correção', variant: 'destructive' },
};

export function VerificacaoHistorico({ 
  responsavelId, 
  responsavelData,
  boxes = []
}: VerificacaoHistoricoProps) {
  const [isSending, setIsSending] = useState(false);
  const { dispatchVerificacaoDados } = useEmailDispatch();

  const { data: historico, isLoading, refetch } = useQuery({
    queryKey: ["verificacao-historico", responsavelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("verificacao_historico")
        .select("*")
        .eq("responsavel_id", responsavelId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const handleEnviarVerificacao = async () => {
    if (!responsavelData.email) {
      toast.error("Responsável não possui e-mail cadastrado");
      return;
    }

    setIsSending(true);

    try {
      // Generate verification links via edge function
      const { data: linksData, error: linksError } = await supabase.functions.invoke(
        'verificacao-cadastral',
        { body: { action: 'generate', responsavel_id: responsavelId } }
      );

      if (linksError || !linksData?.success) {
        throw new Error(linksData?.error || 'Erro ao gerar links');
      }

      const { link_confirmar, link_corrigir } = linksData.data;

      // Get box info
      const boxInfo = boxes.length > 0 ? boxes[0] : null;

      // Send verification email using dispatch service (with logging)
      const result = await dispatchVerificacaoDados({
        destinatario: responsavelData.email,
        destinatario_nome: responsavelData.nome,
        dados_cadastrais: {
          box: boxInfo?.codigo,
          setor: boxInfo?.setor || undefined,
          telefone: responsavelData.telefone || undefined,
          email: responsavelData.email,
          data_nascimento: responsavelData.data_nascimento 
            ? format(new Date(responsavelData.data_nascimento), 'dd/MM/yyyy') 
            : undefined,
        },
        link_confirmar,
        link_corrigir,
        responsavel_id: responsavelId,
        box_id: boxInfo ? undefined : undefined, // We don't have box_id here
      });

      if (result.success) {
        toast.success("E-mail de verificação enviado com sucesso!");
        refetch();
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Error sending verification:', error);
      toast.error(error.message || "Erro ao enviar e-mail de verificação");
    } finally {
      setIsSending(false);
    }
  };

  const currentStatus = responsavelData.verificacao_status || 'pendente';
  const statusInfo = statusLabels[currentStatus] || statusLabels.pendente;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg">Status da Verificação Cadastral</CardTitle>
            </div>
            <Badge variant={statusInfo.variant}>
              {statusInfo.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              {responsavelData.verificacao_data ? (
                <p className="text-sm text-muted-foreground">
                  Última verificação em{" "}
                  <strong>
                    {format(new Date(responsavelData.verificacao_data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </strong>
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhuma verificação realizada ainda
                </p>
              )}
            </div>

            <Button 
              onClick={handleEnviarVerificacao}
              disabled={isSending || !responsavelData.email}
            >
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar Verificação
                </>
              )}
            </Button>
          </div>

          {!responsavelData.email && (
            <Alert className="mt-4" variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Este responsável não possui e-mail cadastrado. Adicione um e-mail para enviar a verificação.
              </AlertDescription>
            </Alert>
          )}

          {currentStatus === 'pendente_correcao' && (
            <Alert className="mt-4">
              <Edit3 className="h-4 w-4" />
              <AlertDescription>
                O responsável solicitou correção dos dados cadastrais. Verifique o histórico para mais detalhes.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <div>
              <CardTitle className="text-lg">Histórico de Verificações</CardTitle>
              <CardDescription>
                Registro de todas as ações de verificação cadastral
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !historico || historico.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhuma verificação registrada</p>
              <p className="text-sm">
                Clique em "Enviar Verificação" para iniciar o processo
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Detalhes</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historico.map((item) => {
                  const acaoInfo = acaoLabels[item.acao] || { 
                    label: item.acao, 
                    icon: <Clock className="h-4 w-4" />, 
                    color: 'bg-gray-100 text-gray-700' 
                  };
                  const detalhes = item.detalhes as Record<string, any> | null;

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${acaoInfo.color}`}>
                          {acaoInfo.icon}
                          {acaoInfo.label}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {detalhes?.observacoes && (
                          <p className="text-sm text-muted-foreground truncate" title={detalhes.observacoes}>
                            {detalhes.observacoes}
                          </p>
                        )}
                        {detalhes?.expires_at && (
                          <p className="text-xs text-muted-foreground">
                            Expira em: {format(new Date(detalhes.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.ip_address || '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
