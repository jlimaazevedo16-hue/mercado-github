import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface InventoryItem {
  id: string;
  descricao: string;
  embalagem: string | null;
  qtd_atual: number | null;
  estoque_minimo: number | null;
}

export const ItemsCadastro = () => {
  const queryClient = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [embalagem, setEmbalagem] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: items, isLoading } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("descricao");
      if (error) throw error;
      return data as InventoryItem[];
    },
  });

  const lowStockItems = items?.filter(
    (item) => (item.qtd_atual ?? 0) < (item.estoque_minimo ?? 0) && (item.estoque_minimo ?? 0) > 0
  );

  const createMutation = useMutation({
    mutationFn: async (newItem: { descricao: string; embalagem: string; estoque_minimo: number }) => {
      const { error } = await supabase.from("inventory_items").insert(newItem);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Item cadastrado com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao cadastrar item"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, descricao, embalagem, estoque_minimo }: { id: string; descricao: string; embalagem: string; estoque_minimo: number }) => {
      const { error } = await supabase.from("inventory_items").update({ descricao, embalagem, estoque_minimo }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Item atualizado com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao atualizar item"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Item excluído com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir item"),
  });

  const resetForm = () => {
    setDescricao("");
    setEmbalagem("");
    setEstoqueMinimo("");
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    const minStock = parseFloat(estoqueMinimo) || 0;
    if (editingId) {
      updateMutation.mutate({ id: editingId, descricao, embalagem, estoque_minimo: minStock });
    } else {
      createMutation.mutate({ descricao, embalagem, estoque_minimo: minStock });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setDescricao(item.descricao);
    setEmbalagem(item.embalagem || "");
    setEstoqueMinimo(item.estoque_minimo?.toString() || "");
  };

  const isLowStock = (item: InventoryItem) => {
    return (item.qtd_atual ?? 0) < (item.estoque_minimo ?? 0) && (item.estoque_minimo ?? 0) > 0;
  };

  return (
    <div className="space-y-6">
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400">
              <AlertTriangle className="w-5 h-5" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge key={item.id} variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400">
                  {item.descricao}: {item.qtd_atual ?? 0} / mín. {item.estoque_minimo}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Item" : "Novo Item"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
            <div className="flex-1 min-w-48">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Nome do item"
              />
            </div>
            <div className="w-40">
              <Label htmlFor="embalagem">Embalagem</Label>
              <Input
                id="embalagem"
                value={embalagem}
                onChange={(e) => setEmbalagem(e.target.value)}
                placeholder="Ex: Unidade"
              />
            </div>
            <div className="w-36">
              <Label htmlFor="estoqueMinimo">Estoque Mínimo</Label>
              <Input
                id="estoqueMinimo"
                type="number"
                step="0.01"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
                placeholder="0"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              {editingId ? "Atualizar" : "Cadastrar"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Itens Cadastrados</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Embalagem</TableHead>
                  <TableHead>Qtd. Atual</TableHead>
                  <TableHead>Estoque Mín.</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id} className={isLowStock(item) ? "bg-orange-50 dark:bg-orange-950/20" : ""}>
                    <TableCell className="flex items-center gap-2">
                      {isLowStock(item) && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                      {item.descricao}
                    </TableCell>
                    <TableCell>{item.embalagem || "-"}</TableCell>
                    <TableCell>{item.qtd_atual ?? 0}</TableCell>
                    <TableCell>{item.estoque_minimo ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(item.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {items?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhum item cadastrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
