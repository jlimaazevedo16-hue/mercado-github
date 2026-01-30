import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEmail } from "@/hooks/useEmail";
import { useUserRole } from "@/hooks/useUserRole";
import { EmailBrandingConfig } from "./EmailBrandingConfig";
import { Mail, Send, CheckCircle, XCircle, Loader2, AlertTriangle, Lock, ExternalLink, Palette, Settings2 } from "lucide-react";
import { toast } from "sonner";

export function EmailConfig() {
  const { isAdminMaster, loading: roleLoading } = useUserRole();
  const { sendGenericEmail } = useEmail();
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const canEdit = isAdminMaster;

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error("Digite um e-mail para teste");
      return;
    }

    setIsSending(true);
    setTestResult(null);

    try {
      const result = await sendGenericEmail(
        testEmail,
        "Teste de E-mail - Mercado Municipal Digital",
        {
          titulo: "E-mail de Teste",
          conteudo: `
            <p>Este é um e-mail de teste enviado pelo sistema.</p>
            <p>Se você está recebendo esta mensagem, a configuração de e-mail está funcionando corretamente!</p>
            <p><strong>Data/Hora do envio:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          `,
        }
      );

      if (result.success) {
        setTestResult({ success: true, message: "E-mail de teste enviado com sucesso!" });
        toast.success("E-mail de teste enviado!");
      } else {
        setTestResult({ success: false, message: result.error || "Erro ao enviar e-mail" });
        toast.error(result.error || "Erro ao enviar e-mail");
      }
    } catch (error: any) {
      setTestResult({ success: false, message: error.message });
      toast.error(error.message);
    } finally {
      setIsSending(false);
    }
  };

  if (roleLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {!canEdit && (
        <Alert variant="default" className="border-muted bg-muted/50">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <AlertTitle>Acesso Restrito</AlertTitle>
          <AlertDescription>
            Apenas o <strong>Administrador Master</strong> pode configurar o serviço de e-mail.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="branding" className="space-y-4">
        <TabsList>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding Institucional
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Configuração do Serviço
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branding">
          <EmailBrandingConfig />
        </TabsContent>

        <TabsContent value="config">
          <div className="space-y-6">
            {/* Status do Serviço */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    <div>
                      <CardTitle>Configuração do Resend</CardTitle>
                      <CardDescription>
                        Serviço de envio de e-mails transacionais
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="outline" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Requer API Key
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Instruções de Configuração */}
                <Alert>
                  <Mail className="h-4 w-4" />
                  <AlertTitle>Como configurar o envio de e-mails</AlertTitle>
                  <AlertDescription className="mt-2 space-y-2">
                    <p>Para habilitar o envio de e-mails, siga os passos:</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>
                        Crie uma conta gratuita em{" "}
                        <a 
                          href="https://resend.com" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          resend.com <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>
                        Valide seu domínio em{" "}
                        <a 
                          href="https://resend.com/domains" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          Domains <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>
                        Gere uma API Key em{" "}
                        <a 
                          href="https://resend.com/api-keys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline inline-flex items-center gap-1"
                        >
                          API Keys <ExternalLink className="h-3 w-3" />
                        </a>
                      </li>
                      <li>Configure a variável <code className="bg-muted px-1 rounded">RESEND_API_KEY</code> no backend</li>
                    </ol>
                  </AlertDescription>
                </Alert>

                {/* Templates Disponíveis */}
                <div>
                  <h4 className="font-medium mb-3">Templates Disponíveis</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    <Badge variant="secondary" className="justify-center py-2">
                      Boas-vindas
                    </Badge>
                    <Badge variant="secondary" className="justify-center py-2">
                      Notificação
                    </Badge>
                    <Badge variant="secondary" className="justify-center py-2">
                      Alerta de Vencimento
                    </Badge>
                    <Badge variant="secondary" className="justify-center py-2">
                      Reset de Senha
                    </Badge>
                    <Badge variant="secondary" className="justify-center py-2">
                      Genérico
                    </Badge>
                  </div>
                </div>

                {/* Teste de Envio */}
                {canEdit && (
                  <div className="border-t pt-6">
                    <h4 className="font-medium mb-3">Testar Envio de E-mail</h4>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <Label htmlFor="testEmail" className="sr-only">E-mail para teste</Label>
                        <Input
                          id="testEmail"
                          type="email"
                          placeholder="Digite o e-mail para teste"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                        />
                      </div>
                      <Button 
                        onClick={handleSendTestEmail} 
                        disabled={isSending || !testEmail}
                      >
                        {isSending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Enviar Teste
                          </>
                        )}
                      </Button>
                    </div>

                    {testResult && (
                      <Alert 
                        variant={testResult.success ? "default" : "destructive"} 
                        className="mt-3"
                      >
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        <AlertDescription>{testResult.message}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card de Informações */}
            <Card className="bg-muted/50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">Sobre o serviço de e-mail</h4>
                    <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                      <li>• <strong>Resend:</strong> Serviço confiável de envio de e-mails transacionais.</li>
                      <li>• <strong>Templates HTML:</strong> E-mails formatados profissionalmente.</li>
                      <li>• <strong>Branding automático:</strong> Logo, cores e dados institucionais em todos os e-mails.</li>
                      <li>• <strong>Plano gratuito:</strong> 100 e-mails/dia para começar.</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
