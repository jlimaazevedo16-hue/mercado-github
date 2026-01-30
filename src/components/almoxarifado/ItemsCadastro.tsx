import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Pencil, AlertTriangle, X } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";

interface InventoryItem {
  id: string;
  descricao: string;
  embalagem: string | null;
  qtd_atual: number | null;
  estoque_minimo: number | null;
}

const UNIDADES = [
  { value: "und", label: "Unidade (und)" },
  { value: "cx", label: "Caixa (cx)" },
  { value: "lt", label: "Litro (lt)" },
  { value: "frasco", label: "Frasco" },
  { value: "kg", label: "Quilograma (kg)" },
  { value: "pct", label: "Pacote (pct)" },
  { value: "rolo", label: "Rolo" },
  { value: "par", label: "Par" },
];

export const ItemsCadastro = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [descricao, setDescricao] = useState("");
  const [embalagem, setEmbalagem] = useState("");
  const [estoqueMinimo, setEstoqueMinimo] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

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
    setIsSheetOpen(false);
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
    if (isMobile) {
      setIsSheetOpen(true);
    }
  };

  const handleNewItem = () => {
    resetForm();
    setIsSheetOpen(true);
  };

  const isLowStock = (item: InventoryItem) => {
    return (item.qtd_atual ?? 0) < (item.estoque_minimo ?? 0) && (item.estoque_minimo ?? 0) > 0;
  };

  const getUnidadeLabel = (value: string | null) => {
    const unidade = UNIDADES.find(u => u.value === value);
    return unidade?.label || value || "-";
  };

  const FormContent = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="descricao">Descrição *</Label>
        <Input
          id="descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          placeholder="Nome do item"
        />
      </div>
      <div>
        <Label htmlFor="embalagem">Unidade</Label>
        <Select value={embalagem} onValueChange={setEmbalagem}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione a unidade" />
          </SelectTrigger>
          <SelectContent>
            {UNIDADES.map((unidade) => (
              <SelectItem key={unidade.value} value={unidade.value}>
                {unidade.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
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
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      {lowStockItems && lowStockItems.length > 0 && (
        <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-orange-700 dark:text-orange-400 text-sm md:text-base">
              <AlertTriangle className="w-4 h-4 md:w-5 md:h-5" />
              Alertas de Estoque Baixo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {lowStockItems.map((item) => (
                <Badge key={item.id} variant="outline" className="border-orange-500 text-orange-700 dark:text-orange-400 text-xs">
                  {item.descricao}: {item.qtd_atual ?? 0} / mín. {item.estoque_minimo}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Desktop Form */}
      {!isMobile && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? "Editar Item" : "Novo Item"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex gap-4 items-end flex-wrap">
              <div className="flex-1 min-w-48">
                <Label htmlFor="descricao-desktop">Descrição</Label>
                <Input
                  id="descricao-desktop"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Nome do item"
                />
              </div>
              <div className="w-44">
                <Label htmlFor="embalagem-desktop">Unidade</Label>
                <Select value={embalagem} onValueChange={setEmbalagem}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIDADES.map((unidade) => (
                      <SelectItem key={unidade.value} value={unidade.value}>
                        {unidade.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <Label htmlFor="estoqueMinimo-desktop">Estoque Mínimo</Label>
                <Input
                  id="estoqueMinimo-desktop"
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
      )}

      {/* Mobile Add Button */}
      {isMobile && (
        <Button onClick={handleNewItem} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      )}

      {/* Mobile Sheet/Drawer */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh]">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar Item" : "Novo Item"}</SheetTitle>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="py-4">
            <FormContent />
            <SheetFooter className="mt-6 gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={resetForm}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {editingId ? "Atualizar" : "Cadastrar"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Card>
        <CardHeader>
          <CardTitle className="text-base md:text-lg">Itens Cadastrados</CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {isLoading ? (
            <p className="p-4">Carregando...</p>
          ) : isMobile ? (
            // Mobile List View
            <div className="divide-y">
              {items?.map((item) => (
                <div 
                  key={item.id} 
                  className={`p-4 ${isLowStock(item) ? "bg-orange-50 dark:bg-orange-950/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {isLowStock(item) && <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                        <span className="font-medium truncate">{item.descricao}</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1 space-y-0.5">
                        <p>Unidade: {getUnidadeLabel(item.embalagem)}</p>
                        <p>Qtd: {item.qtd_atual ?? 0} | Mín: {item.estoque_minimo ?? 0}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
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
                  </div>
                </div>
              ))}
              {items?.length === 0 && (
                <p className="p-4 text-center text-muted-foreground">
                  Nenhum item cadastrado
                </p>
              )}
            </div>
          ) : (
            // Desktop Table View
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Unidade</TableHead>
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
                    <TableCell>{getUnidadeLabel(item.embalagem)}</TableCell>
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