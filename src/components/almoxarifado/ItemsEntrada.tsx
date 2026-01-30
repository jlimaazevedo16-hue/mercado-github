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

interface InventoryEntry {
  id: string;
  item_id: string;
  data: string;
  qtd: number;
  embalagem: string | null;
  created_at: string;
  inventory_items?: {
    descricao: string;
    embalagem: string | null;
  };
}

export const ItemsEntrada = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [itemId, setItemId] = useState("");
  const [data, setData] = useState(format(new Date(), "yyyy-MM-dd"));
  const [qtd, setQtd] = useState("");
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const { data: items } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, descricao, embalagem")
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
        .select("*, inventory_items(descricao, embalagem)")
        .order("data", { ascending: false });
      if (error) throw error;
      return data as InventoryEntry[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (entry: { item_id: string; data: string; qtd: number }) => {
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
                {item.descricao} {item.embalagem ? `(${item.embalagem})` : ''}
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
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Desktop Form */}
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>Nova Entrada</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
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
                        {item.descricao} {item.embalagem ? `(${item.embalagem})` : ''}
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
              <Button type="submit" disabled={createMutation.isPending}>
                <Plus className="w-4 h-4 mr-2" />
                Registrar
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Mobile Add Button */}
      {isMobile && (
        <Button onClick={() => setIsSheetOpen(true)} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Nova Entrada
        </Button>
      )}

      {/* Mobile Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>Nova Entrada</SheetTitle>
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
          <CardTitle className="text-base md:text-lg">Entradas Registradas</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {isLoading ? (
            <p className="p-4">Carregando...</p>
          ) : isMobile ? (
            // Mobile List View
            <div className="divide-y">
              {entries?.map((entry) => (
                <div key={entry.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{entry.inventory_items?.descricao}</p>
                      <div className="text-sm text-muted-foreground mt-1">
                        <p>{format(new Date(entry.data), "dd/MM/yyyy")} • Qtd: {entry.qtd}</p>
                        {entry.inventory_items?.embalagem && (
                          <p>Unidade: {entry.inventory_items.embalagem}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(entry.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {entries?.length === 0 && (
                <p className="p-4 text-center text-muted-foreground">
                  Nenhuma entrada registrada
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
                  <TableHead>Quantidade</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="w-16">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries?.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell>{format(new Date(entry.data), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{entry.inventory_items?.descricao}</TableCell>
                    <TableCell>{entry.qtd}</TableCell>
                    <TableCell>{entry.inventory_items?.embalagem || "-"}</TableCell>
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