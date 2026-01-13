import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface InventoryEntry {
  id: string;
  item_id: string;
  data: string;
  qtd: number;
  embalagem: string | null;
  created_at: string;
  inventory_items?: {
    descricao: string;
  };
}

export const ItemsEntrada = () => {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [qtd, setQtd] = useState("");
  const [embalagem, setEmbalagem] = useState("");

  const { data: items } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, descricao")
        .order("descricao");
      if (error) throw error;
      return data;
    },
  });

  const { data: entries, isLoading } = useQuery({
    queryKey: ["inventory-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_entries")
        .select("*, inventory_items(descricao)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as InventoryEntry[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entry: { item_id: string; data: string; qtd: number; embalagem: string }) => {
      const { error } = await supabase.from("inventory_entries").insert(entry);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-entries"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Entrada registrada com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao registrar entrada"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-entries"] });
      toast.success("Entrada excluída com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir entrada"),
  });

  const resetForm = () => {
    setItemId("");
    setQtd("");
    setEmbalagem("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemId || !qtd) {
      toast.error("Item e quantidade são obrigatórios");
      return;
    }
    createMutation.mutate({
      item_id: itemId,
      data,
      qtd: parseFloat(qtd),
      embalagem,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Entrada</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
            <div className="w-48">
              <Label htmlFor="data">Data</Label>
              <Input
                id="data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-48">
              <Label htmlFor="item">Item</Label>
              <Select value={itemId} onValueChange={setItemId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o item" />
                </SelectTrigger>
                <SelectContent>
                  {items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-32">
              <Label htmlFor="qtd">Quantidade</Label>
              <Input
                id="qtd"
                type="number"
                step="0.01"
                value={qtd}
                onChange={(e) => setQtd(e.target.value)}
              />
            </div>
            <div className="w-40">
              <Label htmlFor="embalagem">Embalagem</Label>
              <Input
                id="embalagem"
                value={embalagem}
                onChange={(e) => setEmbalagem(e.target.value)}
                placeholder="Ex: Caixa"
              />
            </div>
            <Button type="submit" disabled={createMutation.isPending}>
              <Plus className="w-4 h-4 mr-2" />
              Registrar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entradas Registradas</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Embalagem</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.data), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{entry.inventory_items?.descricao}</TableCell>
                    <TableCell>{entry.qtd}</TableCell>
                    <TableCell>{entry.embalagem || "-"}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(entry.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {entries?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      Nenhuma entrada registrada
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
