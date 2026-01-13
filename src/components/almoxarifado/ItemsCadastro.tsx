import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";

interface InventoryItem {
  id: string;
  descricao: string;
  embalagem: string | null;
  qtd_atual: number | null;
}

export const ItemsCadastro = () => {
  const queryClient = useQueryClient();
  const [descricao, setDescricao] = useState("");
  const [embalagem, setEmbalagem] = useState("");
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

  const createMutation = useMutation({
    mutationFn: async (newItem: { descricao: string; embalagem: string }) => {
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
    mutationFn: async ({ id, descricao, embalagem }: { id: string; descricao: string; embalagem: string }) => {
      const { error } = await supabase.from("inventory_items").update({ descricao, embalagem }).eq("id", id);
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
    setEditingId(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    if (editingId) {
      updateMutation.mutate({ id: editingId, descricao, embalagem });
    } else {
      createMutation.mutate({ descricao, embalagem });
    }
  };

  const handleEdit = (item: InventoryItem) => {
    setEditingId(item.id);
    setDescricao(item.descricao);
    setEmbalagem(item.embalagem || "");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Editar Item" : "Novo Item"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="descricao">Descrição</Label>
              <Input
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Nome do item"
              />
            </div>
            <div className="w-48">
              <Label htmlFor="embalagem">Embalagem</Label>
              <Input
                id="embalagem"
                value={embalagem}
                onChange={(e) => setEmbalagem(e.target.value)}
                placeholder="Ex: Unidade, Caixa"
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
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items?.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.descricao}</TableCell>
                    <TableCell>{item.embalagem || "-"}</TableCell>
                    <TableCell>{item.qtd_atual ?? 0}</TableCell>
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
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
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
