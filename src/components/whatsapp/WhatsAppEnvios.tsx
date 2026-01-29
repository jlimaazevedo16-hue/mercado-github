import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Send, Loader2, Users, Package, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Instance {
  id: string;
  nome: string;
  status: string;
}

interface Template {
  id: string;
  nome: string;
  tipo: string;
  conteudo: string;
  ativo: boolean;
}

interface Responsavel {
  id: string;
  nome: string;
  telefone: string | null;
}

interface Box {
  id: string;
  codigo: string;
  boxe: string;
  responsavel_id: string | null;
}

interface Setor {
  id: string;
  nome: string;
}

interface Segmento {
  id: string;
  nome: string;
}

export const WhatsAppEnvios = () => {
  const queryClient = useQueryClient();
  const [instanceId, setInstanceId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [destinationType, setDestinationType] = useState<"individual" | "box" | "setor" | "segmento" | "manual">("individual");
  const [selectedResponsaveis, setSelectedResponsaveis] = useState<string[]>([]);
  const [selectedBoxes, setSelectedBoxes] = useState<string[]>([]);
  const [selectedSetor, setSelectedSetor] = useState("");
  const [selectedSegmento, setSelectedSegmento] = useState("");
  const [manualNumbers, setManualNumbers] = useState("");
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");

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
  });

  const { data: templates } = useQuery({
    queryKey: ["whatsapp-templates-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_templates")
        .select("id, nome, tipo, conteudo, ativo")
        .eq("ativo", true);
      if (error) throw error;
      return data as Template[];
    },
  });

  const { data: responsaveis } = useQuery({
    queryKey: ["responsaveis-telefone"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, nome, telefone")
        .not("telefone", "is", null)
        .eq("status", "ATIVO");
      if (error) throw error;
      return data as Responsavel[];
    },
  });

  const { data: boxes } = useQuery({
    queryKey: ["boxes-responsavel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("id, codigo, boxe, responsavel_id")
        .not("responsavel_id", "is", null);
      if (error) throw error;
      return data as Box[];
    },
  });

  const { data: setores } = useQuery({
    queryKey: ["setores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("setores").select("id, nome");
      if (error) throw error;
      return data as Setor[];
    },
  });

  const { data: segmentos } = useQuery({
    queryKey: ["segmentos"],
    queryFn: async () => {
      const { data, error } = await supabase.from("segmentos").select("id, nome");
      if (error) throw error;
      return data as Segmento[];
    },
  });

  const enqueueMutation = useMutation({
    mutationFn: async (messages: Array<{ telefone: string; nome: string; responsavel_id?: string; box_id?: string }>) => {
      const template = templates?.find((t) => t.id === templateId);
      if (!template) throw new Error("Template não encontrado");

      const scheduledFor = isScheduled && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`).toISOString()
        : null;

      const queueItems = messages.map((msg) => ({
        instance_id: instanceId,
        template_id: templateId,
        destinatario_telefone: msg.telefone,
        destinatario_nome: msg.nome,
        responsavel_id: msg.responsavel_id || null,
        box_id: msg.box_id || null,
        conteudo: template.conteudo.replace("{{nome}}", msg.nome),
        status: "pendente",
        agendado_para: scheduledFor,
      }));

      const { error } = await supabase.from("whatsapp_queue").insert(queueItems);
      if (error) throw error;

      return queueItems.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-queue"] });
      toast.success(`${count} mensagem(ns) adicionada(s) à fila!`);
      resetForm();
    },
    onError: (error) => {
      toast.error("Erro ao enfileirar mensagens: " + error.message);
    },
  });

  const resetForm = () => {
    setSelectedResponsaveis([]);
    setSelectedBoxes([]);
    setSelectedSetor("");
    setSelectedSegmento("");
    setManualNumbers("");
    setIsScheduled(false);
    setScheduledDate("");
    setScheduledTime("");
  };

  const handleTemplateChange = (id: string) => {
    setTemplateId(id);
    const template = templates?.find((t) => t.id === id);
    if (template) {
      setPreviewMessage(template.conteudo);
    }
  };

  const handleSend = () => {
    if (!instanceId) {
      toast.error("Selecione uma instância");
      return;
    }
    if (!templateId) {
      toast.error("Selecione um template");
      return;
    }

    let messages: Array<{ telefone: string; nome: string; responsavel_id?: string; box_id?: string }> = [];

    switch (destinationType) {
      case "individual":
        messages = selectedResponsaveis
          .map((id) => {
            const resp = responsaveis?.find((r) => r.id === id);
            return resp?.telefone
              ? { telefone: resp.telefone, nome: resp.nome, responsavel_id: resp.id }
              : null;
          })
          .filter(Boolean) as typeof messages;
        break;

      case "box":
        messages = selectedBoxes
          .map((id) => {
            const box = boxes?.find((b) => b.id === id);
            const resp = responsaveis?.find((r) => r.id === box?.responsavel_id);
            return resp?.telefone
              ? { telefone: resp.telefone, nome: resp.nome, responsavel_id: resp.id, box_id: box?.id }
              : null;
          })
          .filter(Boolean) as typeof messages;
        break;

      case "manual":
        const numbers = manualNumbers.split("\n").filter((n) => n.trim());
        messages = numbers.map((num) => ({
          telefone: num.trim(),
          nome: "Destinatário",
        }));
        break;

      default:
        toast.error("Tipo de destinatário não implementado");
        return;
    }

    if (messages.length === 0) {
      toast.error("Nenhum destinatário válido selecionado");
      return;
    }

    enqueueMutation.mutate(messages);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Envio de Mensagens
        </CardTitle>
        <CardDescription>
          Adicione mensagens à fila de envio (modo simulado - sem envio real)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning */}
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3 text-sm text-amber-800 dark:text-amber-200">
          ⚠️ <strong>Modo de Simulação:</strong> As mensagens serão adicionadas à fila mas não serão enviadas de verdade.
        </div>
        {/* Instância e Template */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Instância WhatsApp</Label>
            <Select value={instanceId} onValueChange={setInstanceId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a instância" />
              </SelectTrigger>
              <SelectContent>
                {instances?.filter((inst) => inst.id).map((inst) => (
                  <SelectItem key={inst.id} value={inst.id}>
                    {inst.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {instances?.length === 0 && (
              <p className="text-xs text-destructive mt-1">Nenhuma instância conectada</p>
            )}
          </div>

          <div>
            <Label>Template da Mensagem</Label>
            <Select value={templateId} onValueChange={handleTemplateChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o template" />
              </SelectTrigger>
              <SelectContent>
                {templates?.filter((tpl) => tpl.id).map((tpl) => (
                  <SelectItem key={tpl.id} value={tpl.id}>
                    {tpl.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Preview */}
        {previewMessage && (
          <div className="bg-green-50 dark:bg-green-950 p-4 rounded-lg border border-green-200 dark:border-green-800">
            <p className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">
              Prévia da Mensagem:
            </p>
            <p className="text-sm text-green-700 dark:text-green-300 whitespace-pre-wrap">
              {previewMessage}
            </p>
          </div>
        )}

        {/* Tipo de Destinatário */}
        <div>
          <Label className="mb-3 block">Tipo de Destinatário</Label>
          <RadioGroup
            value={destinationType}
            onValueChange={(v) => setDestinationType(v as typeof destinationType)}
            className="grid grid-cols-2 md:grid-cols-5 gap-2"
          >
            <div className="flex items-center space-x-2 border rounded-lg p-3">
              <RadioGroupItem value="individual" id="individual" />
              <Label htmlFor="individual" className="flex items-center gap-1 cursor-pointer">
                <Users className="h-4 w-4" /> Responsável
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3">
              <RadioGroupItem value="box" id="box" />
              <Label htmlFor="box" className="flex items-center gap-1 cursor-pointer">
                <Package className="h-4 w-4" /> Box
              </Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3">
              <RadioGroupItem value="setor" id="setor" />
              <Label htmlFor="setor" className="cursor-pointer">Setor</Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3">
              <RadioGroupItem value="segmento" id="segmento" />
              <Label htmlFor="segmento" className="cursor-pointer">Segmento</Label>
            </div>
            <div className="flex items-center space-x-2 border rounded-lg p-3">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="cursor-pointer">Lista Manual</Label>
            </div>
          </RadioGroup>
        </div>

        {/* Seleção baseada no tipo */}
        {destinationType === "individual" && (
          <div>
            <Label>Selecione os Responsáveis</Label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 mt-2">
              {responsaveis?.map((resp) => (
                <div key={resp.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={resp.id}
                    checked={selectedResponsaveis.includes(resp.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedResponsaveis([...selectedResponsaveis, resp.id]);
                      } else {
                        setSelectedResponsaveis(selectedResponsaveis.filter((id) => id !== resp.id));
                      }
                    }}
                  />
                  <Label htmlFor={resp.id} className="cursor-pointer">
                    {resp.nome} - {resp.telefone}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedResponsaveis.length} selecionado(s)
            </p>
          </div>
        )}

        {destinationType === "box" && (
          <div>
            <Label>Selecione os Boxes</Label>
            <div className="max-h-48 overflow-y-auto border rounded-lg p-2 mt-2">
              {boxes?.map((box) => (
                <div key={box.id} className="flex items-center space-x-2 py-1">
                  <Checkbox
                    id={box.id}
                    checked={selectedBoxes.includes(box.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedBoxes([...selectedBoxes, box.id]);
                      } else {
                        setSelectedBoxes(selectedBoxes.filter((id) => id !== box.id));
                      }
                    }}
                  />
                  <Label htmlFor={box.id} className="cursor-pointer">
                    {box.codigo} - {box.boxe}
                  </Label>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedBoxes.length} selecionado(s)
            </p>
          </div>
        )}

        {destinationType === "setor" && (
          <div>
            <Label>Selecione o Setor</Label>
            <Select value={selectedSetor} onValueChange={setSelectedSetor}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setores?.filter((setor) => setor.id).map((setor) => (
                  <SelectItem key={setor.id} value={setor.id}>
                    {setor.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Enviar para todos os responsáveis do setor
            </p>
          </div>
        )}

        {destinationType === "segmento" && (
          <div>
            <Label>Selecione o Segmento</Label>
            <Select value={selectedSegmento} onValueChange={setSelectedSegmento}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o segmento" />
              </SelectTrigger>
              <SelectContent>
                {segmentos?.filter((seg) => seg.id).map((seg) => (
                  <SelectItem key={seg.id} value={seg.id}>
                    {seg.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              Enviar para todos os responsáveis do segmento
            </p>
          </div>
        )}

        {destinationType === "manual" && (
          <div>
            <Label>Lista de Números (um por linha)</Label>
            <Textarea
              value={manualNumbers}
              onChange={(e) => setManualNumbers(e.target.value)}
              placeholder={"5567999999999\n5567988888888"}
              rows={5}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Formato: código do país + DDD + número (ex: 5567999999999)
            </p>
          </div>
        )}

        {/* Agendamento */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <Checkbox
              id="scheduled"
              checked={isScheduled}
              onCheckedChange={(checked) => setIsScheduled(!!checked)}
            />
            <Label htmlFor="scheduled" className="flex items-center gap-2 cursor-pointer">
              <Calendar className="h-4 w-4" />
              Agendar Envio
            </Label>
          </div>

          {isScheduled && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Data</Label>
                <Input
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>
              <div>
                <Label>Horário</Label>
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botão de Envio */}
        <Button
          onClick={handleSend}
          disabled={enqueueMutation.isPending || !instanceId || !templateId}
          className="w-full"
          size="lg"
          title="Adiciona mensagens à fila (modo simulado)"
        >
          {enqueueMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          <Send className="h-4 w-4 mr-2" />
          {isScheduled ? "Agendar na Fila" : "Adicionar à Fila"}
        </Button>
      </CardContent>
    </Card>
  );
};
