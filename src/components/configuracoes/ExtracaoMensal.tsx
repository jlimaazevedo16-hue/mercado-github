import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Download, FileSpreadsheet, Calendar, Building2, AlertTriangle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BoxComCalculo {
  id: string;
  codigo: string;
  boxe: string;
  setor: string | null;
  area_m2: number | null;
  inquilino: string | null;
  status: string;
  responsavel_nome: string | null;
  taxa_condominio: number;
  taxa_aluguel: number;
  multas_pendentes: number;
  total: number;
}

export function ExtracaoMensal() {
  const { toast } = useToast();
  const [mesReferencia, setMesReferencia] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Buscar configurações
  const { data: configuracoes } = useQuery({
    queryKey: ["configuracoes-administrativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_administrativas")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  // Buscar boxes com dados para cálculo
  const { data: boxesData, isLoading } = useQuery({
    queryKey: ["boxes-extracao", mesReferencia],
    queryFn: async () => {
      const { data: boxes, error: boxesError } = await supabase
        .from("boxes")
        .select(`
          id,
          codigo,
          boxe,
          setor,
          area_m2,
          inquilino,
          status,
          responsaveis (nome)
        `)
        .in("status", ["ASSINADO", "PROCESSO"])
        .order("codigo");

      if (boxesError) throw boxesError;

      // Buscar multas pendentes
      const { data: multas, error: multasError } = await supabase
        .from("pads")
        .select("box_id, valor_multa")
        .in("status", ["autuacao", "defesa", "julgamento", "recurso"])
        .not("valor_multa", "is", null);

      if (multasError) throw multasError;

      // Agregar multas por box
      const multasPorBox: Record<string, number> = {};
      multas?.forEach((m) => {
        if (m.box_id) {
          multasPorBox[m.box_id] = (multasPorBox[m.box_id] || 0) + (m.valor_multa || 0);
        }
      });

      return { boxes, multasPorBox };
    },
  });

  // Calcular valores
  const ufmsValor = configuracoes?.find((c) => c.chave === "ufms_valor")?.valor || 4.5971;
  const fatorCondominio = configuracoes?.find((c) => c.chave === "fator_condominio")?.valor || 2.5;
  const fatorAluguel = configuracoes?.find((c) => c.chave === "fator_aluguel")?.valor || 5.0;

  const taxaCondominioBase = ufmsValor * fatorCondominio;
  const taxaAluguelM2 = ufmsValor * fatorAluguel;

  const boxesComCalculo: BoxComCalculo[] =
    boxesData?.boxes?.map((box) => {
      const area = box.area_m2 || 0;
      const taxaCondominio = taxaCondominioBase;
      const taxaAluguel = taxaAluguelM2 * area;
      const multasPendentes = boxesData.multasPorBox[box.id] || 0;

      return {
        id: box.id,
        codigo: box.codigo,
        boxe: box.boxe,
        setor: box.setor,
        area_m2: box.area_m2,
        inquilino: box.inquilino,
        status: box.status,
        responsavel_nome: (box.responsaveis as any)?.nome || null,
        taxa_condominio: taxaCondominio,
        taxa_aluguel: taxaAluguel,
        multas_pendentes: multasPendentes,
        total: taxaCondominio + taxaAluguel,
      };
    }) || [];

  const totais = boxesComCalculo.reduce(
    (acc, box) => ({
      condominio: acc.condominio + box.taxa_condominio,
      aluguel: acc.aluguel + box.taxa_aluguel,
      multas: acc.multas + box.multas_pendentes,
      geral: acc.geral + box.total,
    }),
    { condominio: 0, aluguel: 0, multas: 0, geral: 0 }
  );

  const gerarPDF = () => {
    const doc = new jsPDF("landscape");
    const [ano, mes] = mesReferencia.split("-");
    const mesNome = format(new Date(parseInt(ano), parseInt(mes) - 1), "MMMM 'de' yyyy", {
      locale: ptBR,
    });

    // Título
    doc.setFontSize(18);
    doc.text(`Extração Mensal - ${mesNome}`, 14, 20);

    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 28);
    doc.text(`UFMS: R$ ${ufmsValor.toFixed(4)} | Fator Cond.: ${fatorCondominio} | Fator Aluguel: ${fatorAluguel}`, 14, 34);

    // Tabela de boxes
    autoTable(doc, {
      startY: 40,
      head: [
        [
          "Código",
          "Box",
          "Setor",
          "Área (m²)",
          "Responsável",
          "Taxa Cond.",
          "Taxa Aluguel",
          "Multas Pend.",
          "Total",
        ],
      ],
      body: boxesComCalculo.map((box) => [
        box.codigo,
        box.boxe,
        box.setor || "-",
        box.area_m2?.toFixed(2) || "-",
        box.responsavel_nome || box.inquilino || "-",
        `R$ ${box.taxa_condominio.toFixed(2)}`,
        `R$ ${box.taxa_aluguel.toFixed(2)}`,
        box.multas_pendentes > 0 ? `R$ ${box.multas_pendentes.toFixed(2)}` : "-",
        `R$ ${box.total.toFixed(2)}`,
      ]),
      foot: [
        [
          "TOTAIS",
          "",
          "",
          "",
          `${boxesComCalculo.length} boxes`,
          `R$ ${totais.condominio.toFixed(2)}`,
          `R$ ${totais.aluguel.toFixed(2)}`,
          `R$ ${totais.multas.toFixed(2)}`,
          `R$ ${totais.geral.toFixed(2)}`,
        ],
      ],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [236, 240, 241], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: "center" }
      );
    }

    doc.save(`extracao-mensal-${mesReferencia}.pdf`);
    toast({ title: "PDF gerado com sucesso!" });
  };

  const gerarCSV = () => {
    const headers = [
      "Código",
      "Box",
      "Setor",
      "Área (m²)",
      "Responsável",
      "Inquilino",
      "Status",
      "Taxa Condomínio",
      "Taxa Aluguel",
      "Multas Pendentes",
      "Total",
    ];

    const rows = boxesComCalculo.map((box) => [
      box.codigo,
      box.boxe,
      box.setor || "",
      box.area_m2?.toString() || "",
      box.responsavel_nome || "",
      box.inquilino || "",
      box.status,
      box.taxa_condominio.toFixed(2),
      box.taxa_aluguel.toFixed(2),
      box.multas_pendentes.toFixed(2),
      box.total.toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(";"))
      .join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `extracao-mensal-${mesReferencia}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "CSV gerado com sucesso!" });
  };

  // Gerar opções de meses (últimos 12 meses)
  const mesesOpcoes = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: format(date, "MMMM/yyyy", { locale: ptBR }),
    };
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              <div>
                <CardTitle>Extração Mensal para Cobrança</CardTitle>
                <CardDescription>
                  Gere relatórios com dados de boxes, áreas e valores calculados
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Label>Mês de Referência:</Label>
                <Select value={mesReferencia} onValueChange={setMesReferencia}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {mesesOpcoes.map((mes) => (
                      <SelectItem key={mes.value} value={mes.value}>
                        {mes.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Resumo */}
          <div className="grid gap-4 md:grid-cols-4 mb-6">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span className="text-sm text-muted-foreground">Total Boxes</span>
                </div>
                <p className="text-2xl font-bold">{boxesComCalculo.length}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <span className="text-sm text-muted-foreground">Total Condomínio</span>
                <p className="text-2xl font-bold text-primary">
                  R$ {totais.condominio.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <span className="text-sm text-muted-foreground">Total Aluguel</span>
                <p className="text-2xl font-bold text-primary">
                  R$ {totais.aluguel.toFixed(2)}
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30">
              <CardContent className="pt-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm text-muted-foreground">Multas Pendentes</span>
                </div>
                <p className="text-2xl font-bold text-destructive">
                  R$ {totais.multas.toFixed(2)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Botões de exportação */}
          <div className="flex gap-2 mb-6">
            <Button onClick={gerarPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button onClick={gerarCSV} variant="outline" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Exportar CSV
            </Button>
          </div>

          {/* Tabela */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Box</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead className="text-right">Área (m²)</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Taxa Cond.</TableHead>
                    <TableHead className="text-right">Taxa Aluguel</TableHead>
                    <TableHead className="text-right">Multas</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {boxesComCalculo.map((box) => (
                    <TableRow key={box.id}>
                      <TableCell className="font-medium">{box.codigo}</TableCell>
                      <TableCell>{box.boxe}</TableCell>
                      <TableCell>{box.setor || "-"}</TableCell>
                      <TableCell className="text-right">
                        {box.area_m2?.toFixed(2) || "-"}
                      </TableCell>
                      <TableCell>{box.responsavel_nome || box.inquilino || "-"}</TableCell>
                      <TableCell className="text-right">
                        R$ {box.taxa_condominio.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        R$ {box.taxa_aluguel.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {box.multas_pendentes > 0 ? (
                          <Badge variant="destructive">
                            R$ {box.multas_pendentes.toFixed(2)}
                          </Badge>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {box.total.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
