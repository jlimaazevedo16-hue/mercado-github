import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, FileText, Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Template {
  id: string;
  nome: string;
  tipo: string;
  conteudo: string;
  variaveis: string[] | null;
  ativo: boolean;
  created_at: string;
}

const TEMPLATE_TYPES = [
  { value: "notificacao", label: "Notificação Institucional" },
  { value: "convocacao", label: "Convocação de Reunião" },
  { value: "pendencia", label: "Alerta de Pendência" },
  { value: "multa", label: "Aviso de Multa" },
  { value: "geral", label: "Comunicação Geral" },
];

const AVAILABLE_VARIABLES = [
  { key: "{{nome}}", description: "Nome do responsável" },
  { key: "{{box}}", description: "Número do box" },
  { key: "{{data}}", description: "Data formatada" },
  { key: "{{pendencia}}", description: "Descrição da pendência" },
  { key: "{{valor}}", description: "Valor em reais" },
  { key: "{{hora}}", description: "Horário" },
  { key: "{{local}}", description: "Local do evento" },
];

export const WhatsAppTemplates = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
    conteudo: "",
  });

  const { data: templates, isLoading } = useQuery({
    queryKey: ["whatsapp-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Template[];
    },
  });

  const extractVariables = (content: string): string[] => {
    const regex = /\{\{(\w+)\}\}/g;
    const matches = content.match(regex);
    return matches ? [...new Set(matches)] : [];
  };

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const variaveis = extractVariables(data.conteudo);
      const { error } = await supabase.from("whatsapp_templates").insert({
        nome: data.nome,
        tipo: data.tipo,
        conteudo: data.conteudo,
        variaveis,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template criado com sucesso!");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Erro ao criar template: " + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const variaveis = extractVariables(data.conteudo);
      const { error } = await supabase
        .from("whatsapp_templates")
        .update({
          nome: data.nome,
          tipo: data.tipo,
          conteudo: data.conteudo,
          variaveis,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      toast.success("Template atualizado com sucesso!");
      closeDialog();
    },
    onError: (error) => {
      toast.error("Erro ao atualizar template: " + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_templates")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    },
  });

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingTemplate(null);
    setFormData({ nome: "", tipo: "", conteudo: "" });
  };

  const openEditDialog = (template: Template) => {
    setEditingTemplate(template);
    setFormData({
      nome: template.nome,
      tipo: template.tipo,
      conteudo: template.conteudo,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = () => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const getTypeBadge = (tipo: string) => {
    const type = TEMPLATE_TYPES.find((t) => t.value === tipo);
    return <Badge variant="outline">{type?.label || tipo}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Templates de Mensagens
            </CardTitle>
            <CardDescription>
              Crie e gerencie modelos de mensagens para envio
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingTemplate(null)}>
                <Plus className="h-4 w-4 mr-2" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? "Editar Template" : "Criar Novo Template"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="nome">Nome do Template</Label>
                    <Input
                      id="nome"
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Ex: Aviso de Reunião"
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo">Tipo</Label>
                    <Select
                      value={formData.tipo}
                      onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {TEMPLATE_TYPES.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="conteudo">Conteúdo da Mensagem</Label>
                  <Textarea
                    id="conteudo"
                    value={formData.conteudo}
                    onChange={(e) => setFormData({ ...formData, conteudo: e.target.value })}
                    placeholder="Olá {{nome}}, informamos que..."
                    rows={6}
                  />
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Variáveis Disponíveis</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_VARIABLES.map((v) => (
                      <button
                        key={v.key}
                        type="button"
                        onClick={() =>
                          setFormData({
                            ...formData,
                            conteudo: formData.conteudo + v.key,
                          })
                        }
                        className="px-2 py-1 text-xs bg-background rounded border hover:bg-accent"
                        title={v.description}
                      >
                        {v.key}
                      </button>
                    ))}
                  </div>
                </div>

                {formData.conteudo && (
                  <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                      Prévia da Mensagem:
                    </p>
                    <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                      {formData.conteudo
                        .replace("{{nome}}", "João Silva")
                        .replace("{{box}}", "A-123")
                        .replace("{{data}}", "15/01/2026")
                        .replace("{{pendencia}}", "Taxa de condomínio em atraso")
                        .replace("{{valor}}", "R$ 150,00")
                        .replace("{{hora}}", "14:00")
                        .replace("{{local}}", "Sala de Reuniões")}
                    </p>
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="w-full"
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {editingTemplate ? "Salvar Alterações" : "Criar Template"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : templates?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhum template criado</p>
            <p className="text-sm">Clique em "Novo Template" para começar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Variáveis</TableHead>
                <TableHead>Ativo</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates?.map((template) => (
                <TableRow key={template.id}>
                  <TableCell className="font-medium">{template.nome}</TableCell>
                  <TableCell>{getTypeBadge(template.tipo)}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {template.variaveis?.map((v, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {v}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={template.ativo}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: template.id, ativo: checked })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    {format(new Date(template.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(template)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};
