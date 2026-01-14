import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, ArrowDownUp, TrendingUp, TrendingDown } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";

export const AlmoxarifadoDashboard = () => {
  const currentMonthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
  const currentMonthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");

  const { data: items } = useQuery({
    queryKey: ["inventory-items-dashboard"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, descricao, qtd_atual, estoque_minimo");
      if (error) throw error;
      return data;
    },
  });

  const { data: monthlyEntries } = useQuery({
    queryKey: ["inventory-entries-month", currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_entries")
        .select("qtd")
        .gte("data", currentMonthStart)
        .lte("data", currentMonthEnd);
      if (error) throw error;
      return data;
    },
  });

  const { data: monthlyExits } = useQuery({
    queryKey: ["inventory-exits-month", currentMonthStart, currentMonthEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_exits")
        .select("qtd")
        .gte("data", currentMonthStart)
        .lte("data", currentMonthEnd);
      if (error) throw error;
      return data;
    },
  });

  const totalItems = items?.length ?? 0;
  const lowStockItems = items?.filter(
    (item) => (item.qtd_atual ?? 0) < (item.estoque_minimo ?? 0) && (item.estoque_minimo ?? 0) > 0
  ).length ?? 0;

  const totalEntriesMonth = monthlyEntries?.reduce((sum, e) => sum + Number(e.qtd), 0) ?? 0;
  const totalExitsMonth = monthlyExits?.reduce((sum, e) => sum + Number(e.qtd), 0) ?? 0;
  const totalMovements = totalEntriesMonth + totalExitsMonth;

  const dashboardCards = [
    {
      title: "Total de Itens",
      value: totalItems,
      icon: Package,
      description: "Itens cadastrados",
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Estoque Baixo",
      value: lowStockItems,
      icon: AlertTriangle,
      description: "Abaixo do mínimo",
      color: lowStockItems > 0 ? "text-orange-600" : "text-green-600",
      bgColor: lowStockItems > 0 ? "bg-orange-100 dark:bg-orange-900/30" : "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Movimentações",
      value: totalMovements,
      icon: ArrowDownUp,
      description: "Este mês",
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      title: "Entradas",
      value: totalEntriesMonth,
      icon: TrendingUp,
      description: "Este mês",
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Saídas",
      value: totalExitsMonth,
      icon: TrendingDown,
      description: "Este mês",
      color: "text-red-600",
      bgColor: "bg-red-100 dark:bg-red-900/30",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      {dashboardCards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
