import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, Package, TrendingUp, BarChart3, Fish, Beef, Apple } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const SEGMENT_ICONS = {
  'Pescado': Fish,
  'Carne': Beef,
  'Hortifruti': Apple,
};

export const MOCDashboard = () => {
  const { data: registros = [] } = useQuery({
    queryKey: ['moc-registros-dashboard'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moc_registros')
        .select(`
          *,
          moc_produtos (nome_popular, nome_cientifico, segmento, familia),
          boxes (codigo, boxe),
          responsaveis (nome)
        `)
        .order('data_coleta', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  // Calcular estatísticas
  const currentMonth = new Date();
  const registrosDoMes = registros.filter(r => {
    const dataColeta = new Date(r.data_coleta);
    return dataColeta >= startOfMonth(currentMonth) && dataColeta <= endOfMonth(currentMonth);
  });

  const totalKgMes = registrosDoMes.reduce((acc, r) => acc + Number(r.quantidade_kg || 0), 0);
  const totalRegistros = registros.length;
  
  // Agrupar por segmento
  const porSegmento = registros.reduce((acc, r) => {
    const segmento = r.moc_produtos?.segmento || 'Outro';
    acc[segmento] = (acc[segmento] || 0) + Number(r.quantidade_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  const dadosSegmento = Object.entries(porSegmento).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));

  // Agrupar por destinação
  const porDestinacao = registros.reduce((acc, r) => {
    const dest = r.destinacao || 'Não informado';
    acc[dest] = (acc[dest] || 0) + Number(r.quantidade_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  const dadosDestinacao = Object.entries(porDestinacao).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));

  // Últimos 6 meses
  const ultimosMeses = Array.from({ length: 6 }, (_, i) => {
    const mes = subMonths(new Date(), 5 - i);
    return {
      mes: format(mes, 'MMM/yy', { locale: ptBR }),
      inicio: startOfMonth(mes),
      fim: endOfMonth(mes)
    };
  });

  const dadosMensais = ultimosMeses.map(({ mes, inicio, fim }) => {
    const registrosMes = registros.filter(r => {
      const data = new Date(r.data_coleta);
      return data >= inicio && data <= fim;
    });
    
    const pescado = registrosMes.filter(r => r.moc_produtos?.segmento === 'Pescado')
      .reduce((acc, r) => acc + Number(r.quantidade_kg || 0), 0);
    const carne = registrosMes.filter(r => r.moc_produtos?.segmento === 'Carne')
      .reduce((acc, r) => acc + Number(r.quantidade_kg || 0), 0);
    const hortifruti = registrosMes.filter(r => r.moc_produtos?.segmento === 'Hortifruti')
      .reduce((acc, r) => acc + Number(r.quantidade_kg || 0), 0);

    return { mes, Pescado: pescado, Carne: carne, Hortifruti: hortifruti };
  });

  // Top 5 espécies
  const porEspecie = registros.reduce((acc, r) => {
    const especie = r.moc_produtos?.nome_popular || 'Desconhecido';
    acc[especie] = (acc[especie] || 0) + Number(r.quantidade_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  const topEspecies = Object.entries(porEspecie)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));

  return (
    <div className="space-y-6">
      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total (Mês)</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalKgMes.toFixed(2)} kg</div>
            <p className="text-xs text-muted-foreground">Biomassa comercializada</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Registros do Mês</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{registrosDoMes.length}</div>
            <p className="text-xs text-muted-foreground">Lançamentos este mês</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRegistros}</div>
            <p className="text-xs text-muted-foreground">Registros no sistema</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média por Registro</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalRegistros > 0 ? (registros.reduce((acc, r) => acc + Number(r.quantidade_kg || 0), 0) / totalRegistros).toFixed(2) : '0'} kg
            </div>
            <p className="text-xs text-muted-foreground">Quantidade média</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Volume por Segmento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Volume por Segmento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosSegmento}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosSegmento.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} kg`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Destinação */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Volume por Destinação</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosDestinacao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.substring(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#82ca9d"
                  dataKey="value"
                >
                  {dadosDestinacao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} kg`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Evolução Mensal */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal por Segmento (kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosMensais}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Pescado" fill="#0088FE" />
                <Bar dataKey="Carne" fill="#FF8042" />
                <Bar dataKey="Hortifruti" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Espécies */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Top 5 Produtos/Espécies Comercializadas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={topEspecies} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={120} />
              <Tooltip formatter={(value) => `${value} kg`} />
              <Bar dataKey="value" fill="#8884d8" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
