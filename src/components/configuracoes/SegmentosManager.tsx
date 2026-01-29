import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export const SegmentosManager = () => {
  const queryClient = useQueryClient();
  const [newSegmento, setNewSegmento] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingNome, setEditingNome] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: segmentos, isLoading } = useQuery({
    queryKey: ["segmentos-manager"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("segmentos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (nome: string) => {
      const { error } = await supabase
        .from("segmentos")
        .insert({ nome: nome.toUpperCase().trim() });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segmentos-manager"] });
      queryClient.invalidateQueries({ queryKey: ["segmentos-list"] });
      setNewSegmento("");
      setDialogOpen(false);
      toast.success("Segmento adicionado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao adicionar segmento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, nome }: { id: string; nome: string }) => {
      const { error } = await supabase
        .from("segmentos")
        .update({ nome: nome.toUpperCase().trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segmentos-manager"] });
      queryClient.invalidateQueries({ queryKey: ["segmentos-list"] });
      setEditingId(null);
      setEditingNome("");
      toast.success("Segmento atualizado!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar segmento");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("segmentos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["segmentos-manager"] });
      queryClient.invalidateQueries({ queryKey: ["segmentos-list"] });
      toast.success("Segmento removido!");
    },
    onError: (error: any) => {
      if (error.message?.includes("violates foreign key")) {
        toast.error("Não é possível remover: segmento está em uso");
      } else {
        toast.error(error.message || "Erro ao remover segmento");
      }
    },
  });

  const handleAdd = () => {
    if (!newSegmento.trim()) {
      toast.error("Digite o nome do segmento");
      return;
    }
    addMutation.mutate(newSegmento);
  };

  const handleEdit = (id: string, nome: string) => {
    setEditingId(id);
    setEditingNome(nome);
  };

  const handleUpdate = () => {
    if (!editingId || !editingNome.trim()) return;
    updateMutation.mutate({ id: editingId, nome: editingNome });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Tag className="h-5 w-5" />
          Gerenciar Segmentos
        </CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Novo Segmento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Segmento</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Input
                placeholder="Nome do segmento"
                value={newSegmento}
                onChange={(e) => setNewSegmento(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              />
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {segmentos?.map((seg) => (
                <TableRow key={seg.id}>
                  <TableCell>
                    {editingId === seg.id ? (
                      <Input
                        value={editingNome}
                        onChange={(e) => setEditingNome(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleUpdate();
                          if (e.key === "Escape") {
                            setEditingId(null);
                            setEditingNome("");
                          }
                        }}
                        onBlur={handleUpdate}
                        autoFocus
                      />
                    ) : (
                      seg.nome
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(seg.id, seg.nome)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate(seg.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!segmentos?.length && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-muted-foreground">
                    Nenhum segmento cadastrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
