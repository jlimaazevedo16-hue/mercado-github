import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Fish, Beef, Apple } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SEGMENTOS = ['Pescado', 'Carne', 'Hortifruti'];

const SEGMENT_COLORS: Record<string, string> = {
  'Pescado': 'bg-blue-100 text-blue-800',
  'Carne': 'bg-red-100 text-red-800',
  'Hortifruti': 'bg-green-100 text-green-800',
};

const SEGMENT_ICONS: Record<string, any> = {
  'Pescado': Fish,
  'Carne': Beef,
  'Hortifruti': Apple,
};

export const MOCProdutos = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduto, setEditingProduto] = useState<any>(null);
  const [filtroSegmento, setFiltroSegmento] = useState("");
  const [busca, setBusca] = useState("");

  const [form, setForm] = useState({
    segmento: '',
    nome_popular: '',
    nome_cientifico: '',
    familia: ''
  });

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['moc-produtos-lista'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('moc_produtos')
        .select('*')
        .order('segmento')
        .order('nome_popular');
      
      if (error) throw error;
      return data || [];
    }
  });

  const produtosFiltrados = produtos.filter(p => {
    const matchSegmento = !filtroSegmento || filtroSegmento === 'all' || p.segmento === filtroSegmento;
    const matchBusca = !busca || 
      p.nome_popular?.toLowerCase().includes(busca.toLowerCase()) ||
      p.nome_cientifico?.toLowerCase().includes(busca.toLowerCase()) ||
      p.familia?.toLowerCase().includes(busca.toLowerCase());
    return matchSegmento && matchBusca;
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('moc_produtos').insert(form);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto adicionado!");
      queryClient.invalidateQueries({ queryKey: ['moc-produtos'] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => toast.error("Erro: " + error.message)
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('moc_produtos')
        .update(form)
        .eq('id', editingProduto.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto atualizado!");
      queryClient.invalidateQueries({ queryKey: ['moc-produtos'] });
      setIsDialogOpen(false);
      setEditingProduto(null);
      resetForm();
    },
    onError: (error: any) => toast.error("Erro: " + error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('moc_produtos').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Produto removido!");
      queryClient.invalidateQueries({ queryKey: ['moc-produtos'] });
    },
    onError: (error: any) => toast.error("Erro ao remover: " + error.message)
  });

  const resetForm = () => {
    setForm({ segmento: '', nome_popular: '', nome_cientifico: '', familia: '' });
  };

  const openEdit = (produto: any) => {
    setEditingProduto(produto);
    setForm({
      segmento: produto.segmento,
      nome_popular: produto.nome_popular,
      nome_cientifico: produto.nome_cientifico || '',
      familia: produto.familia || ''
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.segmento || !form.nome_popular) {
      toast.error("Preencha os campos obrigatórios!");
      return;
    }
    if (editingProduto) {
      updateMutation.mutate();
    } else {
      createMutation.mutate();
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row justify-between gap-4">
          <CardTitle>Cadastro de Produtos/Espécies</CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) {
              setEditingProduto(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Produto
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingProduto ? 'Editar Produto' : 'Novo Produto'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Segmento *</Label>
                  <Select 
                    value={form.segmento} 
                    onValueChange={(v) => setForm({ ...form, segmento: v })}
                  >
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
                  <Input
                    value={form.nome_popular}
                    onChange={(e) => setForm({ ...form, nome_popular: e.target.value })}
                    placeholder="Ex: Pirarucu, Acém, Banana"
                  />
                </div>
                
                <div>
                  <Label>Nome Científico</Label>
                  <Input
                    value={form.nome_cientifico}
                    onChange={(e) => setForm({ ...form, nome_cientifico: e.target.value })}
                    placeholder="Ex: Arapaima gigas"
                  />
                </div>
                
                <div>
                  <Label>Família</Label>
                  <Input
                    value={form.familia}
                    onChange={(e) => setForm({ ...form, familia: e.target.value })}
                    placeholder="Ex: Arapaimidae"
                  />
                </div>
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editingProduto ? 'Salvar' : 'Adicionar'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filtros */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome ou família..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <Select value={filtroSegmento} onValueChange={setFiltroSegmento}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Todos segmentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {SEGMENTOS.map(seg => (
                <SelectItem key={seg} value={seg}>{seg}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Tabela */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Segmento</TableHead>
              <TableHead>Nome Popular</TableHead>
              <TableHead>Nome Científico</TableHead>
              <TableHead>Família</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center">Carregando...</TableCell>
              </TableRow>
            ) : produtosFiltrados.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Nenhum produto encontrado
                </TableCell>
              </TableRow>
            ) : (
              produtosFiltrados.map(produto => {
                const Icon = SEGMENT_ICONS[produto.segmento] || Fish;
                return (
                  <TableRow key={produto.id}>
                    <TableCell>
                      <Badge className={SEGMENT_COLORS[produto.segmento]}>
                        <Icon className="h-3 w-3 mr-1" />
                        {produto.segmento}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{produto.nome_popular}</TableCell>
                    <TableCell className="italic text-muted-foreground">
                      {produto.nome_cientifico || '-'}
                    </TableCell>
                    <TableCell>{produto.familia || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(produto)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => deleteMutation.mutate(produto.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
