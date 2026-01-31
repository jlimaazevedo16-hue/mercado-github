import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, Tag, Loader2, Settings2 } from "lucide-react";
import { toast } from "sonner";

interface TipoReceita {
  id: string;
  nome: string;
  categoria: string;
  ativo: boolean;
  created_at: string;
}

export function TiposReceitaManager() {
  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("Operacional");
  const queryClient = useQueryClient();

  const { data: tipos = [], isLoading } = useQuery({
    queryKey: ["tipos-receita"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_receita")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data as TipoReceita[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { nome: string; categoria: string }) => {
      const { error } = await supabase.from("tipos_receita").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-receita"] });
      toast.success("Tipo de receita criado!");
      setNome("");
      setCategoria("Operacional");
      setIsOpen(false);
    },
    onError: () => toast.error("Erro ao criar tipo de receita"),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("tipos_receita")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tipos-receita"] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    createMutation.mutate({ nome, categoria });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-lg">Tipos de Receita</CardTitle>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Tipo
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Tipo de Receita</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Uso de Banheiro"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <Select value={categoria} onValueChange={setCategoria}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Operacional">Operacional</SelectItem>
                      <SelectItem value="Administrativa">Administrativa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={createMutation.isPending}>
                    {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Criar
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tipos.length === 0 ? (
          <p className="text-center text-muted-foreground py-4">Nenhum tipo cadastrado</p>
        ) : (
          <div className="space-y-2">
            {tipos.map((tipo) => (
              <div
                key={tipo.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{tipo.nome}</p>
                    <Badge variant="outline" className="text-xs">
                      {tipo.categoria}
                    </Badge>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {tipo.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <Switch
                    checked={tipo.ativo}
                    onCheckedChange={(checked) =>
                      toggleMutation.mutate({ id: tipo.id, ativo: checked })
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
