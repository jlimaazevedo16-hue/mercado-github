import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, TrendingUp, AlertTriangle, Building2, Receipt, Wallet } from "lucide-react";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUFMS } from "@/contexts/UFMSContext";
import { ReceitasOperacionaisTab } from "@/components/financeiro/ReceitasOperacionaisTab";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export const FinancialDashboard = () => {
  const [activeTab, setActiveTab] = useState("fixas");
  // Use global UFMS context for real-time updates
  const { ufmsValor, fatorCondominio, fatorAluguel, taxaCondominio, isLoading: ufmsLoading } = useUFMS();

  // Fetch boxes with area, custom billing value, and sector info
  const { data: boxes = [] } = useQuery({
    queryKey: ['financial-boxes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxes')
        .select('id, codigo, setor, setor_id, area_m2, status, responsavel_id, valor_cobranca_customizado, setores(id, nome, valor_cobranca_padrao)');
      if (error) throw error;
      return data || [];
    }
  });

  // Minimum billing value
  const VALOR_MINIMO = 50;

  // Fetch pending fines from PADs
  const { data: pads = [] } = useQuery({
    queryKey: ['financial-pads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pads')
        .select('id, valor_multa, status, box_id, created_at')
        .neq('status', 'arquivado');
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch extractions history
  const { data: extracoes = [] } = useQuery({
    queryKey: ['financial-extracoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('extracoes_mensais')
        .select('*')
        .order('mes_referencia', { ascending: false })
        .limit(12);
      if (error) throw error;
      return data || [];
    }
  });

  // Calculate totals: custom value > (area × valor_m2 do setor) > R$ 50 mínimo
  const boxesAtivos = boxes.filter(b => b.status === 'ASSINADO');
  const totalAreaM2 = boxesAtivos.reduce((acc, b) => acc + Number(b.area_m2 || 0), 0);
  
  // Calculate per-box revenue: custom value > (m² × valor/m²) > R$ 50 minimum
  const calcularReceitaBox = (box: typeof boxes[0]) => {
    // 1. Se tem valor customizado no box, usa ele (mínimo R$ 50)
    if (box.valor_cobranca_customizado != null && box.valor_cobranca_customizado > 0) {
      return Math.max(VALOR_MINIMO, Number(box.valor_cobranca_customizado));
    }
    // 2. Calcula: área × valor/m² do setor
    const area = Number(box.area_m2 || 0);
    const valorPorM2 = Number((box as any)?.setores?.valor_cobranca_padrao || 5);
    const valorCalculado = area * valorPorM2;
    // 3. Aplica mínimo de R$ 50
    return Math.max(VALOR_MINIMO, valorCalculado);
  };

  // Separate calculations for display
  const boxesComValorCustomizado = boxesAtivos.filter(b => b.valor_cobranca_customizado != null && b.valor_cobranca_customizado > 0);
  const boxesSemValorCustomizado = boxesAtivos.filter(b => b.valor_cobranca_customizado == null || b.valor_cobranca_customizado <= 0);
  
  const totalValoresCustomizados = boxesComValorCustomizado.reduce((acc, b) => acc + Math.max(VALOR_MINIMO, Number(b.valor_cobranca_customizado || 0)), 0);
  const totalValoresSetor = boxesSemValorCustomizado.reduce((acc, b) => {
    const area = Number(b.area_m2 || 0);
    const valorPorM2 = Number((b as any)?.setores?.valor_cobranca_padrao || 5);
    return acc + Math.max(VALOR_MINIMO, area * valorPorM2);
  }, 0);
  const totalReceitaMensal = totalValoresCustomizados + totalValoresSetor;

  // Calculate pending fines
  const totalMultasPendentes = pads
    .filter(p => p.status !== 'arquivado')
    .reduce((acc, p) => acc + Number(p.valor_multa || 0), 0);

  // Revenue by sector (using real billing values)
  const receitaPorSetor = boxesAtivos.reduce((acc, box) => {
    const setor = box.setor || 'Não definido';
    const receita = calcularReceitaBox(box);
    acc[setor] = (acc[setor] || 0) + receita;
    return acc;
  }, {} as Record<string, number>);

  const dadosSetor = Object.entries(receitaPorSetor).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2))
  }));

  // Monthly evolution from extractions
  const dadosMensais = extracoes
    .slice(0, 6)
    .reverse()
    .map(ext => ({
      mes: format(new Date(ext.mes_referencia), 'MMM/yy', { locale: ptBR }),
      Condomínio: Number(ext.valor_total_condominio || 0),
      Aluguel: Number(ext.valor_total_aluguel || 0),
      Multas: Number(ext.valor_total_multas || 0)
    }));

  // If no extractions, generate projected data based on current billing
  const dadosMensaisExibir = dadosMensais.length > 0 ? dadosMensais : 
    Array.from({ length: 6 }, (_, i) => {
      const mes = subMonths(new Date(), 5 - i);
      return {
        mes: format(mes, 'MMM/yy', { locale: ptBR }),
        Condomínio: totalValoresSetor,
        Aluguel: totalValoresCustomizados,
        Multas: 0
      };
    });

  // Delinquency by status
  const inadimplenciaPorStatus = pads.reduce((acc, pad) => {
    const status = pad.status || 'Pendente';
    acc[status] = (acc[status] || 0) + Number(pad.valor_multa || 0);
    return acc;
  }, {} as Record<string, number>);

  const dadosInadimplencia = Object.entries(inadimplenciaPorStatus).map(([name, value]) => ({
    name: name === 'autuacao' ? 'Autuação' :
          name === 'defesa' ? 'Em Defesa' :
          name === 'julgamento' ? 'Julgamento' :
          name === 'recurso' ? 'Recurso' :
          name === 'decisao_final' ? 'Decisão Final' : name,
    value: Number(value.toFixed(2))
  }));

  // Boxes with pending fines
  const boxesComMulta = pads.filter(p => p.valor_multa && p.valor_multa > 0).length;
  const percentualInadimplencia = boxesAtivos.length > 0 
    ? ((boxesComMulta / boxesAtivos.length) * 100).toFixed(1) 
    : '0';

  if (ufmsLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="fixas" className="gap-2">
            <Wallet className="h-4 w-4" />
            Receitas Fixas
          </TabsTrigger>
          <TabsTrigger value="operacionais" className="gap-2">
            <Receipt className="h-4 w-4" />
            Receitas Operacionais
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fixas" className="mt-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita Mensal Projetada</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  R$ {totalReceitaMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {boxesComValorCustomizado.length > 0 
                    ? `${boxesComValorCustomizado.length} box(es) com valor diferenciado`
                    : 'Condomínio + Aluguel'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Receita por Setor</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {totalValoresSetor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {boxesSemValorCustomizado.length} boxes usando valor do setor
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Valores Diferenciados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R$ {totalValoresCustomizados.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {boxesComValorCustomizado.length} boxes com valor fixo
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Multas Pendentes</CardTitle>
                <AlertTriangle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">
                  R$ {totalMultasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-muted-foreground">{percentualInadimplencia}% dos boxes</p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Revenue by Sector */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Receita por Setor</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosSetor.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={dadosSetor}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={100}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {dadosSetor.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Nenhum dado disponível
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Delinquency by Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Inadimplência por Status do PAD</CardTitle>
              </CardHeader>
              <CardContent>
                {dadosInadimplencia.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={dadosInadimplencia} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => `R$ ${value}`} />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                      <Bar dataKey="value" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                    Nenhuma multa pendente
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Monthly Evolution Chart */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">Evolução Mensal de Receita</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={dadosMensaisExibir}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />
                  <Legend />
                  <Bar dataKey="Condomínio" fill="#0088FE" stackId="a" />
                  <Bar dataKey="Aluguel" fill="#00C49F" stackId="a" />
                  <Bar dataKey="Multas" fill="#FF8042" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Configuration Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Parâmetros de Cálculo Atuais</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Valor UFMS</p>
                  <p className="text-xl font-bold">R$ {ufmsValor.toLocaleString('pt-BR', { minimumFractionDigits: 4 })}</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fator Condomínio</p>
                  <p className="text-xl font-bold">{fatorCondominio}x</p>
                  <p className="text-xs text-muted-foreground">= R$ {taxaCondominio.toFixed(2)}/box</p>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Fator Aluguel</p>
                  <p className="text-xl font-bold">{fatorAluguel}x</p>
                  <p className="text-xs text-muted-foreground">= R$ {(ufmsValor * fatorAluguel).toFixed(2)}/m²</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operacionais" className="mt-6">
          <ReceitasOperacionaisTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
