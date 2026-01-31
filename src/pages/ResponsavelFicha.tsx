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
import { 
  ArrowLeft, Save, FileText, History, Plus, 
  Calendar, User, Phone, Mail, MapPin, Edit2, Package, MessageCircle, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/hooks/useAuth";
import { useAuditLog } from "@/hooks/useAuditLog";
import { DocumentUploadDialog } from "@/components/documents/DocumentUploadDialog";
import { DocumentsTable } from "@/components/documents/DocumentsTable";
import { PhotoUpload } from "@/components/shared/PhotoUpload";
import { WhatsAppSendDialog } from "@/components/whatsapp/WhatsAppSendDialog";
import { VerificacaoHistorico } from "@/components/responsaveis/VerificacaoHistorico";
import { dispatchAtualizacaoCadastro } from "@/lib/emailDispatchService";

const ResponsavelFicha = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { logAction } = useAuditLog();
  const [activeMenuItem, setActiveMenuItem] = useState("responsaveis");
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [whatsappDialogOpen, setWhatsappDialogOpen] = useState(false);
  const isNew = id === "novo";

  const { data: responsavel, isLoading } = useQuery({
    queryKey: ["responsavel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id && !isNew,
  });

  const { data: documents } = useQuery({
    queryKey: ["responsavel-documents", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsavel_documents")
        .select("*")
        .eq("responsavel_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !isNew,
  });

  const { data: history } = useQuery({
    queryKey: ["responsavel-history", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsavel_history")
        .select("*")
        .eq("responsavel_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id && !isNew,
  });

  const { data: boxesVinculados } = useQuery({
    queryKey: ["boxes-responsavel", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("*")
        .eq("responsavel_id", id)
        .order("codigo");
      if (error) throw error;
      return data;
    },
    enabled: !!id && !isNew,
  });

  useEffect(() => {
    if (responsavel) {
      setFormData(responsavel);
    } else if (isNew) {
      setIsEditing(true);
      setFormData({ status: "ATIVO" });
    }
  }, [responsavel, isNew]);

  const createResponsavelMutation = useMutation({
    mutationFn: async (data: any) => {
      const { data: newResp, error } = await supabase
        .from("responsaveis")
        .insert(data)
        .select()
        .single();
      if (error) throw error;
      return newResp;
    },
    onSuccess: (data) => {
      toast.success("Responsável cadastrado com sucesso!");
      navigate(`/responsaveis/${data.id}`);
    },
    onError: () => {
      toast.error("Erro ao cadastrar. Verifique se está autenticado.");
    },
  });

  const updateResponsavelMutation = useMutation({
    mutationFn: async (data: any) => {
      const changes: any[] = [];
      const camposAlterados: string[] = [];
      
      if (responsavel) {
        Object.keys(data).forEach(key => {
          if (responsavel[key] !== data[key] && key !== 'updated_at') {
            changes.push({
              responsavel_id: id,
              campo: key,
              valor_anterior: String(responsavel[key] || ''),
              valor_novo: String(data[key] || ''),
              usuario_id: user?.id || null
            });
            // Format field name for email
            const fieldLabels: Record<string, string> = {
              nome: 'Nome',
              cpf: 'CPF',
              rg: 'RG',
              data_nascimento: 'Data de Nascimento',
              telefone: 'Telefone',
              telefone_secundario: 'Telefone Secundário',
              email: 'E-mail',
              endereco: 'Endereço',
              cidade: 'Cidade',
              estado: 'Estado',
              cep: 'CEP',
              status: 'Status',
            };
            if (fieldLabels[key]) {
              camposAlterados.push(fieldLabels[key]);
            }
          }
        });
      }

      const { error } = await supabase
        .from("responsaveis")
        .update({
          nome: data.nome,
          cpf: data.cpf,
          rg: data.rg,
          data_nascimento: data.data_nascimento || null,
          telefone: data.telefone,
          telefone_secundario: data.telefone_secundario,
          email: data.email,
          endereco: data.endereco,
          cidade: data.cidade,
          estado: data.estado,
          cep: data.cep,
          observacoes: data.observacoes,
          status: data.status,
          imagem_url: data.imagem_url || null,
        })
        .eq("id", id);
      
      if (error) throw error;

      if (changes.length > 0) {
        const { error: historyError } = await supabase
          .from("responsavel_history")
          .insert(changes);
        if (historyError) console.error("Error saving history:", historyError);

        // Send email notification about the update (if responsavel has email)
        if (data.email && camposAlterados.length > 0) {
          dispatchAtualizacaoCadastro({
            destinatario: data.email,
            destinatario_nome: data.nome,
            campos_alterados: camposAlterados,
            link: `${window.location.origin}/responsaveis/${id}`,
            responsavel_id: id,
          }, user?.id).catch(err => console.error('Error dispatching email:', err));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsavel", id] });
      queryClient.invalidateQueries({ queryKey: ["responsavel-history", id] });
      setIsEditing(false);
      toast.success("Responsável atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar. Verifique se está autenticado.");
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
        .from("responsavel_documents")
        .insert({ 
          ...doc, 
          responsavel_id: id,
          data_emissao: doc.data_emissao || null,
          data_validade: doc.data_validade || null,
        });
      if (error) throw error;
      
      logAction({
        action: 'CREATE_DOCUMENT',
        tableName: 'responsavel_documents',
        recordId: id,
        newValues: { nome: doc.nome, tipo: doc.tipo }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsavel-documents", id] });
      setDocDialogOpen(false);
    },
    onError: () => {
      toast.error("Erro ao salvar documento. Verifique se está autenticado.");
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("responsavel_documents")
        .delete()
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["responsavel-documents", id] });
      toast.success("Documento removido!");
    },
  });

  const handleSave = () => {
    if (!formData.nome) {
      toast.error("Nome é obrigatório");
      return;
    }
    if (isNew) {
      createResponsavelMutation.mutate(formData);
    } else {
      updateResponsavelMutation.mutate(formData);
    }
  };

  if (isLoading && !isNew) {
    return <div className="flex min-h-screen items-center justify-center">Carregando...</div>;
  }

  if (!responsavel && !isNew) {
    return <div className="flex min-h-screen items-center justify-center">Responsável não encontrado</div>;
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
              <h1 className="text-2xl font-bold">
                {isNew ? "Novo Responsável" : "Ficha Cadastral do Responsável"}
              </h1>
              {!isNew && (
                <p className="text-muted-foreground">{responsavel?.nome}</p>
              )}
            </div>
            <div className="ml-auto flex gap-2">
              {/* WhatsApp Button */}
              {!isNew && responsavel?.telefone && (
                <Button 
                  variant="outline" 
                  onClick={() => setWhatsappDialogOpen(true)}
                  className="text-green-600 border-green-600 hover:bg-green-50"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  WhatsApp
                </Button>
              )}
              
              {isEditing ? (
                <>
                  {!isNew && (
                    <Button variant="outline" onClick={() => { setIsEditing(false); setFormData(responsavel); }}>
                      Cancelar
                    </Button>
                  )}
                  <Button onClick={handleSave}>
                    <Save className="h-4 w-4 mr-2" />
                    {isNew ? "Cadastrar" : "Salvar"}
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

          {/* WhatsApp Dialog */}
          {!isNew && responsavel && (
            <WhatsAppSendDialog
              open={whatsappDialogOpen}
              onOpenChange={setWhatsappDialogOpen}
              destinatario={{
                nome: responsavel.nome,
                telefone: responsavel.telefone || "",
                responsavel_id: responsavel.id,
              }}
            />
          )}

          <Tabs defaultValue="dados" className="space-y-4">
            <TabsList>
              <TabsTrigger value="dados" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Dados Pessoais
              </TabsTrigger>
              {!isNew && (
                <>
                  <TabsTrigger value="boxes" className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Boxes ({boxesVinculados?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="documentos" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Documentos ({documents?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="historico" className="flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Histórico ({history?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="verificacao" className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    Verificação
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="dados">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Photo Card */}
                <Card className="lg:row-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg">Foto do Responsável</CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center">
                    <PhotoUpload
                      currentPhotoUrl={formData.imagem_url}
                      onPhotoChange={(url) => setFormData({ ...formData, imagem_url: url })}
                      isEditing={isEditing}
                      entityType="responsavel"
                      entityId={id}
                      entityName={formData.nome}
                      size="lg"
                    />
                    <p className="text-sm text-muted-foreground text-center mt-4">
                      Foto para identificação administrativa
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Informações Pessoais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Nome Completo *</Label>
                      {isEditing ? (
                        <Input
                          value={formData.nome || ""}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        />
                      ) : (
                        <p className="text-lg font-medium">{responsavel?.nome}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>CPF</Label>
                        {isEditing ? (
                          <Input
                            value={formData.cpf || ""}
                            onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                            placeholder="000.000.000-00"
                          />
                        ) : (
                          <p className="text-muted-foreground">{responsavel?.cpf || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label>RG</Label>
                        {isEditing ? (
                          <Input
                            value={formData.rg || ""}
                            onChange={(e) => setFormData({ ...formData, rg: e.target.value })}
                          />
                        ) : (
                          <p className="text-muted-foreground">{responsavel?.rg || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Data de Nascimento</Label>
                      {isEditing ? (
                        <Input
                          type="date"
                          value={formData.data_nascimento || ""}
                          onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                        />
                      ) : (
                        <p className="text-muted-foreground">
                          {responsavel?.data_nascimento 
                            ? format(new Date(responsavel.data_nascimento), "dd/MM/yyyy") 
                            : "—"}
                        </p>
                      )}
                    </div>

                    <div>
                      <Label>Status</Label>
                      {isEditing ? (
                        <Select
                          value={formData.status || "ATIVO"}
                          onValueChange={(value) => setFormData({ ...formData, status: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="ATIVO">Ativo</SelectItem>
                            <SelectItem value="INATIVO">Inativo</SelectItem>
                            <SelectItem value="SUSPENSO">Suspenso</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className="mt-1">{responsavel?.status}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Contato</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Telefone Principal
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.telefone || ""}
                            onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                            placeholder="(00) 00000-0000"
                          />
                        ) : (
                          <p className="text-muted-foreground">{responsavel?.telefone || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label className="flex items-center gap-2">
                          <Phone className="h-4 w-4" />
                          Telefone Secundário
                        </Label>
                        {isEditing ? (
                          <Input
                            value={formData.telefone_secundario || ""}
                            onChange={(e) => setFormData({ ...formData, telefone_secundario: e.target.value })}
                          />
                        ) : (
                          <p className="text-muted-foreground">{responsavel?.telefone_secundario || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        E-mail
                      </Label>
                      {isEditing ? (
                        <Input
                          type="email"
                          value={formData.email || ""}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      ) : (
                        <p className="text-muted-foreground">{responsavel?.email || "—"}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <MapPin className="h-5 w-5" />
                      Endereço
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Endereço Completo</Label>
                      {isEditing ? (
                        <Textarea
                          value={formData.endereco || ""}
                          onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                          placeholder="Rua, número, complemento, bairro"
                        />
                      ) : (
                        <p className="text-muted-foreground">{responsavel?.endereco || "—"}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Cidade</Label>
                        {isEditing ? (
                          <Input
                            value={formData.cidade || ""}
                            onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                          />
                        ) : (
                          <p className="text-muted-foreground">{responsavel?.cidade || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label>Estado</Label>
                        {isEditing ? (
                          <Input
                            value={formData.estado || ""}
                            onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                            maxLength={2}
                            placeholder="UF"
                          />
                        ) : (
                          <p className="text-muted-foreground">{responsavel?.estado || "—"}</p>
                        )}
                      </div>
                      <div>
                        <Label>CEP</Label>
                        {isEditing ? (
                          <Input
                            value={formData.cep || ""}
                            onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                            placeholder="00000-000"
                          />
                        ) : (
                          <p className="text-muted-foreground">{responsavel?.cep || "—"}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <Label>Observações</Label>
                      {isEditing ? (
                        <Textarea
                          value={formData.observacoes || ""}
                          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                          rows={4}
                        />
                      ) : (
                        <p className="text-muted-foreground">{responsavel?.observacoes || "—"}</p>
                      )}
                    </div>

                    {!isNew && (
                      <div className="pt-4 border-t">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Criado em: {format(new Date(responsavel!.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <Calendar className="h-4 w-4" />
                          <span>Atualizado em: {format(new Date(responsavel!.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {!isNew && (
              <>
                <TabsContent value="boxes">
                  <Card>
                    <CardHeader>
                      <CardTitle>Boxes Vinculados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {boxesVinculados && boxesVinculados.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Código</TableHead>
                              <TableHead>Nome</TableHead>
                              <TableHead>Setor</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {boxesVinculados.map((box) => (
                              <TableRow key={box.id}>
                                <TableCell className="font-medium">{box.codigo}</TableCell>
                                <TableCell>{box.boxe}</TableCell>
                                <TableCell>{box.setor || "—"}</TableCell>
                                <TableCell>
                                  <Badge>{box.status}</Badge>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => navigate(`/boxes/${box.id}`)}
                                  >
                                    Ver ficha
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          Nenhum box vinculado a este responsável
                        </p>
                      )}
                    </CardContent>
                  </Card>
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
                    entityType="responsavel"
                    entityId={id || ""}
                  />
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

                <TabsContent value="verificacao">
                  <VerificacaoHistorico
                    responsavelId={id!}
                    responsavelData={{
                      nome: responsavel?.nome || '',
                      email: responsavel?.email,
                      telefone: responsavel?.telefone,
                      data_nascimento: responsavel?.data_nascimento,
                      verificacao_status: (responsavel as any)?.verificacao_status,
                      verificacao_data: (responsavel as any)?.verificacao_data,
                    }}
                    boxes={boxesVinculados?.map(b => ({ codigo: b.codigo, setor: b.setor }))}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default ResponsavelFicha;