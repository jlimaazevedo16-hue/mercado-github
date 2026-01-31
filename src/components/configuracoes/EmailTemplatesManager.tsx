import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Edit2, Trash2, Eye, Copy, FileText, Mail, Save, Code, Loader2 } from "lucide-react";
import { EmailTemplatePreview } from "./EmailTemplatePreview";

interface EmailTemplate {
  id: string;
  nome: string;
  slug: string;
  categoria: string;
  assunto: string;
  conteudo: string;
  variaveis: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

const categorias = [
  { value: "institucional", label: "Institucional" },
  { value: "fiscalizacao", label: "Fiscalização" },
  { value: "financeiro", label: "Financeiro" },
  { value: "alerta", label: "Alerta" },
  { value: "sistema", label: "Sistema" },
  { value: "geral", label: "Geral" },
];

const variaveisDisponiveis = [
  { nome: "nome", descricao: "Nome do destinatário" },
  { nome: "email", descricao: "E-mail do destinatário" },
  { nome: "box", descricao: "Código do box" },
  { nome: "responsavel", descricao: "Nome do responsável" },
  { nome: "data", descricao: "Data atual" },
  { nome: "prazo", descricao: "Data do prazo" },
  { nome: "mensagem", descricao: "Mensagem personalizada" },
  { nome: "titulo", descricao: "Título do e-mail" },
  { nome: "documento", descricao: "Nome do documento" },
  { nome: "referencia", descricao: "Referência (Box/Responsável)" },
  { nome: "data_vencimento", descricao: "Data de vencimento" },
  { nome: "dias_restantes", descricao: "Dias restantes" },
  { nome: "valor", descricao: "Valor monetário" },
  { nome: "mes_referencia", descricao: "Mês de referência" },
  { nome: "vencimento", descricao: "Data de vencimento" },
  { nome: "instituicao", descricao: "Nome da instituição" },
  { nome: "link", descricao: "Link de ação" },
  { nome: "assunto", descricao: "Assunto do e-mail" },
  { nome: "conteudo", descricao: "Conteúdo principal" },
  { nome: "cor_primaria", descricao: "Cor primária institucional" },
];

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [filterCategoria, setFilterCategoria] = useState<string>("all");

  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
    categoria: "geral",
    assunto: "",
    conteudo: "",
    variaveis: [] as string[],
    ativo: true,
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("categoria", { ascending: true })
        .order("nome", { ascending: true });

