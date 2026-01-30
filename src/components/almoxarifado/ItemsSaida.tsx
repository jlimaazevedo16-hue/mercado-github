import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";

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
    embalagem: string | null;
  };
}

export const ItemsSaida = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [itemId, setItemId] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [qtd, setQtd] = useState("");
  const [entreguePor, setEntreguePor] = useState("");
  const [recebidoPor, setRecebidoPor] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, descricao, embalagem, qtd_atual")
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
        .select("*, inventory_items(descricao, embalagem)")
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
    setEntreguePor("");
    setRecebidoPor("");
    setIsSheetOpen(false);
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
      entregue_por: entreguePor,
      recebido_por: recebidoPor,
    });
  };

  const FormContent = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="data">Data</Label>
        <Input
          id="data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="item">Item *</Label>
        <Select value={itemId} onValueChange={setItemId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o item" />
          </SelectTrigger>
          <SelectContent>
            {items?.map((item) => (
              <SelectItem key={item.id} value={item.id}>
                {item.descricao} {item.embalagem ? `(${item.embalagem})` : ''} - Estoque: {item.qtd_atual ?? 0}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="qtd">Quantidade *</Label>
        <Input
          id="qtd"
          type="number"
          step="0.01"
          value={qtd}
          onChange={(e) => setQtd(e.target.value)}
          placeholder="0"
        />
      </div>
      <div>
        <Label htmlFor="entreguePor">Entregue Por</Label>
        <Input
          id="entreguePor"
          value={entreguePor}
          onChange={(e) => setEntreguePor(e.target.value)}
          placeholder="Nome de quem entregou"
        />
      </div>
      <div>
        <Label htmlFor="recebidoPor">Recebido Por</Label>
        <Input
          id="recebidoPor"
          value={recebidoPor}
          onChange={(e) => setRecebidoPor(e.target.value)}
          placeholder="Nome de quem recebeu"
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Desktop Form */}
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Saída</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex gap-4 items-end flex-wrap">
                <div className="w-48">
                  <Label htmlFor="data-desktop">Data</Label>
                  <Input
                    id="data-desktop"
                    type="date"
                    value={data}
                    onChange={(e) => setData(e.target.value)}
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <Label htmlFor="item-desktop">Item</Label>
                  <Select value={itemId} onValueChange={setItemId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o item" />
                    </SelectTrigger>
                    <SelectContent>
                      {items?.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.descricao} {item.embalagem ? `(${item.embalagem})` : ''} - Estoque: {item.qtd_atual ?? 0}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label htmlFor="qtd-desktop">Quantidade</Label>
                  <Input
                    id="qtd-desktop"
                    type="number"
                    step="0.01"
                    value={qtd}
                    onChange={(e) => setQtd(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex gap-4 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                  <Label htmlFor="entreguePor-desktop">Entregue Por</Label>
                  <Input
                    id="entreguePor-desktop"
                    value={entreguePor}
                    onChange={(e) => setEntreguePor(e.target.value)}
                    placeholder="Nome de quem entregou"
                  />
                </div>
                <div className="flex-1 min-w-48">
                  <Label htmlFor="recebidoPor-desktop">Recebido Por</Label>
                  <Input
                    id="recebidoPor-desktop"
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
      )}

      {/* Mobile Add Button */}
      {isMobile && (
        <Button onClick={() => setIsSheetOpen(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nova Saída
        </Button>
      )}

      {/* Mobile Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nova Saída</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="py-4">
            <FormContent />
            <SheetFooter className="mt-6 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Registrar
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Saídas Registradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {isLoading ? (
            <p className="p-4">Carregando...</p>
          ) : isMobile ? (
            // Mobile List View
            <div className="divide-y">
              {exits?.map((exit) => (
                <div key={exit.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{exit.inventory_items?.descricao}</p>
                      <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                        <p>{format(new Date(exit.data), "dd/MM/yyyy")} • Qtd: {exit.qtd}</p>
                        {exit.entregue_por && <p>Entregue: {exit.entregue_por}</p>}
                        {exit.recebido_por && <p>Recebido: {exit.recebido_por}</p>}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(exit.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {exits?.length === 0 && (
                <p className="p-4 text-center text-muted-foreground">
                  Nenhuma saída registrada
                </p>
              )}
            </div>
          ) : (
            // Desktop Table View
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Qtd</TableHead>
                  <TableHead>Unidade</TableHead>
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
                    <TableCell>{exit.inventory_items?.embalagem || "-"}</TableCell>
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