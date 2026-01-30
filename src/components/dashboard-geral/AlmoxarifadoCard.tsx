import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Warehouse, Package, AlertTriangle, ArrowUpRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function AlmoxarifadoCard() {
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-almoxarifado-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, descricao, qtd_atual, estoque_minimo");
      
      if (error) throw error;

      const totalItems = data?.length || 0;
      const lowStockItems = data?.filter(
        item => item.qtd_atual !== null && 
                item.estoque_minimo !== null && 
                item.qtd_atual <= item.estoque_minimo
      ).length || 0;
      
      const totalStock = data?.reduce((sum, item) => sum + (item.qtd_atual || 0), 0) || 0;

      return {
        totalItems,
        lowStockItems,
        totalStock,
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
          <Warehouse className="h-5 w-5 text-primary" />
          Almoxarifado
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate("/almoxarifado")}>
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Itens cadastrados</span>
            </div>
            <span className="text-lg font-semibold">{stats?.totalItems || 0}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total em estoque</span>
            </div>
            <span className="text-lg font-semibold">{stats?.totalStock || 0}</span>
          </div>

          {(stats?.lowStockItems || 0) > 0 && (
            <div className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">Estoque baixo</span>
              </div>
              <span className="text-lg font-bold text-destructive">{stats?.lowStockItems}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
