import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, MapPin } from "lucide-react";
import { toast } from "sonner";

interface Setor {
  id: string;
  nome: string;
  mercado: string | null;
  valor_cobranca_padrao: number | null;
}

export const SetoresManager = () => {
  const queryClient = useQueryClient();
  const [newSetor, setNewSetor] = useState({ nome: "", mercado: "", valor_cobranca_padrao: "5.00" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ nome: "", mercado: "", valor_cobranca_padrao: "" });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [setorToDelete, setSetorToDelete] = useState<Setor | null>(null);

  const { data: setores, isLoading } = useQuery({
    queryKey: ["setores-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("setores")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as Setor[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { nome: string; mercado: string; valor_cobranca_padrao: string }) => {
      const valorPorM2 = parseFloat(data.valor_cobranca_padrao) || 5;
      const { error } = await supabase
        .from("setores")
        .insert({ 
          nome: data.nome.toUpperCase().trim(),
          mercado: data.mercado.toUpperCase().trim() || null,
          valor_cobranca_padrao: Math.max(0.01, valorPorM2) // Valor por m²
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setores-manager"] });
      queryClient.invalidateQueries({ queryKey: ["setores-list"] });
      setNewSetor({ nome: "", mercado: "", valor_cobranca_padrao: "5.00" });
      setDialogOpen(false);
      toast.success("Setor adicionado!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao adicionar setor");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome, mercado, valor_cobranca_padrao }: { id: string; nome: string; mercado: string; valor_cobranca_padrao: string }) => {
      const valorPorM2 = parseFloat(valor_cobranca_padrao) || 5;
      const { error } = await supabase
        .from("setores")
        .update({ 
          nome: nome.toUpperCase().trim(),
          mercado: mercado.toUpperCase().trim() || null,
          valor_cobranca_padrao: Math.max(0.01, valorPorM2) // Valor por m²
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setores-manager"] });
      queryClient.invalidateQueries({ queryKey: ["setores-list"] });
      setEditingId(null);
      setEditingData({ nome: "", mercado: "", valor_cobranca_padrao: "" });
      toast.success("Setor atualizado!");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao atualizar setor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("setores").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["setores-manager"] });
      queryClient.invalidateQueries({ queryKey: ["setores-list"] });
      setDeleteDialogOpen(false);
      setSetorToDelete(null);
      toast.success("Setor removido!");
    },
    onError: (error: Error) => {
      if (error.message?.includes("violates foreign key")) {
        toast.error("Não é possível remover: setor está em uso por um ou mais boxes");
      } else {
        toast.error(error.message || "Erro ao remover setor");
      }
    },
  });

  const handleAdd = () => {
    if (!newSetor.nome.trim()) {
      toast.error("Digite o nome do setor");
      return;
    }
    if (!newSetor.mercado.trim()) {
      toast.error("Digite o prefixo/sigla do setor");
      return;
    }
    addMutation.mutate(newSetor);
  };

  const handleEdit = (setor: Setor) => {
    setEditingId(setor.id);
    setEditingData({ 
      nome: setor.nome, 
      mercado: setor.mercado || "", 
      valor_cobranca_padrao: String(setor.valor_cobranca_padrao || 50)
    });
  };

  const handleUpdate = () => {
    if (!editingId || !editingData.nome.trim()) return;
    updateMutation.mutate({ 
      id: editingId, 
      nome: editingData.nome, 
      mercado: editingData.mercado,
      valor_cobranca_padrao: editingData.valor_cobranca_padrao
    });
  };

  const handleDeleteClick = (setor: Setor) => {
    setSetorToDelete(setor);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (setorToDelete) {
      deleteMutation.mutate(setorToDelete.id);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Gerenciar Setores
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Setor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Setor</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Setor</Label>
                <Input
                  id="nome"
                  placeholder="Ex: MODELO EXTERNA"
                  value={newSetor.nome}
                  onChange={(e) => setNewSetor({ ...newSetor, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mercado">Prefixo/Sigla</Label>
                <Input
                  id="mercado"
                  placeholder="Ex: ME"
                  value={newSetor.mercado}
                  onChange={(e) => setNewSetor({ ...newSetor, mercado: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Usado na geração automática de código do box (ex: ME-001)
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="valor_cobranca">Valor por m² (R$)</Label>
                <Input
                  id="valor_cobranca"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="Ex: 5.00"
                  value={newSetor.valor_cobranca_padrao}
                  onChange={(e) => setNewSetor({ ...newSetor, valor_cobranca_padrao: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                />
                <p className="text-xs text-muted-foreground">
                  Cobrança = Área m² × Valor. Mínimo cobrado: R$ 50,00
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancelar</Button>
              </DialogClose>
              <Button onClick={handleAdd} disabled={addMutation.isPending}>
                {addMutation.isPending ? "Salvando..." : "Adicionar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-muted-foreground">Carregando...</p>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden sm:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Prefixo</TableHead>
                    <TableHead>Valor/m²</TableHead>
                    <TableHead className="w-24">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {setores?.map((setor) => (
                    <TableRow key={setor.id}>
                      <TableCell>
                        {editingId === setor.id ? (
                          <Input
                            value={editingData.nome}
                            onChange={(e) => setEditingData({ ...editingData, nome: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate();
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingData({ nome: "", mercado: "", valor_cobranca_padrao: "" });
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          setor.nome
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === setor.id ? (
                          <Input
                            value={editingData.mercado}
                            onChange={(e) => setEditingData({ ...editingData, mercado: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate();
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingData({ nome: "", mercado: "", valor_cobranca_padrao: "" });
                              }
                            }}
                          />
                        ) : (
                          <span className="font-mono bg-muted px-2 py-1 rounded text-sm">
                            {setor.mercado || "-"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingId === setor.id ? (
                          <Input
                            type="number"
                            step="0.01"
                            min="50"
                            value={editingData.valor_cobranca_padrao}
                            onChange={(e) => setEditingData({ ...editingData, valor_cobranca_padrao: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate();
                              if (e.key === "Escape") {
                                setEditingId(null);
                                setEditingData({ nome: "", mercado: "", valor_cobranca_padrao: "" });
                              }
                            }}
                            onBlur={handleUpdate}
                          />
                        ) : (
                          <span className="font-medium">
                            R$ {Number(setor.valor_cobranca_padrao || 50).toFixed(2)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(setor)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDeleteClick(setor)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!setores?.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        Nenhum setor cadastrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Cards */}
            <div className="sm:hidden space-y-3">
              {setores?.map((setor) => (
                <div 
                  key={setor.id} 
                  className="border rounded-lg p-3 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{setor.nome}</p>
                    <span className="font-mono bg-muted px-2 py-0.5 rounded text-xs">
                      {setor.mercado || "-"}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(setor)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteClick(setor)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {!setores?.length && (
                <p className="text-center text-muted-foreground py-4">
                  Nenhum setor cadastrado
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground">
            Tem certeza que deseja excluir o setor <strong>{setorToDelete?.nome}</strong>?
          </p>
          <p className="text-sm text-destructive">
            Esta ação não poderá ser desfeita. Setores em uso por boxes não podem ser removidos.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleConfirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
