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

interface InventoryExit {
  id: string;
  item_id: string;
  data: string;
  qtd: number;
  embalagem: string | null;
  entregue_por: string | null;
  recebido_por: string | null;
  created_at: string;
  inventory_items?: {
    descricao: string;
  };
}

export const ItemsSaida = () => {
  const queryClient = useQueryClient();
  const [itemId, setItemId] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [qtd, setQtd] = useState("");
  const [embalagem, setEmbalagem] = useState("");
  const [entreguePor, setEntreguePor] = useState("");
  const [recebidoPor, setRecebidoPor] = useState("");

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

  const { data: exits, isLoading } = useQuery({
    queryKey: ["inventory-exits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_exits")
        .select("*, inventory_items(descricao)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as InventoryExit[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (exit: {
      item_id: string;
      data: string;
      qtd: number;
      embalagem: string;
      entregue_por: string;
      recebido_por: string;
    }) => {
      const { error } = await supabase.from("inventory_exits").insert(exit);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-exits"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      toast.success("Saída registrada com sucesso!");
      resetForm();
    },
    onError: () => toast.error("Erro ao registrar saída"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inventory_exits").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory-exits"] });
      toast.success("Saída excluída com sucesso!");
    },
    onError: () => toast.error("Erro ao excluir saída"),
  });

  const resetForm = () => {
    setItemId("");
    setQtd("");
    setEmbalagem("");
    setEntreguePor("");
    setRecebidoPor("");
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
      entregue_por: entreguePor,
      recebido_por: recebidoPor,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Nova Saída</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-4 items-end flex-wrap">
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
            </div>
            <div className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-48">
                <Label htmlFor="entreguePor">Entregue Por</Label>
                <Input
                  id="entreguePor"
                  value={entreguePor}
                  onChange={(e) => setEntreguePor(e.target.value)}
                  placeholder="Nome de quem entregou"
                />
              </div>
              <div className="flex-1 min-w-48">
                <Label htmlFor="recebidoPor">Recebido Por</Label>
                <Input
                  id="recebidoPor"
                  value={recebidoPor}
                  onChange={(e) => setRecebidoPor(e.target.value)}
                  placeholder="Nome de quem recebeu"
                />
              </div>
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Saídas Registradas</CardTitle>
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
                  <TableHead>Qtd</TableHead>
                  <TableHead>Embalagem</TableHead>
                  <TableHead>Entregue Por</TableHead>
                  <TableHead>Recebido Por</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {exits?.map((exit) => (
                  <TableRow key={exit.id}>
                    <TableCell>{format(new Date(exit.data), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{exit.inventory_items?.descricao}</TableCell>
                    <TableCell>{exit.qtd}</TableCell>
                    <TableCell>{exit.embalagem || "-"}</TableCell>
                    <TableCell>{exit.entregue_por || "-"}</TableCell>
                    <TableCell>{exit.recebido_por || "-"}</TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate(exit.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {exits?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Nenhuma saída registrada
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
