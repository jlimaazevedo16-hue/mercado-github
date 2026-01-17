import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Download, FileSpreadsheet, FileText, Database } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const MOCExportar = () => {
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [filtroSegmento, setFiltroSegmento] = useState("");
  const [incluirCientifico, setIncluirCientifico] = useState(true);
  const [incluirOrigem, setIncluirOrigem] = useState(true);

  const { data: registros = [], isLoading } = useQuery({
    queryKey: ['moc-registros-export', dataInicio, dataFim, filtroSegmento],
    queryFn: async () => {
      let query = supabase
        .from('moc_registros')
        .select(`
          *,
          moc_produtos (nome_popular, nome_cientifico, segmento, familia),
          boxes (codigo, boxe),
          responsaveis (nome, cpf)
        `)
        .gte('data_coleta', dataInicio)
        .lte('data_coleta', dataFim)
        .order('data_coleta', { ascending: true });
      
      if (filtroSegmento && filtroSegmento !== 'all') {
        query = query.eq('moc_produtos.segmento', filtroSegmento);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Filtrar se segmento foi selecionado
      if (filtroSegmento && filtroSegmento !== 'all') {
        return (data || []).filter(r => r.moc_produtos?.segmento === filtroSegmento);
      }
      return data || [];
    }
  });

  const exportarCSV = () => {
    if (registros.length === 0) {
      toast.error("Nenhum registro para exportar!");
      return;
    }

    const headers = [
      'data_coleta',
      'box_codigo',
      'feirante_nome',
      'feirante_cpf',
      'segmento',
      'nome_popular',
      ...(incluirCientifico ? ['nome_cientifico', 'familia'] : []),
      'quantidade_kg',
      'estado_produto',
      'destinacao',
      ...(incluirOrigem ? ['origem_municipio', 'origem_comunidade', 'origem_rio'] : []),
      'observacoes'
    ];

    const rows = registros.map(r => [
      r.data_coleta,
      r.boxes?.codigo || '',
      r.responsaveis?.nome || '',
      r.responsaveis?.cpf || '',
      r.moc_produtos?.segmento || '',
      r.moc_produtos?.nome_popular || '',
      ...(incluirCientifico ? [r.moc_produtos?.nome_cientifico || '', r.moc_produtos?.familia || ''] : []),
      r.quantidade_kg,
      r.estado_produto,
      r.destinacao,
      ...(incluirOrigem ? [r.origem_municipio || '', r.origem_comunidade || '', r.origem_rio || ''] : []),
      r.observacoes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `moc_dados_${dataInicio}_${dataFim}.csv`;
    link.click();

    toast.success(`Exportados ${registros.length} registros!`);
  };

  const exportarPDF = () => {
    if (registros.length === 0) {
      toast.error("Nenhum registro para exportar!");
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape' });
    
    // Cabeçalho
    doc.setFontSize(16);
    doc.text('Observatório de Comercialização - MOC', 14, 15);
    doc.setFontSize(10);
    doc.text(`Período: ${format(new Date(dataInicio), 'dd/MM/yyyy')} a ${format(new Date(dataFim), 'dd/MM/yyyy')}`, 14, 22);
    doc.text(`Total de registros: ${registros.length}`, 14, 28);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 34);

    const headers = [
      'Data',
      'Box',
      'Feirante',
      'Espécie',
      'Científico',
      'Qtd (kg)',
      'Estado',
      'Destino'
    ];

    const rows = registros.map(r => [
      format(new Date(r.data_coleta), 'dd/MM/yy'),
      r.boxes?.codigo || '-',
      (r.responsaveis?.nome || '-').substring(0, 15),
      r.moc_produtos?.nome_popular || '-',
      r.moc_produtos?.nome_cientifico || '-',
      Number(r.quantidade_kg).toFixed(2),
      r.estado_produto,
      r.destinacao.substring(0, 10)
    ]);

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 40,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`moc_relatorio_${dataInicio}_${dataFim}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const exportarKitPesquisa = () => {
    if (registros.length === 0) {
      toast.error("Nenhum registro para exportar!");
      return;
    }

    // Formato padronizado para softwares estatísticos (R, Python)
    const headers = [
      'date',
      'box_id',
      'seller_name',
      'seller_cpf',
      'segment',
      'common_name',
      'scientific_name',
      'family',
      'weight_kg',
      'product_state',
      'destination',
      'origin_municipality',
      'origin_community',
      'origin_river',
      'lat',
      'lon'
    ];

    const rows = registros.map(r => [
      r.data_coleta,
      r.boxes?.codigo || 'NA',
      r.responsaveis?.nome || 'NA',
      r.responsaveis?.cpf || 'NA',
      r.moc_produtos?.segmento || 'NA',
      r.moc_produtos?.nome_popular || 'NA',
      r.moc_produtos?.nome_cientifico || 'NA',
      r.moc_produtos?.familia || 'NA',
      r.quantidade_kg,
      r.estado_produto,
      r.destinacao.replace(' ', '_'),
      r.origem_municipio || 'NA',
      r.origem_comunidade || 'NA',
      r.origem_rio || 'NA',
      'NA', // lat - pode ser preenchido futuramente
      'NA'  // lon - pode ser preenchido futuramente
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        const str = String(cell);
        // Formato compatível com R/Python - sem aspas extras para NA
        if (str === 'NA') return 'NA';
        return `"${str.replace(/"/g, '""')}"`;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `moc_research_dataset_${dataInicio}_${dataFim}.csv`;
    link.click();

    toast.success(`Kit Pesquisa exportado com ${registros.length} registros!`);
  };

  return (
    <div className="space-y-6">
      {/* Configurações de Exportação */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Exportação</CardTitle>
          <CardDescription>
            Selecione o período e os filtros para exportar os dados de comercialização.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div>
              <Label>Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div>
              <Label>Segmento</Label>
              <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Pescado">Pescado</SelectItem>
                  <SelectItem value="Carne">Carne</SelectItem>
                  <SelectItem value="Hortifruti">Hortifruti</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-muted-foreground">
                {isLoading ? 'Carregando...' : `${registros.length} registros encontrados`}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="cientifico"
                checked={incluirCientifico}
                onCheckedChange={(checked) => setIncluirCientifico(!!checked)}
              />
              <Label htmlFor="cientifico">Incluir nomes científicos</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="origem"
                checked={incluirOrigem}
                onCheckedChange={(checked) => setIncluirOrigem(!!checked)}
              />
              <Label htmlFor="origem">Incluir dados de origem</Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Opções de Exportação */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Exportar CSV
            </CardTitle>
            <CardDescription>
              Formato compatível com Excel, Google Sheets e outros softwares de planilha.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportarCSV} className="w-full" disabled={registros.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Baixar CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Exportar PDF
            </CardTitle>
            <CardDescription>
              Relatório formatado para impressão e compartilhamento.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportarPDF} className="w-full" disabled={registros.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Database className="h-5 w-5" />
              Kit Pesquisa
            </CardTitle>
            <CardDescription>
              Formato padronizado para softwares estatísticos (R, Python, SPSS). 
              Inclui colunas em inglês e valores NA padronizados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={exportarKitPesquisa} className="w-full" disabled={registros.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Kit Pesquisa
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Informações sobre o Kit Pesquisa */}
      <Card>
        <CardHeader>
          <CardTitle>🔬 Sobre o Kit Pesquisa</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <p>
            O <strong>Kit Pesquisa</strong> gera um arquivo CSV com colunas padronizadas para facilitar 
            a análise em softwares estatísticos como R, Python (pandas) e SPSS.
          </p>
          <h4>Colunas incluídas:</h4>
          <ul className="text-sm">
            <li><code>date</code> - Data da coleta/venda</li>
            <li><code>box_id</code> - Identificador do box</li>
            <li><code>seller_name</code> / <code>seller_cpf</code> - Dados do feirante</li>
            <li><code>segment</code> - Pescado, Carne ou Hortifruti</li>
            <li><code>common_name</code> / <code>scientific_name</code> / <code>family</code> - Taxonomia</li>
            <li><code>weight_kg</code> - Peso em kg</li>
            <li><code>product_state</code> - Estado do produto (Inteiro, Filé, etc.)</li>
            <li><code>destination</code> - Destino (Revenda_Local, Exportação, Consumidor_Final)</li>
            <li><code>origin_*</code> - Dados de origem geográfica</li>
          </ul>
          <p className="text-muted-foreground">
            Valores ausentes são representados como <code>NA</code> para compatibilidade com R.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
