import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUFMS } from "@/contexts/UFMSContext";
import { Card, CardContent } from "@/components/ui/card";
import { 
  LayoutGrid, 
  Users, 
  DollarSign, 
  TrendingUp,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface BoxStats {
  total: number;
  assinado: number;
  disponivel: number;
  processo: number;
  outros: number;
  totalArea: number;
}

interface ResponsavelStats {
  total: number;
  ativos: number;
}

export function DashboardStats() {
  const { taxaCondominio, taxaAluguelM2, isLoading: ufmsLoading } = useUFMS();

  // Fetch box statistics
  const { data: boxStats, isLoading: boxesLoading } = useQuery({
    queryKey: ["dashboard-box-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("status, area_m2");
      
      if (error) throw error;

      const stats: BoxStats = {
        total: data?.length || 0,
        assinado: 0,
        disponivel: 0,
        processo: 0,
        outros: 0,
        totalArea: 0,
      };

      data?.forEach(box => {
        if (box.status === "ASSINADO") stats.assinado++;
        else if (box.status === "DISPONIVEL") stats.disponivel++;
        else if (box.status === "PROCESSO") stats.processo++;
        else stats.outros++;
        
        if (box.area_m2) stats.totalArea += Number(box.area_m2);
      });

      return stats;
    },
  });

  // Fetch responsavel statistics
  const { data: responsavelStats, isLoading: responsaveisLoading } = useQuery({
    queryKey: ["dashboard-responsavel-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("status");
      
      if (error) throw error;

      const stats: ResponsavelStats = {
        total: data?.length || 0,
        ativos: data?.filter(r => r.status === "ATIVO").length || 0,
      };

      return stats;
    },
  });

  const isLoading = boxesLoading || responsaveisLoading || ufmsLoading;

  // Calculate projected revenue
  const receitaCondominioProjetada = (boxStats?.assinado || 0) * taxaCondominio;
  const receitaAluguelProjetada = (boxStats?.totalArea || 0) * taxaAluguelM2;
  const receitaTotalProjetada = receitaCondominioProjetada + receitaAluguelProjetada;

  // Calculate occupancy rate
  const taxaOcupacao = boxStats?.total 
    ? ((boxStats.assinado / boxStats.total) * 100).toFixed(1)
    : "0";

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Boxes</p>
                <p className="text-3xl font-bold">{boxStats?.total || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {boxStats?.totalArea.toFixed(0)} m² de área total
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <LayoutGrid className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Taxa de Ocupação</p>
                <p className="text-3xl font-bold">{taxaOcupacao}%</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {boxStats?.assinado} boxes ocupados
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Responsáveis Ativos</p>
                <p className="text-3xl font-bold">{responsavelStats?.ativos || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {responsavelStats?.total || 0} cadastrados
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Receita Projetada</p>
                <p className="text-3xl font-bold">
                  {receitaTotalProjetada.toLocaleString('pt-BR', { 
                    style: 'currency', 
                    currency: 'BRL',
                    maximumFractionDigits: 0 
                  })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">mensal</p>
              </div>
              <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boxStats?.assinado || 0}</p>
              <p className="text-xs text-muted-foreground">Assinados</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boxStats?.disponivel || 0}</p>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boxStats?.processo || 0}</p>
              <p className="text-xs text-muted-foreground">Em Processo</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <XCircle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{boxStats?.outros || 0}</p>
              <p className="text-xs text-muted-foreground">Outros</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
