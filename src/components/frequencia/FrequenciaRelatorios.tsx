import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileDown, TrendingUp, Users } from "lucide-react";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLORS = ['#22c55e', '#ef4444', '#f59e0b'];

export const FrequenciaRelatorios = () => {
  const [periodo, setPeriodo] = useState('6');

  const { data: reunioes = [] } = useQuery({
    queryKey: ['reunioes-relatorio'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reunioes')
        .select('*')
        .eq('status', 'realizada')
        .order('data_evento', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  const { data: presencas = [] } = useQuery({
    queryKey: ['todas-presencas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reuniao_presencas')
        .select('*, responsaveis(nome), reunioes(titulo, data_evento, tipo)');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['responsaveis-freq'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsaveis')
        .select('id, nome, status')
        .eq('status', 'ATIVO')
        .order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  // Filter by period
  const dataLimite = subMonths(new Date(), parseInt(periodo));
  const reunioesNoPeriodo = reunioes.filter(r => new Date(r.data_evento) >= dataLimite);

  // Calculate frequency per responsible
  const frequenciaPorResponsavel = responsaveis.map(resp => {
    const presencasResp = presencas.filter(
      p => p.responsavel_id === resp.id && 
      reunioesNoPeriodo.some(r => r.id === p.reuniao_id)
    );
    const totalPresente = presencasResp.filter(p => p.presente).length;
    const totalReunioes = reunioesNoPeriodo.length;
    const percentual = totalReunioes > 0 ? (totalPresente / totalReunioes) * 100 : 0;

    return {
      id: resp.id,
      nome: resp.nome,
      presencas: totalPresente,
      total: totalReunioes,
      percentual: percentual.toFixed(1)
    };
  }).sort((a, b) => parseFloat(b.percentual) - parseFloat(a.percentual));

  // Distribution chart data
  const distribuicao = [
    { name: 'Excelente (>80%)', value: frequenciaPorResponsavel.filter(f => parseFloat(f.percentual) > 80).length },
    { name: 'Regular (50-80%)', value: frequenciaPorResponsavel.filter(f => parseFloat(f.percentual) >= 50 && parseFloat(f.percentual) <= 80).length },
    { name: 'Baixa (<50%)', value: frequenciaPorResponsavel.filter(f => parseFloat(f.percentual) < 50).length }
  ];

  // Monthly evolution
  const evolucaoMensal = Array.from({ length: parseInt(periodo) }, (_, i) => {
    const mes = subMonths(new Date(), parseInt(periodo) - 1 - i);
    const inicio = startOfMonth(mes);
    const fim = endOfMonth(mes);
    
    const reunioesMes = reunioesNoPeriodo.filter(r => {
      const data = new Date(r.data_evento);
      return data >= inicio && data <= fim;
    });

    const presencasMes = presencas.filter(p => 
      reunioesMes.some(r => r.id === p.reuniao_id) && p.presente
    );

    const totalPossivel = reunioesMes.length * responsaveis.length;
    const percentual = totalPossivel > 0 ? (presencasMes.length / totalPossivel) * 100 : 0;

    return {
      mes: format(mes, 'MMM/yy', { locale: ptBR }),
      frequencia: percentual.toFixed(1),
      reunioes: reunioesMes.length
    };
  });

  const exportarPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Relatório de Frequência', 14, 20);
    doc.setFontSize(10);
    doc.text(`Período: Últimos ${periodo} meses`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

    // Summary
    const totalReunioes = reunioesNoPeriodo.length;
    const mediaFrequencia = frequenciaPorResponsavel.length > 0
      ? (frequenciaPorResponsavel.reduce((acc, f) => acc + parseFloat(f.percentual), 0) / frequenciaPorResponsavel.length).toFixed(1)
      : '0';

    doc.setFontSize(12);
    doc.text('Resumo:', 14, 44);
    doc.setFontSize(10);
    doc.text(`Total de Reuniões/Assembleias: ${totalReunioes}`, 14, 52);
    doc.text(`Total de Responsáveis: ${responsaveis.length}`, 14, 58);
    doc.text(`Média Geral de Frequência: ${mediaFrequencia}%`, 14, 64);

    // Table
    autoTable(doc, {
      startY: 74,
      head: [['Responsável', 'Presenças', 'Total', '% Frequência']],
      body: frequenciaPorResponsavel.map(f => [
        f.nome,
        f.presencas.toString(),
        f.total.toString(),
        `${f.percentual}%`
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(`relatorio-frequencia-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">Período:</span>
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={exportarPDF}>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Eventos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reunioesNoPeriodo.length}</div>
            <p className="text-xs text-muted-foreground">Reuniões/Assembleias realizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média de Frequência</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {frequenciaPorResponsavel.length > 0
                ? (frequenciaPorResponsavel.reduce((acc, f) => acc + parseFloat(f.percentual), 0) / frequenciaPorResponsavel.length).toFixed(1)
                : '0'}%
            </div>
            <p className="text-xs text-muted-foreground">Presença média geral</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Responsáveis Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{responsaveis.length}</div>
            <p className="text-xs text-muted-foreground">Participantes monitorados</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Distribuição de Frequência</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={distribuicao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {distribuicao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={evolucaoMensal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(value) => `${value}%`} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="frequencia" fill="#3b82f6" name="Frequência" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Ranking Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ranking de Frequência</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="text-center">Presenças</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Frequência</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {frequenciaPorResponsavel.slice(0, 20).map((freq, index) => (
                <TableRow key={freq.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>{freq.nome}</TableCell>
                  <TableCell className="text-center">{freq.presencas}</TableCell>
                  <TableCell className="text-center">{freq.total}</TableCell>
                  <TableCell className="text-center">
                    <span className={
                      parseFloat(freq.percentual) > 80 ? 'text-green-600 font-medium' :
                      parseFloat(freq.percentual) >= 50 ? 'text-yellow-600' : 'text-red-600'
                    }>
                      {freq.percentual}%
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
