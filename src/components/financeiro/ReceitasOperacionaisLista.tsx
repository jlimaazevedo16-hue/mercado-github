import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, Search, DollarSign, Loader2, 
  Calendar, FileText, Lock, Unlock, RefreshCw, Download 
} from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { ReceitaOperacionalForm } from "./ReceitaOperacionalForm";
import { ExportDialog } from "@/components/export/ExportDialog";

const formaPagamentoLabels: Record<string, string> = {
  dinheiro: "Dinheiro",
  pix: "PIX",
  transferencia: "Transferência",
  cartao: "Cartão",
  outro: "Outro",
};

interface ReceitaOperacional {
  id: string;
  data_referencia: string;
  tipo_receita_id: string;
  descricao: string | null;
  valor_bruto: number;
  forma_pagamento: string;
  origem_caixa: string | null;
  responsavel_lancamento: string | null;
  observacoes: string | null;
  comprovante_url: string | null;
  bloqueado: boolean;
  created_at: string;
  tipos_receita?: {
    nome: string;
    categoria: string;
  };
}

export function ReceitasOperacionaisLista() {
  const [isExportOpen, setIsExportOpen] = useState(false);
  const { user } = useAuth();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingReceita, setEditingReceita] = useState<ReceitaOperacional | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("all");
  const [formaFilter, setFormaFilter] = useState<string>("all");
  const [dateStart, setDateStart] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dateEnd, setDateEnd] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-receita-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_receita")
        .select("id, nome, categoria")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const { data: receitas = [], isLoading, refetch } = useQuery({
    queryKey: ["receitas-operacionais", dateStart, dateEnd, tipoFilter, formaFilter],
    queryFn: async () => {
      let query = supabase
        .from("receitas_operacionais")
        .select(`
          *,
          tipos_receita (nome, categoria)
        `)
        .gte("data_referencia", dateStart)
        .lte("data_referencia", dateEnd)
        .order("data_referencia", { ascending: false });

      if (tipoFilter !== "all") {
        query = query.eq("tipo_receita_id", tipoFilter);
      }
      if (formaFilter !== "all") {
        query = query.eq("forma_pagamento", formaFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReceitaOperacional[];
    },
  });

  const filteredReceitas = receitas.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.descricao?.toLowerCase().includes(term) ||
      r.origem_caixa?.toLowerCase().includes(term) ||
      r.tipos_receita?.nome.toLowerCase().includes(term)
    );
  });

  const totalPeriodo = filteredReceitas.reduce((acc, r) => acc + Number(r.valor_bruto), 0);
  const totalPorTipo = filteredReceitas.reduce((acc, r) => {
    const tipo = r.tipos_receita?.nome || "Outros";
    acc[tipo] = (acc[tipo] || 0) + Number(r.valor_bruto);
    return acc;
  }, {} as Record<string, number>);

  const handleEdit = (receita: ReceitaOperacional) => {
    setEditingReceita(receita);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingReceita(null);
  };

  // Prepare export data
  const exportData = filteredReceitas.map((r) => ({
    Data: format(new Date(r.data_referencia), "dd/MM/yyyy"),
    Tipo: r.tipos_receita?.nome || "-",
    Categoria: r.tipos_receita?.categoria || "-",
    Descrição: r.descricao || "-",
    Valor: r.valor_bruto,
    "Forma Pagamento": formaPagamentoLabels[r.forma_pagamento] || r.forma_pagamento,
    "Origem Caixa": r.origem_caixa || "-",
    Status: r.bloqueado ? "Bloqueado" : "Aberto",
  }));

  const exportColumns = [
    { key: "Data", header: "Data" },
    { key: "Tipo", header: "Tipo" },
    { key: "Categoria", header: "Categoria" },
    { key: "Descrição", header: "Descrição" },
    { key: "Valor", header: "Valor (R$)", format: "currency" as const },
    { key: "Forma Pagamento", header: "Forma Pagamento" },
    { key: "Origem Caixa", header: "Origem Caixa" },
    { key: "Status", header: "Status" },
  ];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">
                  R$ {totalPeriodo.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground">Total do Período</p>
              </div>
            </div>
          </CardContent>
        </Card>
        {Object.entries(totalPorTipo).slice(0, 3).map(([tipo, valor]) => (
          <Card key={tipo}>
            <CardContent className="pt-4">
              <div>
                <p className="text-xl font-bold">
                  R$ {valor.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground truncate">{tipo}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters and List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Lançamentos</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsExportOpen(true)}>
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Lançamento
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                value={dateStart}
                onChange={(e) => setDateStart(e.target.value)}
                className="w-[140px]"
              />
              <span className="text-muted-foreground">a</span>
              <Input
                type="date"
                value={dateEnd}
                onChange={(e) => setDateEnd(e.target.value)}
                className="w-[140px]"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {tipos.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={formaFilter} onValueChange={setFormaFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Forma Pagamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="dinheiro">Dinheiro</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="transferencia">Transferência</SelectItem>
                <SelectItem value="cartao">Cartão</SelectItem>
                <SelectItem value="outro">Outro</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por descrição ou origem..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredReceitas.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum lançamento encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Forma</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceitas.map((receita) => (
                    <TableRow key={receita.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(receita.data_referencia), "dd/MM/yyyy")}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {receita.tipos_receita?.nome || "-"}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {receita.descricao || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        R$ {Number(receita.valor_bruto).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        {formaPagamentoLabels[receita.forma_pagamento] || receita.forma_pagamento}
                      </TableCell>
                      <TableCell className="max-w-[120px] truncate">
                        {receita.origem_caixa || "-"}
                      </TableCell>
                      <TableCell>
                        {receita.bloqueado ? (
                          <Badge variant="secondary" className="gap-1">
                            <Lock className="h-3 w-3" />
                            Bloqueado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Unlock className="h-3 w-3" />
                            Aberto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(receita)}
                          disabled={receita.bloqueado}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Dialog */}
      <ReceitaOperacionalForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        editingReceita={editingReceita}
      />

      {/* Export Dialog */}
      <ExportDialog
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        module="Financeiro"
        title="Receitas Operacionais"
        columns={exportColumns}
        data={exportData}
        filters={{ dateStart, dateEnd, tipoFilter, formaFilter }}
      />
    </div>
  );
}
