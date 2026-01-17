import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Search, Plus, Trash2, Check } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

const SEGMENTOS = ['Pescado', 'Carne', 'Hortifruti'];
const ESTADOS_PRODUTO = ['Inteiro', 'Filé', 'Carcaça', 'Vísceras', 'Processado', 'In Natura'];
const DESTINACOES = ['Revenda Local', 'Exportação', 'Consumidor Final'];

export const MOCRegistroForm = () => {
  const queryClient = useQueryClient();
  const [buscaFeirante, setBuscaFeirante] = useState("");
  const [selectedBox, setSelectedBox] = useState<any>(null);
  const [segmento, setSegmento] = useState("");
  const [produtoId, setProdutoId] = useState("");
  const [quantidadeKg, setQuantidadeKg] = useState("");
  const [estadoProduto, setEstadoProduto] = useState("");
  const [origemMunicipio, setOrigemMunicipio] = useState("");
  const [origemComunidade, setOrigemComunidade] = useState("");
  const [origemRio, setOrigemRio] = useState("");
  const [dataColeta, setDataColeta] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [destinacao, setDestinacao] = useState("");
  const [observacoes, setObservacoes] = useState("");

  // Buscar boxes com responsáveis
  const { data: boxes = [] } = useQuery({
    queryKey: ['boxes-responsaveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxes')
        .select(`*, responsaveis (id, nome, cpf)`)
        .order('codigo');
      
      if (error) throw error;
      return data || [];
    }
  });

  // Filtrar boxes pela busca
  const boxesFiltrados = boxes.filter(box => {
    const termo = buscaFeirante.toLowerCase();
    return (
      box.codigo?.toLowerCase().includes(termo) ||
      box.boxe?.toLowerCase().includes(termo) ||
      box.responsaveis?.nome?.toLowerCase().includes(termo) ||
      box.responsaveis?.cpf?.includes(termo)
    );
  });

  // Buscar produtos por segmento
  const { data: produtos = [] } = useQuery({
    queryKey: ['moc-produtos', segmento],
    queryFn: async () => {
      let query = supabase.from('moc_produtos').select('*').order('nome_popular');
      if (segmento) {
        query = query.eq('segmento', segmento);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    }
  });

  // Buscar registros recentes
  const { data: registrosRecentes = [] } = useQuery({
    queryKey: ['moc-registros-recentes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moc_registros')
        .select(`
          *,
          moc_produtos (nome_popular, nome_cientifico, segmento),
          boxes (codigo, boxe),
          responsaveis (nome)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    }
  });

  // Produto selecionado
  const produtoSelecionado = produtos.find(p => p.id === produtoId);

  // Mutation para criar registro
  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('moc_registros').insert({
        box_id: selectedBox?.id,
        responsavel_id: selectedBox?.responsaveis?.id,
        produto_id: produtoId,
        quantidade_kg: parseFloat(quantidadeKg),
        estado_produto: estadoProduto,
        origem_municipio: origemMunicipio || null,
        origem_comunidade: origemComunidade || null,
        origem_rio: origemRio || null,
        data_coleta: dataColeta,
        destinacao: destinacao,
        observacoes: observacoes || null
      });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro adicionado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['moc-registros'] });
      queryClient.invalidateQueries({ queryKey: ['moc-registros-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['moc-registros-dashboard'] });
      // Limpar formulário
      setProdutoId("");
      setQuantidadeKg("");
      setEstadoProduto("");
      setOrigemMunicipio("");
      setOrigemComunidade("");
      setOrigemRio("");
      setObservacoes("");
    },
    onError: (error: any) => {
      toast.error("Erro ao adicionar registro: " + error.message);
    }
  });

  // Mutation para deletar registro
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('moc_registros').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Registro removido!");
      queryClient.invalidateQueries({ queryKey: ['moc-registros'] });
      queryClient.invalidateQueries({ queryKey: ['moc-registros-recentes'] });
      queryClient.invalidateQueries({ queryKey: ['moc-registros-dashboard'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBox || !produtoId || !quantidadeKg || !estadoProduto || !destinacao) {
      toast.error("Preencha todos os campos obrigatórios!");
      return;
    }
    createMutation.mutate();
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Bloco A: Identificação do Feirante */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">A. Identificação do Feirante</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Busca por CPF/Nome/Box</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Digite para buscar..."
                    value={buscaFeirante}
                    onChange={(e) => setBuscaFeirante(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {buscaFeirante && boxesFiltrados.length > 0 && !selectedBox && (
                <div className="border rounded-md max-h-40 overflow-auto">
                  {boxesFiltrados.slice(0, 5).map(box => (
                    <button
                      key={box.id}
                      type="button"
                      onClick={() => {
                        setSelectedBox(box);
                        setBuscaFeirante("");
                      }}
                      className="w-full p-2 text-left hover:bg-muted text-sm border-b last:border-0"
                    >
                      <strong>{box.codigo}</strong> - {box.responsaveis?.nome || 'Sem responsável'}
                    </button>
                  ))}
                </div>
              )}

              {selectedBox && (
                <div className="p-3 bg-muted rounded-md space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Feirante Selecionado</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedBox(null)}
                    >
                      Trocar
                    </Button>
                  </div>
                  <div className="text-sm">
                    <p><strong>Box:</strong> {selectedBox.codigo}</p>
                    <p><strong>Nome:</strong> {selectedBox.responsaveis?.nome || 'N/A'}</p>
                    <p><strong>CPF:</strong> {selectedBox.responsaveis?.cpf || 'N/A'}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bloco B: Dados do Produto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">B. Dados do Produto</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Segmento *</Label>
                <Select value={segmento} onValueChange={(value) => {
                  setSegmento(value);
                  setProdutoId("");
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {SEGMENTOS.map(seg => (
                      <SelectItem key={seg} value={seg}>{seg}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Nome Popular *</Label>
                <Select value={produtoId} onValueChange={setProdutoId} disabled={!segmento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o produto..." />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.map(prod => (
                      <SelectItem key={prod.id} value={prod.id}>
                        {prod.nome_popular}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {produtoSelecionado?.nome_cientifico && (
                <div>
                  <Label>Nome Científico</Label>
                  <Input value={produtoSelecionado.nome_cientifico} disabled className="bg-muted" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quantidade (kg) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={quantidadeKg}
                    onChange={(e) => setQuantidadeKg(e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Estado *</Label>
                  <Select value={estadoProduto} onValueChange={setEstadoProduto}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado..." />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS_PRODUTO.map(est => (
                        <SelectItem key={est} value={est}>{est}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bloco C: Logística e Destino */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">C. Logística e Destino</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Origem - Município</Label>
                <Input
                  value={origemMunicipio}
                  onChange={(e) => setOrigemMunicipio(e.target.value)}
                  placeholder="Ex: Manaus"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Comunidade</Label>
                  <Input
                    value={origemComunidade}
                    onChange={(e) => setOrigemComunidade(e.target.value)}
                    placeholder="Ex: São José"
                  />
                </div>
                <div>
                  <Label>Rio</Label>
                  <Input
                    value={origemRio}
                    onChange={(e) => setOrigemRio(e.target.value)}
                    placeholder="Ex: Rio Negro"
                  />
                </div>
              </div>

              <div>
                <Label>Data da Coleta/Entrada *</Label>
                <Input
                  type="date"
                  value={dataColeta}
                  onChange={(e) => setDataColeta(e.target.value)}
                />
              </div>

              <div>
                <Label>Destinação *</Label>
                <Select value={destinacao} onValueChange={setDestinacao}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DESTINACOES.map(dest => (
                      <SelectItem key={dest} value={dest}>{dest}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Observações</Label>
                <Textarea
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Informações adicionais..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end mt-4">
          <Button type="submit" disabled={createMutation.isPending}>
            <Plus className="mr-2 h-4 w-4" />
            Registrar Venda
          </Button>
        </div>
      </form>

      {/* Tabela de Registros Recentes */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Últimos Registros</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Feirante</TableHead>
                <TableHead>Espécie (Científico)</TableHead>
                <TableHead>Qtd (kg)</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrosRecentes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    Nenhum registro encontrado
                  </TableCell>
                </TableRow>
              ) : (
                registrosRecentes.map(reg => (
                  <TableRow key={reg.id}>
                    <TableCell>{format(new Date(reg.data_coleta), 'dd/MM')}</TableCell>
                    <TableCell>
                      {reg.boxes?.codigo || 'N/A'}
                      {reg.responsaveis?.nome && (
                        <span className="text-xs text-muted-foreground block">
                          {reg.responsaveis.nome}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{reg.moc_produtos?.nome_popular}</span>
                      {reg.moc_produtos?.nome_cientifico && (
                        <span className="text-xs text-muted-foreground italic block">
                          {reg.moc_produtos.nome_cientifico}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>{Number(reg.quantidade_kg).toFixed(2)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{reg.destinacao}</Badge>
                    </TableCell>
                    <TableCell>
                      <Check className="h-4 w-4 text-green-500" />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMutation.mutate(reg.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
