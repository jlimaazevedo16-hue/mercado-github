import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

interface WhatsAppSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  destinatario: {
    nome: string;
    telefone: string;
    responsavel_id?: string;
    box_id?: string;
  };
}

interface Instance {
  id: string;
  nome: string;
  status: string;
}

interface Template {
  id: string;
  nome: string;
  conteudo: string;
}

export const WhatsAppSendDialog = ({ open, onOpenChange, destinatario }: WhatsAppSendDialogProps) => {
  const queryClient = useQueryClient();
  const [instanceId, setInstanceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [customMessage, setCustomMessage] = useState("");

  const { data: instances } = useQuery({
    queryKey: ["whatsapp-instances-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("id, nome, status")
        .eq("status", "connected");
      if (error) throw error;
      return data as Instance[];
    },
    enabled: open,
  });

  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("id, nome, conteudo")
        .eq("ativo", true);
      if (error) throw error;
      return data as Template[];
    },
    enabled: open,
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const template = templates?.find((t) => t.id === templateId);
      const conteudo = template 
        ? template.conteudo.replace("{{nome}}", destinatario.nome)
        : customMessage;

      const { error } = await supabase.from("whatsapp_queue").insert({
        instance_id: instanceId,
        template_id: templateId || null,
        destinatario_telefone: destinatario.telefone,
        destinatario_nome: destinatario.nome,
        responsavel_id: destinatario.responsavel_id || null,
        box_id: destinatario.box_id || null,
        conteudo,
        status: "pendente",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue"] });
      toast.success("Mensagem adicionada à fila de envio!");
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao enfileirar mensagem: " + error.message);
    },
  });

  const resetForm = () => {
    setInstanceId("");
    setTemplateId("");
    setCustomMessage("");
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const template = templates?.find((t) => t.id === id);
    if (template) {
      setCustomMessage(template.conteudo.replace("{{nome}}", destinatario.nome));
    }
  };

  const handleSend = () => {
    if (!instanceId) {
      toast.error("Selecione uma instância");
      return;
    }
    if (!templateId && !customMessage.trim()) {
      toast.error("Selecione um template ou escreva uma mensagem");
      return;
    }
    sendMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-green-600" />
            Enviar WhatsApp
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Destinatário Info */}
          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Destinatário</p>
            <p className="font-medium">{destinatario.nome}</p>
            <p className="text-sm">{destinatario.telefone}</p>
          </div>

          {/* Instância */}
          <div>
            <Label>Instância WhatsApp</Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a instância" />
              </SelectTrigger>
              <SelectContent>
                {instances?.map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {instances?.length === 0 && (
              <p className="text-xs text-destructive mt-1">
                Nenhuma instância conectada. Configure em WhatsApp → Instâncias.
              </p>
            )}
          </div>

          {/* Template */}
          <div>
            <Label>Template (opcional)</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Mensagem personalizada</SelectItem>
                {templates?.map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mensagem */}
          <div>
            <Label>Mensagem</Label>
            <Textarea
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Digite a mensagem..."
              rows={4}
            />
          </div>

          {/* Preview */}
          {customMessage && (
            <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-xs font-medium text-green-800 dark:text-green-200 mb-1">
                Prévia:
              </p>
              <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
                {customMessage}
              </p>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancelar
            </Button>
            <Button
              onClick={handleSend}
              disabled={sendMutation.isPending || !instanceId}
              className="flex-1"
            >
              {sendMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
