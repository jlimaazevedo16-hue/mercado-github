import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3, Loader2, Download, TrendingUp, CheckCircle, Eye, Send, Calendar, Building } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export const WhatsAppRelatorios = () => {
  const [periodo, setPeriodo] = useState("7");

  const startDate = periodo === "30" 
    ? startOfMonth(new Date()) 
    : subDays(new Date(), parseInt(periodo));

  const { data: stats, isLoading } = useQuery({
    queryKey: ["whatsapp-stats", periodo],
    queryFn: async () => {
      // Get sent messages
      const { data: logs, error: logsError } = await supabase
        .from("whatsapp_logs")
        .select("status, status_entrega, created_at")
        .gte("created_at", startDate.toISOString());

      if (logsError) throw logsError;

      // Get received messages
      const { data: recebidas, error: recebidasError } = await supabase
        .from("whatsapp_recebidas")
        .select("recebida_em")
        .gte("recebida_em", startDate.toISOString());

      if (recebidasError) throw recebidasError;

      // Get top notified boxes
      const { data: topBoxes, error: boxesError } = await supabase
        .from("whatsapp_logs")
        .select(`
          destinatario_telefone,
          whatsapp_queue!inner (
            boxes (codigo, boxe)
          )
        `)
        .gte("created_at", startDate.toISOString())
        .not("whatsapp_queue.box_id", "is", null)
        .limit(100);

      // Calculate stats
      const totalEnviadas = logs?.length || 0;
      const totalRecebidas = recebidas?.length || 0;
      const entregues = logs?.filter(l => l.status_entrega === "entregue" || l.status_entrega === "lido").length || 0;
      const lidas = logs?.filter(l => l.status_entrega === "lido").length || 0;
      const erros = logs?.filter(l => l.status === "erro").length || 0;

      const taxaEntrega = totalEnviadas > 0 ? ((entregues / totalEnviadas) * 100).toFixed(1) : "0";
      const taxaLeitura = entregues > 0 ? ((lidas / entregues) * 100).toFixed(1) : "0";

      // Group by day for chart
      const dailyData: Record<string, { enviadas: number; recebidas: number }> = {};
      logs?.forEach(log => {
        const day = format(new Date(log.created_at), "dd/MM");
        if (!dailyData[day]) dailyData[day] = { enviadas: 0, recebidas: 0 };
        dailyData[day].enviadas++;
      });
      recebidas?.forEach(msg => {
        const day = format(new Date(msg.recebida_em), "dd/MM");
        if (!dailyData[day]) dailyData[day] = { enviadas: 0, recebidas: 0 };
        dailyData[day].recebidas++;
      });

      const chartData = Object.entries(dailyData)
        .map(([dia, data]) => ({ dia, ...data }))
        .sort((a, b) => a.dia.localeCompare(b.dia));

      // Status distribution for pie chart
      const statusData = [
        { name: "Enviado", value: totalEnviadas - entregues - erros, color: "#3b82f6" },
        { name: "Entregue", value: entregues - lidas, color: "#22c55e" },
        { name: "Lido", value: lidas, color: "#06b6d4" },
        { name: "Erro", value: erros, color: "#ef4444" },
      ].filter(s => s.value > 0);

      // Top boxes
      const boxCount: Record<string, { codigo: string; count: number }> = {};
      topBoxes?.forEach((log: any) => {
        const box = log.whatsapp_queue?.boxes;
        if (box?.codigo) {
          if (!boxCount[box.codigo]) boxCount[box.codigo] = { codigo: box.codigo, count: 0 };
          boxCount[box.codigo].count++;
        }
      });
      const topBoxesList = Object.values(boxCount)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      return {
        totalEnviadas,
        totalRecebidas,
        entregues,
        lidas,
        erros,
        taxaEntrega,
        taxaLeitura,
        chartData,
        statusData,
        topBoxesList,
      };
    },
  });

  const exportCSV = () => {
    if (!stats?.chartData) return;

    const headers = ["Dia", "Enviadas", "Recebidas"];
    const rows = stats.chartData.map(d => [d.dia, d.enviadas, d.recebidas]);
    
    const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-relatorio-${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Relatórios WhatsApp
              </CardTitle>
              <CardDescription>
                Métricas e indicadores de desempenho
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Este mês</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={exportCSV}>
                <Download className="h-4 w-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalEnviadas || 0}</p>
                    <p className="text-xs text-muted-foreground">Enviadas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.taxaEntrega}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de Entrega</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-cyan-100 dark:bg-cyan-900 rounded-lg">
                    <Eye className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.taxaLeitura}%</p>
                    <p className="text-xs text-muted-foreground">Taxa de Leitura</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalRecebidas || 0}</p>
                    <p className="text-xs text-muted-foreground">Recebidas</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Mensagens por Dia
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.chartData && stats.chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={stats.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dia" fontSize={12} />
                      <YAxis fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="enviadas" fill="#3b82f6" name="Enviadas" />
                      <Bar dataKey="recebidas" fill="#22c55e" name="Recebidas" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sem dados no período
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Distribuição de Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.statusData && stats.statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={stats.statusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                      >
                        {stats.statusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sem dados no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Top Boxes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Building className="h-4 w-4" />
                Boxes Mais Notificados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.topBoxesList && stats.topBoxesList.length > 0 ? (
                <div className="space-y-3">
                  {stats.topBoxesList.map((box, i) => (
                    <div key={box.codigo} className="flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground w-6">{i + 1}</span>
                      <div className="flex-1 bg-muted rounded-full h-8 relative overflow-hidden">
                        <div 
                          className="absolute inset-y-0 left-0 bg-primary/20 rounded-full"
                          style={{ width: `${(box.count / stats.topBoxesList[0].count) * 100}%` }}
                        />
                        <div className="absolute inset-0 flex items-center px-3">
                          <span className="font-medium">{box.codigo}</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium w-12 text-right">{box.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  Sem dados de boxes no período
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
