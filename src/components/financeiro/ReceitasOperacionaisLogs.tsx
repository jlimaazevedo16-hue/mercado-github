import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Loader2, FileText, User, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const acaoLabels: Record<string, { label: string; color: string }> = {
  criacao: { label: "Criação", color: "bg-green-100 text-green-700" },
  edicao: { label: "Edição", color: "bg-blue-100 text-blue-700" },
  bloqueio: { label: "Bloqueio", color: "bg-yellow-100 text-yellow-700" },
  ajuste: { label: "Ajuste", color: "bg-purple-100 text-purple-700" },
};

export function ReceitasOperacionaisLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["logs-receitas-operacionais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("logs_receitas_operacionais")
        .select(`
          *,
          receitas_operacionais (
            id,
            data_referencia,
            valor_bruto,
            tipos_receita (nome)
          )
        `)
        .order("data_hora", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch user profiles for display
  const userIds = [...new Set(logs.map(l => l.usuario_id).filter(Boolean))];
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-logs", userIds],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, nome")
        .in("user_id", userIds);
      if (error) throw error;
      return data;
    },
    enabled: userIds.length > 0,
  });

  const getUserName = (userId: string | null) => {
    if (!userId) return "Sistema";
    const profile = profiles.find(p => p.user_id === userId);
    return profile?.nome || "Usuário";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <History className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Histórico de Auditoria</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Registro imutável de todas as operações realizadas
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum registro de auditoria</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Receita</TableHead>
                  <TableHead>Detalhes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => {
                  const acaoInfo = acaoLabels[log.acao] || { label: log.acao, color: "bg-gray-100 text-gray-700" };
                  const receita = log.receitas_operacionais as any;

                  return (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {format(new Date(log.data_hora), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={acaoInfo.color}>
                          {acaoInfo.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{getUserName(log.usuario_id)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {receita ? (
                          <div className="text-sm">
                            <p className="font-medium">
                              R$ {Number(receita.valor_bruto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {receita.tipos_receita?.nome} - {format(new Date(receita.data_referencia), "dd/MM/yyyy")}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[300px]">
                        {log.acao === "edicao" && log.dados_anteriores && log.dados_novos ? (
                          <div className="text-xs">
                            <span className="text-muted-foreground">Alterações realizadas</span>
                          </div>
                        ) : log.acao === "criacao" ? (
                          <span className="text-xs text-green-600">Novo registro criado</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
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
  );
}
