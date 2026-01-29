import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUFMS } from "@/contexts/UFMSContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  Area,
  AreaChart
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_COLORS: Record<string, string> = {
  ASSINADO: "#22c55e",
  DISPONIVEL: "#3b82f6",
  PROCESSO: "#f59e0b",
  CANCELADO: "#ef4444",
  DESATIVADO: "#6b7280",
  DEVOLVIDO: "#8b5cf6",
  INTERDITADO: "#dc2626",
};

const STATUS_LABELS: Record<string, string> = {
  ASSINADO: "Assinado",
  DISPONIVEL: "Disponível",
  PROCESSO: "Em Processo",
  CANCELADO: "Cancelado",
  DESATIVADO: "Desativado",
  DEVOLVIDO: "Devolvido",
  INTERDITADO: "Interditado",
};

export function DashboardCharts() {
  const { taxaCondominio, taxaAluguelM2 } = useUFMS();

  // Fetch box data for charts
  const { data: boxData, isLoading } = useQuery({
    queryKey: ["dashboard-charts-boxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("status, area_m2, created_at, setor_id, setores(nome)");
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch extraction history for monthly evolution
  const { data: extractionData } = useQuery({
    queryKey: ["dashboard-extractions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("extracoes_mensais")
        .select("*")
        .order("mes_referencia", { ascending: true })
        .limit(12);
      
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-[250px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Process data for occupancy pie chart
  const statusCounts: Record<string, number> = {};
  boxData?.forEach(box => {
    statusCounts[box.status] = (statusCounts[box.status] || 0) + 1;
  });

  const occupancyData = Object.entries(statusCounts).map(([status, count]) => ({
    name: STATUS_LABELS[status] || status,
    value: count,
    color: STATUS_COLORS[status] || "#6b7280",
  }));

  // Process data for sector distribution
  const sectorCounts: Record<string, { total: number; ocupados: number; area: number }> = {};
  boxData?.forEach(box => {
    const sectorName = (box.setores as any)?.nome || "Sem Setor";
    if (!sectorCounts[sectorName]) {
      sectorCounts[sectorName] = { total: 0, ocupados: 0, area: 0 };
    }
    sectorCounts[sectorName].total++;
    if (box.status === "ASSINADO") sectorCounts[sectorName].ocupados++;
    sectorCounts[sectorName].area += Number(box.area_m2) || 0;
  });

  const sectorData = Object.entries(sectorCounts)
    .map(([name, data]) => ({
      name: name.length > 15 ? name.substring(0, 15) + "..." : name,
      total: data.total,
      ocupados: data.ocupados,
      disponiveis: data.total - data.ocupados,
    }))
    .slice(0, 8);

  // Process monthly projection data
  const monthlyProjection = [];
  const currentDate = new Date();
  for (let i = 5; i >= 0; i--) {
    const month = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const monthName = month.toLocaleDateString('pt-BR', { month: 'short' });
    
    // Find extraction for this month if exists
    const extraction = extractionData?.find(e => {
      const extDate = new Date(e.mes_referencia);
      return extDate.getMonth() === month.getMonth() && 
             extDate.getFullYear() === month.getFullYear();
    });

    if (extraction) {
      monthlyProjection.push({
        month: monthName,
        condominio: extraction.valor_total_condominio || 0,
        aluguel: extraction.valor_total_aluguel || 0,
        multas: extraction.valor_total_multas || 0,
      });
    } else {
      // Use projected values for months without extraction
      const ocupados = boxData?.filter(b => b.status === "ASSINADO").length || 0;
      const areaTotal = boxData?.filter(b => b.status === "ASSINADO")
        .reduce((sum, b) => sum + (Number(b.area_m2) || 0), 0) || 0;
      
      monthlyProjection.push({
        month: monthName,
        condominio: ocupados * taxaCondominio,
        aluguel: areaTotal * taxaAluguelM2,
        multas: 0,
      });
    }
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border rounded-lg shadow-lg p-3">
          <p className="font-medium">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value.toLocaleString('pt-BR', { 
                style: 'currency', 
                currency: 'BRL' 
              })}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Occupancy Pie Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ocupação por Status</CardTitle>
          <CardDescription>Distribuição atual dos boxes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={occupancyData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {occupancyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-4">
            {occupancyData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {entry.name}: {entry.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Sector Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Boxes por Setor</CardTitle>
          <CardDescription>Ocupados vs Disponíveis</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectorData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="ocupados" name="Ocupados" fill="#22c55e" stackId="a" />
                <Bar dataKey="disponiveis" name="Disponíveis" fill="#3b82f6" stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Financial Projection */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-lg">Evolução Financeira Mensal</CardTitle>
          <CardDescription>Projeção de receitas por tipo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyProjection}>
                <defs>
                  <linearGradient id="colorCondominio" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorAluguel" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorMultas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis 
                  tickFormatter={(value) => 
                    value.toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL',
                      notation: 'compact',
                      maximumFractionDigits: 0
                    })
                  }
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="condominio" 
                  name="Condomínio"
                  stroke="#22c55e" 
                  fillOpacity={1} 
                  fill="url(#colorCondominio)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="aluguel" 
                  name="Aluguel"
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorAluguel)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="multas" 
                  name="Multas"
                  stroke="#f59e0b" 
                  fillOpacity={1} 
                  fill="url(#colorMultas)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
