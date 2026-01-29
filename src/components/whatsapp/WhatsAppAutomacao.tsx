import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Bot, Plus, Loader2, Trash2, Edit, Zap, Clock, MessageSquare } from "lucide-react";
import { toast } from "sonner";

interface Automacao {
  id: string;
  nome: string;
  gatilho_tipo: string;
  gatilho_valor: string;
  template_id: string | null;
  resposta_customizada: string | null;
  ativo: boolean;
  uma_vez_por_conversa: boolean;
  respeitar_horario: boolean;
  whatsapp_templates: { nome: string } | null;
}

export const WhatsAppAutomacao = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    gatilho_tipo: "palavra_chave",
    gatilho_valor: "",
    template_id: "",
    resposta_customizada: "",
    uma_vez_por_conversa: true,
    respeitar_horario: true,
  });

  const { data: automacoes, isLoading } = useQuery({
    queryKey: ["whatsapp-automacoes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_automacoes")
        .select(`
          *,
          whatsapp_templates (nome)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Automacao[];
    },
  });

  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("id, nome")
        .eq("ativo", true);

      if (error) throw error;
      return data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        nome: data.nome,
        gatilho_tipo: data.gatilho_tipo,
        gatilho_valor: data.gatilho_valor,
        template_id: data.template_id || null,
        resposta_customizada: data.resposta_customizada || null,
        uma_vez_por_conversa: data.uma_vez_por_conversa,
        respeitar_horario: data.respeitar_horario,
        ativo: true,
      };

      if (editingId) {
        const { error } = await supabase
          .from("whatsapp_automacoes")
          .update(payload)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("whatsapp_automacoes")
          .insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-automacoes"] });
      toast.success(editingId ? "Automação atualizada!" : "Automação criada!");
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro: " + error.message);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from("whatsapp_automacoes")
        .update({ ativo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-automacoes"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_automacoes")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-automacoes"] });
      toast.success("Automação removida");
    },
  });

  const resetForm = () => {
    setFormData({
      nome: "",
      gatilho_tipo: "palavra_chave",
      gatilho_valor: "",
      template_id: "",
      resposta_customizada: "",
      uma_vez_por_conversa: true,
      respeitar_horario: true,
    });
    setEditingId(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (automacao: Automacao) => {
    setFormData({
      nome: automacao.nome,
      gatilho_tipo: automacao.gatilho_tipo,
      gatilho_valor: automacao.gatilho_valor,
      template_id: automacao.template_id || "",
      resposta_customizada: automacao.resposta_customizada || "",
      uma_vez_por_conversa: automacao.uma_vez_por_conversa,
      respeitar_horario: automacao.respeitar_horario,
    });
    setEditingId(automacao.id);
    setIsDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              Automações
            </CardTitle>
            <CardDescription>
              Configure respostas automáticas para mensagens recebidas
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Automação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingId ? "Editar Automação" : "Nova Automação"}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Automação</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: Boas-vindas"
                  />
                </div>

                <div>
                  <Label>Tipo de Gatilho</Label>
                  <Select
                    value={formData.gatilho_tipo}
                    onValueChange={(v) => setFormData({ ...formData, gatilho_tipo: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="palavra_chave">Palavra-chave</SelectItem>
                      <SelectItem value="tipo_mensagem">Tipo de Mensagem</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="gatilho_valor">
                    {formData.gatilho_tipo === "palavra_chave" 
                      ? "Palavras-chave (separadas por vírgula)" 
                      : "Tipo de mensagem"}
                  </Label>
                  {formData.gatilho_tipo === "palavra_chave" ? (
                    <Input
                      id="gatilho_valor"
                      value={formData.gatilho_valor}
                      onChange={(e) => setFormData({ ...formData, gatilho_valor: e.target.value })}
                      placeholder="olá, oi, bom dia, boa tarde"
                    />
                  ) : (
                    <Select
                      value={formData.gatilho_valor}
                      onValueChange={(v) => setFormData({ ...formData, gatilho_valor: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="texto">Texto</SelectItem>
                        <SelectItem value="imagem">Imagem</SelectItem>
                        <SelectItem value="audio">Áudio</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                <div>
                  <Label>Resposta (Template ou Customizada)</Label>
                  <Select
                    value={formData.template_id}
                    onValueChange={(v) => setFormData({ ...formData, template_id: v, resposta_customizada: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="custom">Resposta customizada</SelectItem>
                      {templates?.filter(t => t.id).map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.template_id === "custom" && (
                  <div>
                    <Label htmlFor="resposta">Mensagem de Resposta</Label>
                    <Textarea
                      id="resposta"
                      value={formData.resposta_customizada}
                      onChange={(e) => setFormData({ ...formData, resposta_customizada: e.target.value })}
                      placeholder="Digite a mensagem de resposta automática..."
                      rows={4}
                    />
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="uma_vez">Uma resposta por conversa (24h)</Label>
                    </div>
                    <Switch
                      id="uma_vez"
                      checked={formData.uma_vez_por_conversa}
                      onCheckedChange={(v) => setFormData({ ...formData, uma_vez_por_conversa: v })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <Label htmlFor="horario">Respeitar horário permitido</Label>
                    </div>
                    <Switch
                      id="horario"
                      checked={formData.respeitar_horario}
                      onCheckedChange={(v) => setFormData({ ...formData, respeitar_horario: v })}
                    />
                  </div>
                </div>

                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending || !formData.nome || !formData.gatilho_valor}
                  className="w-full"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {editingId ? "Salvar Alterações" : "Criar Automação"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        {/* Info Banner */}
        <div className="mb-4 bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Zap className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium mb-1">Automações Institucionais</p>
              <p>
                Configure respostas automáticas simples para palavras-chave comuns.
                Respostas são enviadas via fila respeitando limites anti-ban.
                Não substitui atendimento humano.
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : automacoes?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bot className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma automação configurada</p>
            <p className="text-sm">Crie automações para respostas automáticas</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Gatilho</TableHead>
                <TableHead>Resposta</TableHead>
                <TableHead>Opções</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {automacoes?.map((auto) => (
                <TableRow key={auto.id}>
                  <TableCell className="font-medium">{auto.nome}</TableCell>
                  <TableCell>
                    <div>
                      <Badge variant="outline" className="mb-1">
                        {auto.gatilho_tipo === "palavra_chave" ? "Palavra-chave" : "Tipo"}
                      </Badge>
                      <p className="text-xs text-muted-foreground">{auto.gatilho_valor}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {auto.whatsapp_templates?.nome || (
                      <span className="text-xs text-muted-foreground">
                        {auto.resposta_customizada?.substring(0, 30)}...
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      {auto.uma_vez_por_conversa && (
                        <Badge variant="secondary" className="text-xs">1x/24h</Badge>
                      )}
                      {auto.respeitar_horario && (
                        <Badge variant="secondary" className="text-xs">Horário</Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={auto.ativo}
                      onCheckedChange={(ativo) => toggleMutation.mutate({ id: auto.id, ativo })}
                    />
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(auto)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteMutation.mutate(auto.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
