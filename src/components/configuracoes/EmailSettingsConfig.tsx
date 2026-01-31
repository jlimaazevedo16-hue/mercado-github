import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, Save, Settings2 } from "lucide-react";

interface EmailConfig {
  id: string;
  email_remetente: string;
  nome_remetente: string;
  envio_ativo: boolean;
  template_institucional: string;
  template_financeiro: string;
  template_alerta: string;
  template_verificacao: string;
}

const templateOptions = [
  { value: "welcome", label: "Boas-vindas" },
  { value: "notification", label: "Notificação" },
  { value: "expiration_alert", label: "Alerta de Vencimento" },
  { value: "generic", label: "Genérico" },
  { value: "password_reset", label: "Redefinição de Senha" },
];

export function EmailSettingsConfig() {
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_email")
        .select("*")
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching email config:", error);
        toast.error("Erro ao carregar configurações de e-mail");
        return;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("configuracoes_email")
        .update({
          email_remetente: config.email_remetente,
          nome_remetente: config.nome_remetente,
          envio_ativo: config.envio_ativo,
          template_institucional: config.template_institucional,
          template_financeiro: config.template_financeiro,
          template_alerta: config.template_alerta,
          template_verificacao: config.template_verificacao,
        })
        .eq("id", config.id);

      if (error) throw error;

      toast.success("Configurações de e-mail salvas com sucesso!");
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (field: keyof EmailConfig, value: string | boolean) => {
    if (!config) return;
    setConfig({ ...config, [field]: value });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!config) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">Nenhuma configuração encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Configurações do Remetente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Remetente Padrão
          </CardTitle>
          <CardDescription>
            Configure o e-mail e nome que aparecerão como remetente nas mensagens enviadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email_remetente">E-mail do Remetente</Label>
              <Input
                id="email_remetente"
                type="email"
                placeholder="noreply@seudominio.com"
                value={config.email_remetente || ""}
                onChange={(e) => updateConfig("email_remetente", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use um e-mail de domínio verificado no Resend
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_remetente">Nome do Remetente</Label>
              <Input
                id="nome_remetente"
                placeholder="Mercado Municipal Digital"
                value={config.nome_remetente || ""}
                onChange={(e) => updateConfig("nome_remetente", e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Nome que aparecerá para os destinatários
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Controle de Envio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Controle de Envio
          </CardTitle>
          <CardDescription>
            Ative ou desative o envio automático de e-mails pelo sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
            <div>
              <p className="font-medium">Envio de E-mails</p>
              <p className="text-sm text-muted-foreground">
                {config.envio_ativo
                  ? "O sistema está enviando e-mails normalmente"
                  : "O envio de e-mails está desativado"}
              </p>
            </div>
            <Switch
              checked={config.envio_ativo}
              onCheckedChange={(checked) => updateConfig("envio_ativo", checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Templates por Tipo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings2 className="h-5 w-5" />
            Templates por Tipo
          </CardTitle>
          <CardDescription>
            Escolha qual template HTML será usado para cada tipo de comunicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="template_institucional">Institucional</Label>
              <Select
                value={config.template_institucional}
                onValueChange={(value) => updateConfig("template_institucional", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Comunicados oficiais e informativos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_financeiro">Financeiro</Label>
              <Select
                value={config.template_financeiro}
                onValueChange={(value) => updateConfig("template_financeiro", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Cobranças, boletos e avisos de pagamento
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_alerta">Alerta/Urgente</Label>
              <Select
                value={config.template_alerta}
                onValueChange={(value) => updateConfig("template_alerta", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Notificações urgentes e vencimentos
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template_verificacao">Verificação de Dados</Label>
              <Select
                value={config.template_verificacao}
                onValueChange={(value) => updateConfig("template_verificacao", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template" />
                </SelectTrigger>
                <SelectContent>
                  {templateOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Confirmações e validações de cadastro
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botão Salvar */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </div>
  );
}
