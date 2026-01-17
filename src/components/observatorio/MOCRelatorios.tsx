import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Filter, BarChart3 } from "lucide-react";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const MOCRelatorios = () => {
  const [periodo, setPeriodo] = useState("mensal");
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filtroSegmento, setFiltroSegmento] = useState("");
  const [filtroFamilia, setFiltroFamilia] = useState("");
  const [filtroDestinacao, setFiltroDestinacao] = useState("");

  const { data: registros = [] } = useQuery({
    queryKey: ['moc-registros-relatorio', dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moc_registros')
        .select(`
          *,
          moc_produtos (nome_popular, nome_cientifico, segmento, familia),
          boxes (codigo, boxe),
          responsaveis (nome)
        `)
        .gte('data_coleta', dataInicio)
        .lte('data_coleta', dataFim)
        .order('data_coleta', { ascending: false });
      
      if (error) throw error;
      return data || [];
    }
  });

  const { data: familias = [] } = useQuery({
    queryKey: ['moc-familias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moc_produtos')
        .select('familia')
        .not('familia', 'is', null);
      
      if (error) throw error;
      const uniqueFamilias = [...new Set(data?.map(p => p.familia).filter(Boolean))];
      return uniqueFamilias;
    }
  });

  // Aplicar filtros
  const registrosFiltrados = registros.filter(r => {
    const matchSegmento = !filtroSegmento || r.moc_produtos?.segmento === filtroSegmento;
    const matchFamilia = !filtroFamilia || r.moc_produtos?.familia === filtroFamilia;
    const matchDestinacao = !filtroDestinacao || r.destinacao === filtroDestinacao;
    return matchSegmento && matchFamilia && matchDestinacao;
  });

  // Calcular estatísticas
  const totalKg = registrosFiltrados.reduce((acc, r) => acc + Number(r.quantidade_kg || 0), 0);
  const totalRegistros = registrosFiltrados.length;

  // Agrupar por espécie
  const porEspecie = registrosFiltrados.reduce((acc, r) => {
    const especie = r.moc_produtos?.nome_popular || 'Desconhecido';
    acc[especie] = (acc[especie] || 0) + Number(r.quantidade_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  const dadosEspecie = Object.entries(porEspecie)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));

  // Agrupar por box (esforço de venda)
  const porBox = registrosFiltrados.reduce((acc, r) => {
    const box = r.boxes?.codigo || 'N/A';
    acc[box] = (acc[box] || 0) + Number(r.quantidade_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  const dadosBox = Object.entries(porBox)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));

  // Agrupar por estado do produto (para análise sanitária)
  const porEstado = registrosFiltrados.reduce((acc, r) => {
    const estado = r.estado_produto || 'N/A';
    acc[estado] = (acc[estado] || 0) + Number(r.quantidade_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  const dadosEstado = Object.entries(porEstado).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));

  // Destinação
  const porDestinacao = registrosFiltrados.reduce((acc, r) => {
    const dest = r.destinacao || 'N/A';
    acc[dest] = (acc[dest] || 0) + Number(r.quantidade_kg || 0);
    return acc;
  }, {} as Record<string, number>);

  const dadosDestinacao = Object.entries(porDestinacao).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));

  const handlePeriodoChange = (value: string) => {
    setPeriodo(value);
    const now = new Date();
    if (value === 'semanal') {
      setDataInicio(format(startOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd'));
      setDataFim(format(endOfWeek(now, { locale: ptBR }), 'yyyy-MM-dd'));
    } else if (value === 'mensal') {
      setDataInicio(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDataFim(format(endOfMonth(now), 'yyyy-MM-dd'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Análise
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <Label>Período</Label>
              <Select value={periodo} onValueChange={handlePeriodoChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value);
                  setPeriodo('personalizado');
                }}
              />
            </div>

            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value);
                  setPeriodo('personalizado');
                }}
              />
            </div>

            <div>
              <Label>Segmento</Label>
              <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="Pescado">Pescado</SelectItem>
                  <SelectItem value="Carne">Carne</SelectItem>
                  <SelectItem value="Hortifruti">Hortifruti</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Família Taxonômica</Label>
              <Select value={filtroFamilia} onValueChange={setFiltroFamilia}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  {familias.map(fam => (
                    <SelectItem key={fam} value={fam}>{fam}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Destinação</Label>
              <Select value={filtroDestinacao} onValueChange={setFiltroDestinacao}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="Revenda Local">Revenda Local</SelectItem>
                  <SelectItem value="Exportação">Exportação</SelectItem>
                  <SelectItem value="Consumidor Final">Consumidor Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalKg.toFixed(2)} kg</div>
            <p className="text-sm text-muted-foreground">Volume Total no Período</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{totalRegistros}</div>
            <p className="text-sm text-muted-foreground">Total de Registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {totalRegistros > 0 ? (totalKg / totalRegistros).toFixed(2) : '0'} kg
            </div>
            <p className="text-sm text-muted-foreground">Média por Registro</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Espécies */}
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Espécies/Produtos (kg)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosEspecie} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => `${value} kg`} />
                <Bar dataKey="value" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Esforço por Box */}
        <Card>
          <CardHeader>
            <CardTitle>Volume por Box (Esforço de Venda)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosBox} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={80} />
                <Tooltip formatter={(value) => `${value} kg`} />
                <Bar dataKey="value" fill="#00C49F" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Estado do Produto (Análise Sanitária) */}
        <Card>
          <CardHeader>
            <CardTitle>Volume por Estado do Produto (Análise Sanitária)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosEstado}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosEstado.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `${value} kg`} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Fluxo de Destinação */}
        <Card>
          <CardHeader>
            <CardTitle>Fluxo de Destinação</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={dadosDestinacao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name.substring(0, 12)}... ${(percent * 100).toFixed(0)}%`}
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
      </div>

      {/* Tabela Detalhada */}
      <Card>
        <CardHeader>
          <CardTitle>Registros Detalhados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Box</TableHead>
                  <TableHead>Feirante</TableHead>
                  <TableHead>Espécie</TableHead>
                  <TableHead>Científico</TableHead>
                  <TableHead>Qtd (kg)</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Destino</TableHead>
                  <TableHead>Origem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {registrosFiltrados.slice(0, 50).map(reg => (
                  <TableRow key={reg.id}>
                    <TableCell>{format(new Date(reg.data_coleta), 'dd/MM/yyyy')}</TableCell>
                    <TableCell>{reg.boxes?.codigo || '-'}</TableCell>
                    <TableCell>{reg.responsaveis?.nome || '-'}</TableCell>
                    <TableCell className="font-medium">{reg.moc_produtos?.nome_popular}</TableCell>
                    <TableCell className="italic text-muted-foreground text-xs">
                      {reg.moc_produtos?.nome_cientifico || '-'}
                    </TableCell>
                    <TableCell>{Number(reg.quantidade_kg).toFixed(2)}</TableCell>
                    <TableCell>{reg.estado_produto}</TableCell>
                    <TableCell>{reg.destinacao}</TableCell>
                    <TableCell className="text-xs">
                      {[reg.origem_municipio, reg.origem_comunidade, reg.origem_rio]
                        .filter(Boolean).join(', ') || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