      if (error) throw error;
      setTemplates((data as EmailTemplate[]) || []);
    } catch (error: any) {
      console.error("Error fetching templates:", error);
      toast.error("Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  const extractVariables = (text: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = new Set<string>();
    let match;
    while ((match = regex.exec(text)) !== null) {
      matches.add(match[1]);
    }
    return Array.from(matches);
  };

  const handleContentChange = (content: string) => {
    const extractedVars = extractVariables(content + formData.assunto);
    setFormData({ ...formData, conteudo: content, variaveis: extractedVars });
  };

  const handleSubjectChange = (subject: string) => {
    const extractedVars = extractVariables(formData.conteudo + subject);
    setFormData({ ...formData, assunto: subject, variaveis: extractedVars });
  };

  const generateSlug = (nome: string): string => {
    return nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
  };

  const handleNomeChange = (nome: string) => {
    setFormData({
      ...formData,
      nome,
      slug: editMode ? formData.slug : generateSlug(nome),
    });
  };

  const resetForm = () => {
    setFormData({
      nome: "",
      slug: "",
      categoria: "geral",
      assunto: "",
      conteudo: "",
      variaveis: [],
      ativo: true,
    });
    setEditMode(false);
    setSelectedTemplate(null);
  };

  const handleEdit = (template: EmailTemplate) => {
    setFormData({
      nome: template.nome,
      slug: template.slug,
      categoria: template.categoria,
      assunto: template.assunto,
      conteudo: template.conteudo,
      variaveis: template.variaveis || [],
      ativo: template.ativo,
    });
    setSelectedTemplate(template);
    setEditMode(true);
    setDialogOpen(true);
  };

  const handlePreview = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nome || !formData.slug || !formData.assunto || !formData.conteudo) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    setSaving(true);
    try {
      if (editMode && selectedTemplate) {
        const { error } = await supabase
          .from("email_templates")
          .update({
            nome: formData.nome,
            slug: formData.slug,
            categoria: formData.categoria,
            assunto: formData.assunto,
            conteudo: formData.conteudo,
            variaveis: formData.variaveis,
            ativo: formData.ativo,
          })
          .eq("id", selectedTemplate.id);

        if (error) throw error;
        toast.success("Template atualizado com sucesso!");
      } else {
        const { error } = await supabase
          .from("email_templates")
          .insert({
            nome: formData.nome,
            slug: formData.slug,
            categoria: formData.categoria,
            assunto: formData.assunto,
            conteudo: formData.conteudo,
            variaveis: formData.variaveis,
            ativo: formData.ativo,
          });

        if (error) throw error;
        toast.success("Template criado com sucesso!");
      }

      fetchTemplates();
      setDialogOpen(false);
      resetForm();
    } catch (error: any) {
      console.error("Error saving template:", error);
      if (error.code === "23505") {
        toast.error("Já existe um template com esse slug");
      } else {
        toast.error("Erro ao salvar template");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Deseja realmente excluir o template "${template.nome}"?`)) return;

    try {
      const { error } = await supabase
        .from("email_templates")
        .delete()
        .eq("id", template.id);

      if (error) throw error;
      toast.success("Template excluído com sucesso!");
      fetchTemplates();
    } catch (error: any) {
      console.error("Error deleting template:", error);
      toast.error("Erro ao excluir template");
    }
  };

  const handleDuplicate = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from("email_templates")
        .insert({
          nome: `${template.nome} (Cópia)`,
          slug: `${template.slug}_copy_${Date.now()}`,
          categoria: template.categoria,
          assunto: template.assunto,
          conteudo: template.conteudo,
          variaveis: template.variaveis,
          ativo: false,
        });

      if (error) throw error;
      toast.success("Template duplicado com sucesso!");
      fetchTemplates();
    } catch (error: any) {
      console.error("Error duplicating template:", error);
      toast.error("Erro ao duplicar template");
    }
  };

  const handleToggleAtivo = async (template: EmailTemplate) => {
    try {
      const { error } = await supabase
        .from("email_templates")
        .update({ ativo: !template.ativo })
        .eq("id", template.id);

      if (error) throw error;
      toast.success(template.ativo ? "Template desativado" : "Template ativado");
      fetchTemplates();
    } catch (error: any) {
      console.error("Error toggling template:", error);
      toast.error("Erro ao alterar status");
    }
  };

  const insertVariable = (variavel: string) => {
    const newContent = formData.conteudo + `{{${variavel}}}`;
    handleContentChange(newContent);
  };

  const filteredTemplates = filterCategoria === "all"
    ? templates
    : templates.filter(t => t.categoria === filterCategoria);

  const getCategoriaColor = (categoria: string) => {
    const colors: Record<string, string> = {
      institucional: "bg-blue-100 text-blue-800",
      fiscalizacao: "bg-red-100 text-red-800",
      financeiro: "bg-green-100 text-green-800",
      alerta: "bg-amber-100 text-amber-800",
      sistema: "bg-purple-100 text-purple-800",
      geral: "bg-gray-100 text-gray-800",
    };
    return colors[categoria] || colors.geral;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Carregando templates...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <div>
                <CardTitle>Templates de E-mail</CardTitle>
                <CardDescription>
                  Gerencie templates reutilizáveis com variáveis dinâmicas
                </CardDescription>
              </div>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Template
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <DialogHeader>
                  <DialogTitle>
                    {editMode ? "Editar Template" : "Novo Template"}
                  </DialogTitle>
                  <DialogDescription>
                    Use variáveis no formato {"{{variavel}}"} para conteúdo dinâmico
                  </DialogDescription>
                </DialogHeader>
                
                <Tabs defaultValue="editor" className="flex-1 overflow-hidden">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="editor" className="gap-2">
                      <Code className="h-4 w-4" />
                      Editor
                    </TabsTrigger>
                    <TabsTrigger value="preview" className="gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="editor" className="flex-1 overflow-auto">
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Nome do Template *</Label>
                            <Input
                              value={formData.nome}
                              onChange={(e) => handleNomeChange(e.target.value)}
                              placeholder="Ex: Notificação de Vencimento"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Slug (identificador) *</Label>
                            <Input
                              value={formData.slug}
                              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                              placeholder="Ex: notificacao_vencimento"
                              disabled={editMode}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Categoria</Label>
                            <Select
                              value={formData.categoria}
                              onValueChange={(value) => setFormData({ ...formData, categoria: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categorias.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2 flex items-end">
                            <div className="flex items-center gap-3">
                              <Switch
                                checked={formData.ativo}
                                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
                              />
                              <Label>Template Ativo</Label>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Assunto do E-mail *</Label>
                          <Input
                            value={formData.assunto}
                            onChange={(e) => handleSubjectChange(e.target.value)}
                            placeholder="Ex: Alerta: {{documento}} vence em {{dias_restantes}} dias"
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label>Conteúdo HTML *</Label>
                            <div className="flex flex-wrap gap-1">
                              {variaveisDisponiveis.slice(0, 6).map((v) => (
                                <Button
                                  key={v.nome}
                                  variant="outline"
                                  size="sm"
                                  className="h-6 text-xs"
                                  onClick={() => insertVariable(v.nome)}
                                  title={v.descricao}
                                >
                                  {`{{${v.nome}}}`}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <Textarea
                            value={formData.conteudo}
                            onChange={(e) => handleContentChange(e.target.value)}
                            placeholder="<h2>Olá, {{nome}}!</h2>..."
                            className="font-mono text-sm min-h-[200px]"
                          />
                        </div>

                        {formData.variaveis.length > 0 && (
                          <div className="space-y-2">
                            <Label>Variáveis Detectadas</Label>
                            <div className="flex flex-wrap gap-2">
                              {formData.variaveis.map((v) => (
                                <Badge key={v} variant="secondary">
                                  {`{{${v}}}`}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="border rounded-lg p-4 bg-muted/30">
                          <Label className="text-sm text-muted-foreground">Variáveis Disponíveis</Label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                            {variaveisDisponiveis.map((v) => (
                              <Button
                                key={v.nome}
                                variant="ghost"
                                size="sm"
                                className="justify-start h-auto py-1 px-2 text-xs"
                                onClick={() => insertVariable(v.nome)}
                              >
                                <code className="mr-2">{`{{${v.nome}}}`}</code>
                                <span className="text-muted-foreground truncate">{v.descricao}</span>
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>
                  </TabsContent>
                  
                  <TabsContent value="preview" className="flex-1">
                    <ScrollArea className="h-[500px]">
                      <EmailTemplatePreview
                        assunto={formData.assunto}
                        conteudo={formData.conteudo}
                      />
                    </ScrollArea>
                  </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        {editMode ? "Salvar Alterações" : "Criar Template"}
                      </>
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter */}
          <div className="flex items-center gap-4 mb-4">
            <Label>Filtrar por categoria:</Label>
            <Select value={filterCategoria} onValueChange={setFilterCategoria}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categorias.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground ml-auto">
              {filteredTemplates.length} template(s)
            </span>
          </div>

          {/* Table */}
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Variáveis</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTemplates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum template encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTemplates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.nome}</p>
                          <code className="text-xs text-muted-foreground">{template.slug}</code>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCategoriaColor(template.categoria)}>
                          {categorias.find(c => c.value === template.categoria)?.label || template.categoria}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {template.assunto}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(template.variaveis || []).slice(0, 3).map((v) => (
                            <Badge key={v} variant="outline" className="text-xs">
                              {v}
                            </Badge>
                          ))}
                          {(template.variaveis || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.variaveis.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={template.ativo}
                          onCheckedChange={() => handleToggleAtivo(template)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePreview(template)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(template)}
                            title="Editar"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDuplicate(template)}
                            title="Duplicar"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(template)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Preview: {selectedTemplate?.nome}
            </DialogTitle>
          </DialogHeader>
          {selectedTemplate && (
            <EmailTemplatePreview
              assunto={selectedTemplate.assunto}
              conteudo={selectedTemplate.conteudo}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
