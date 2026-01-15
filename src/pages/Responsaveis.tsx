import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Users, UserCheck, UserX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const Responsaveis = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeMenuItem, setActiveMenuItem] = useState("responsaveis");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: responsaveis, isLoading } = useQuery({
    queryKey: ["responsaveis-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("responsaveis")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsaveis-list"] });
      toast.success("Responsável removido!");
    },
    onError: () => {
      toast.error("Erro ao remover. Verifique se está autenticado.");
    },
  });

  const filteredResponsaveis = responsaveis?.filter(
    (r) =>
      r.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.cpf?.includes(searchTerm) ||
      r.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: responsaveis?.length || 0,
    ativos: responsaveis?.filter((r) => r.status === "ATIVO").length || 0,
    inativos: responsaveis?.filter((r) => r.status !== "ATIVO").length || 0,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Responsáveis</h1>
            <Button onClick={() => navigate("/responsaveis/novo")}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Responsável
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-lg">
                  <UserCheck className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ativos</p>
                  <p className="text-2xl font-bold">{stats.ativos}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-red-100 rounded-lg">
                  <UserX className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Inativos</p>
                  <p className="text-2xl font-bold">{stats.inativos}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome, CPF ou e-mail..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8">Carregando...</p>
              ) : filteredResponsaveis && filteredResponsaveis.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>E-mail</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResponsaveis.map((resp) => (
                      <TableRow
                        key={resp.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => navigate(`/responsaveis/${resp.id}`)}
                      >
                        <TableCell className="font-medium">{resp.nome}</TableCell>
                        <TableCell>{resp.cpf || "—"}</TableCell>
                        <TableCell>{resp.telefone || "—"}</TableCell>
                        <TableCell>{resp.email || "—"}</TableCell>
                        <TableCell>
                          <Badge
                            variant={resp.status === "ATIVO" ? "default" : "secondary"}
                          >
                            {resp.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {format(new Date(resp.created_at), "dd/MM/yyyy")}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Deseja remover este responsável?")) {
                                deleteMutation.mutate(resp.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Nenhum responsável encontrado
                </p>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Responsaveis;