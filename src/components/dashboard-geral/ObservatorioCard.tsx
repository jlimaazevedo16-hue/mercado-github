import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Fish, Scale, ArrowUpRight, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ObservatorioCard() {
  const navigate = useNavigate();
  const today = new Date();
  const mesAtual = format(today, "MMMM 'de' yyyy", { locale: ptBR });

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-observatorio-stats"],
    queryFn: async () => {
      const startMonth = format(startOfMonth(today), "yyyy-MM-dd");
      const endMonth = format(endOfMonth(today), "yyyy-MM-dd");

      // Get total registered products
      const { count: totalProdutos } = await supabase
        .from("moc_produtos")
        .select("id", { count: "exact", head: true });

      // Get this month's records
      const { data: registrosMes, error } = await supabase
        .from("moc_registros")
        .select("quantidade_kg")
        .gte("data_coleta", startMonth)
        .lte("data_coleta", endMonth);

      if (error) throw error;

      const totalKgMes = registrosMes?.reduce((sum, r) => sum + (r.quantidade_kg || 0), 0) || 0;
      const totalRegistrosMes = registrosMes?.length || 0;

      return {
        totalProdutos: totalProdutos || 0,
        totalKgMes,
        totalRegistrosMes,
      };
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Observatório
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/observatorio")}>
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fish className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Produtos cadastrados</span>
            </div>
            <span className="text-lg font-semibold">{stats?.totalProdutos || 0}</span>
          </div>
          
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground capitalize">{mesAtual}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-muted-foreground">Registros</p>
                <p className="text-xl font-bold">{stats?.totalRegistrosMes || 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total (kg)</p>
                <p className="text-xl font-bold">
                  {stats?.totalKgMes?.toLocaleString('pt-BR', { maximumFractionDigits: 1 }) || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
