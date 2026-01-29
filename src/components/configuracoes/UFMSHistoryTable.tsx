import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { History } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UFMSHistorico {
  id: string;
  ufms_valor: number;
  fator_condominio: number;
  fator_aluguel: number;
  data_inicio_vigencia: string;
  data_fim_vigencia: string | null;
  created_at: string;
}

export function UFMSHistoryTable() {
  const { data: historico, isLoading } = useQuery({
    queryKey: ["ufms-historico"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ufms_historico")
        .select("*")
        .order("data_inicio_vigencia", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as UFMSHistorico[];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!historico || historico.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </CardTitle>
          <CardDescription>
            Registro de todas as alterações na UFMS para auditoria
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Nenhum histórico registrado ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <History className="h-5 w-5" />
          Histórico de Alterações
        </CardTitle>
        <CardDescription>
          Registro de todas as alterações na UFMS para auditoria
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>UFMS</TableHead>
              <TableHead>Fator Cond.</TableHead>
              <TableHead>Fator Alug.</TableHead>
              <TableHead>Início Vigência</TableHead>
              <TableHead>Fim Vigência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  {item.data_fim_vigencia === null ? (
                    <Badge className="bg-green-500 hover:bg-green-600">Vigente</Badge>
                  ) : (
                    <Badge variant="secondary">Encerrado</Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono">
                  R$ {Number(item.ufms_valor).toFixed(4)}
                </TableCell>
                <TableCell className="font-mono">
                  {Number(item.fator_condominio).toFixed(2)}
                </TableCell>
                <TableCell className="font-mono">
                  {Number(item.fator_aluguel).toFixed(2)}
                </TableCell>
                <TableCell>
                  {format(new Date(item.data_inicio_vigencia), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </TableCell>
                <TableCell>
                  {item.data_fim_vigencia 
                    ? format(new Date(item.data_fim_vigencia), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "-"
                  }
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
