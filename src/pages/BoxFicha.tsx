import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  ArrowLeft, Save, FileText, Wrench, History, Plus, 
  Calendar, User, MapPin, Building2, Trash2, Edit2 
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { DocumentsTable } from "@/components/documents/DocumentsTable";

const statusOptions = [
  "ASSINADO", "DISPONIVEL", "PROCESSO", "CANCELADO", 
  "DESATIVADO", "DEVOLVIDO", "INTERDITADO"
];

const BoxFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [activeMenuItem, setActiveMenuItem] = useState("boxes");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [newMaintenance, setNewMaintenance] = useState({ tipo: "", descricao: "", data_solicitacao: "", responsavel: "", custo: "" });
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [maintDialogOpen, setMaintDialogOpen] = useState(false);

  const { data: box, isLoading } = useQuery({
    queryKey: ["box", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("*, responsaveis(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: documents } = useQuery({
    queryKey: ["box-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_documents")
        .select("*")
        .eq("box_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: maintenances } = useQuery({
    queryKey: ["box-maintenances", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_maintenances")
        .select("*")
        .eq("box_id", id)
        .order("data_solicitacao", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: ["box-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_history")
        .select("*")
        .eq("box_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: responsaveis } = useQuery({
    queryKey: ["responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, nome")
        .eq("status", "ATIVO")
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (box) {
      setFormData(box);
    }
  }, [box]);

  const updateBoxMutation = useMutation({
    mutationFn: async (data: any) => {
      // Track changes for history
      const changes: any[] = [];
      if (box) {
        Object.keys(data).forEach(key => {
          if (box[key] !== data[key] && key !== 'updated_at' && key !== 'responsaveis') {
            changes.push({
              box_id: id,
              campo: key,
              valor_anterior: String(box[key] || ''),
              valor_novo: String(data[key] || ''),
              usuario_id: user?.id || null
            });
          }
        });
      }

      const { error } = await supabase
        .from("boxes")
        .update({
          codigo: data.codigo,
          boxe: data.boxe,
          setor: data.setor,
          inquilino: data.inquilino,
          area_m2: data.area_m2,
          atividades: data.atividades,
          status: data.status,
          responsavel_id: data.responsavel_id || null,
        })
        .eq("id", id);
      
      if (error) throw error;

      // Insert history records
      if (changes.length > 0) {
        const { error: historyError } = await supabase
          .from("box_history")
          .insert(changes);
        if (historyError) console.error("Error saving history:", historyError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["box", id] });
      queryClient.invalidateQueries({ queryKey: ["box-history", id] });
      setIsEditing(false);
      toast.success("Box atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar box. Verifique se está autenticado.");
    },
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (doc: {
      nome: string;
      tipo: string;
      descricao: string;
      data_emissao: string;
      data_validade: string;
      arquivo_url: string;
    }) => {
      const { error } = await supabase
        .from("box_documents")
        .insert({ 
          ...doc, 
          box_id: id,
          data_emissao: doc.data_emissao || null,
          data_validade: doc.data_validade || null,
        });
      if (error) throw error;
      
      logAction({
        action: 'CREATE_DOCUMENT',
        tableName: 'box_documents',
        recordId: id,
        newValues: { nome: doc.nome, tipo: doc.tipo }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["box-documents", id] });
      setDocDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao salvar documento. Verifique se está autenticado.");
    },
  });

  const addMaintenanceMutation = useMutation({
    mutationFn: async (maint: any) => {
      const { error } = await supabase
        .from("box_maintenances")
        .insert({ 
          ...maint, 
          box_id: id,
          custo: maint.custo ? parseFloat(maint.custo) : null
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["box-maintenances", id] });
      setNewMaintenance({ tipo: "", descricao: "", data_solicitacao: "", responsavel: "", custo: "" });
      setMaintDialogOpen(false);
      toast.success("Manutenção registrada!");
    },
    onError: () => {
      toast.error("Erro ao registrar manutenção. Verifique se está autenticado.");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("box_documents")
        .delete()
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["box-documents", id] });
      toast.success("Documento removido!");
    },
  });

  const updateMaintenanceStatusMutation = useMutation({
    mutationFn: async ({ maintId, status, data_execucao }: { maintId: string; status: string; data_execucao?: string }) => {
      const { error } = await supabase
        .from("box_maintenances")
        .update({ status, data_execucao: data_execucao || null })
        .eq("id", maintId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["box-maintenances", id] });
      toast.success("Status atualizado!");
    },
  });

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  }

  if (!box) {
    return <div className="flex min-h-screen items-center justify-center">Box não encontrado</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center gap-4 mb-6">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Ficha Cadastral do Box</h1>
              <p className="text-muted-foreground">
                {box.codigo} - {box.boxe}
              </p>
            </div>
            <div className="ml-auto flex gap-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(box); }}>
                    Cancelar
                  </Button>
                  <Button onClick={() => updateBoxMutation.mutate(formData)}>
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>

          <Tabs defaultValue="dados" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dados" className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Dados Gerais
              </TabsTrigger>
              <TabsTrigger value="documentos" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Documentos ({documents?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="manutencoes" className="flex items-center gap-2">
                <Wrench className="h-4 w-4" />
                Manutenções ({maintenances?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="historico" className="flex items-center gap-2">
                <History className="h-4 w-4" />
                Histórico ({history?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="dados">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Código</Label>
                        {isEditing ? (
                          <Input
                            value={formData.codigo || ""}
                            onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                          />
                        ) : (
                          <p className="text-lg font-medium">{box.codigo}</p>
                        )}
                      </div>
                      <div>
                        <Label>Nome do Box</Label>
                        {isEditing ? (
                          <Input
                            value={formData.boxe || ""}
                            onChange={(e) => setFormData({ ...formData, boxe: e.target.value })}
                          />
                        ) : (
                          <p className="text-lg font-medium">{box.boxe}</p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Setor</Label>
                        {isEditing ? (
                          <Input
                            value={formData.setor || ""}
                            onChange={(e) => setFormData({ ...formData, setor: e.target.value })}
                          />
                        ) : (
                          <p className="text-muted-foreground">{box.setor || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label>Área (m²)</Label>
                        {isEditing ? (
                          <Input
                            type="number"
                            value={formData.area_m2 || ""}
                            onChange={(e) => setFormData({ ...formData, area_m2: e.target.value })}
                          />
                        ) : (
                          <p className="text-muted-foreground">{box.area_m2 ? `${box.area_m2} m²` : "—"}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Status</Label>
                      {isEditing ? (
                        <Select
                          value={formData.status}
                          onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status} value={status}>
                                {status}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="mt-1">{box.status}</Badge>
                      )}
                    </div>

                    <div>
                      <Label>Atividades</Label>
                      {isEditing ? (
                        <Textarea
                          value={formData.atividades || ""}
                          onChange={(e) => setFormData({ ...formData, atividades: e.target.value })}
                          rows={3}
                        />
                      ) : (
                        <p className="text-muted-foreground">{box.atividades || "—"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Responsável / Inquilino</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Inquilino</Label>
                      {isEditing ? (
                        <Input
                          value={formData.inquilino || ""}
                          onChange={(e) => setFormData({ ...formData, inquilino: e.target.value })}
                        />
                      ) : (
                        <p className="text-lg font-medium">{box.inquilino || "Sem inquilino"}</p>
                      )}
                    </div>

                    <div>
                      <Label>Responsável Cadastrado</Label>
                      {isEditing ? (
                        <Select
                          value={formData.responsavel_id || ""}
                          onValueChange={(value) => setFormData({ ...formData, responsavel_id: value || null })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="">Nenhum</SelectItem>
                            {responsaveis?.map((resp) => (
                              <SelectItem key={resp.id} value={resp.id}>
                                {resp.nome}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{(box as any).responsaveis?.nome || "Não vinculado"}</span>
                          {(box as any).responsaveis && (
                            <Button
                              variant="link"
                              size="sm"
                              onClick={() => navigate(`/responsaveis/${(box as any).responsaveis.id}`)}
                            >
                              Ver ficha
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        <span>Criado em: {format(new Date(box.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Calendar className="h-4 w-4" />
                        <span>Atualizado em: {format(new Date(box.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="documentos">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Documentos</CardTitle>
                  <Button size="sm" onClick={() => setDocDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Documento
                  </Button>
                </CardHeader>
                <CardContent>
                  <DocumentsTable 
                    documents={documents || []}
                    onDelete={(docId) => deleteDocumentMutation.mutate(docId)}
                    isDeleting={deleteDocumentMutation.isPending}
                  />
                </CardContent>
              </Card>
              
              <DocumentUploadDialog
                open={docDialogOpen}
                onOpenChange={setDocDialogOpen}
                onUploadComplete={(docData) => addDocumentMutation.mutate(docData)}
                entityType="box"
                entityId={id || ""}
              />
            </TabsContent>

            <TabsContent value="manutencoes">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Histórico de Manutenções</CardTitle>
                  <Dialog open={maintDialogOpen} onOpenChange={setMaintDialogOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Registrar Manutenção
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Nova Manutenção</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>Tipo de Manutenção</Label>
                          <Select
                            value={newMaintenance.tipo}
                            onValueChange={(value) => setNewMaintenance({ ...newMaintenance, tipo: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Elétrica">Elétrica</SelectItem>
                              <SelectItem value="Hidráulica">Hidráulica</SelectItem>
                              <SelectItem value="Estrutural">Estrutural</SelectItem>
                              <SelectItem value="Pintura">Pintura</SelectItem>
                              <SelectItem value="Limpeza">Limpeza</SelectItem>
                              <SelectItem value="Outro">Outro</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Textarea
                            value={newMaintenance.descricao}
                            onChange={(e) => setNewMaintenance({ ...newMaintenance, descricao: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Data da Solicitação</Label>
                          <Input
                            type="date"
                            value={newMaintenance.data_solicitacao}
                            onChange={(e) => setNewMaintenance({ ...newMaintenance, data_solicitacao: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Responsável</Label>
                          <Input
                            value={newMaintenance.responsavel}
                            onChange={(e) => setNewMaintenance({ ...newMaintenance, responsavel: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label>Custo Estimado (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={newMaintenance.custo}
                            onChange={(e) => setNewMaintenance({ ...newMaintenance, custo: e.target.value })}
                          />
                        </div>
                        <Button 
                          className="w-full" 
                          onClick={() => addMaintenanceMutation.mutate(newMaintenance)}
                          disabled={!newMaintenance.tipo}
                        >
                          Registrar
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </CardHeader>
                <CardContent>
                  {maintenances && maintenances.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Descrição</TableHead>
                          <TableHead>Solicitação</TableHead>
                          <TableHead>Execução</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Custo</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {maintenances.map((maint) => (
                          <TableRow key={maint.id}>
                            <TableCell className="font-medium">{maint.tipo}</TableCell>
                            <TableCell className="max-w-[200px] truncate">{maint.descricao || "—"}</TableCell>
                            <TableCell>
                              {maint.data_solicitacao ? format(new Date(maint.data_solicitacao), "dd/MM/yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              {maint.data_execucao ? format(new Date(maint.data_execucao), "dd/MM/yyyy") : "—"}
                            </TableCell>
                            <TableCell>
                              <Badge variant={maint.status === "CONCLUIDO" ? "default" : "secondary"}>
                                {maint.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {maint.custo ? `R$ ${Number(maint.custo).toFixed(2)}` : "—"}
                            </TableCell>
                            <TableCell>
                              {maint.status !== "CONCLUIDO" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateMaintenanceStatusMutation.mutate({
                                    maintId: maint.id,
                                    status: "CONCLUIDO",
                                    data_execucao: new Date().toISOString().split('T')[0]
                                  })}
                                >
                                  Concluir
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma manutenção registrada
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="historico">
              <Card>
                <CardHeader>
                  <CardTitle>Histórico de Alterações</CardTitle>
                </CardHeader>
                <CardContent>
                  {history && history.length > 0 ? (
                    <div className="space-y-4">
                      {history.map((item) => (
                        <div key={item.id} className="flex items-start gap-4 p-4 border rounded-lg">
                          <History className="h-5 w-5 text-muted-foreground mt-0.5" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{item.campo.replace(/_/g, ' ')}</span>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(item.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                              </span>
                            </div>
                            <div className="mt-1 text-sm">
                              <span className="text-red-500 line-through">{item.valor_anterior || "(vazio)"}</span>
                              {" → "}
                              <span className="text-green-500">{item.valor_novo || "(vazio)"}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhuma alteração registrada
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default BoxFicha;