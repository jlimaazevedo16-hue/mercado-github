import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';

interface Integracao {
  id: string;
  integracao: string;
  status: string;
  config_public: {
    nome: string;
    descricao: string;
    icone: string;
  };
  obrigatoria: boolean;
}

interface IntegracaoConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  integracao: Integracao;
  onSuccess: () => void;
}

// Configuração de campos para cada integração
const integracaoFields: Record<string, { key: string; label: string; placeholder: string; sensitive: boolean; required: boolean }[]> = {
  supabase: [
    { key: 'url', label: 'SUPABASE_URL', placeholder: 'https://xxxxx.supabase.co', sensitive: false, required: true },
    { key: 'anon_key', label: 'SUPABASE_ANON_KEY', placeholder: 'eyJhbGciOiJIUzI1NiIs...', sensitive: true, required: true },
    { key: 'service_role_key', label: 'SUPABASE_SERVICE_ROLE_KEY (Opcional)', placeholder: 'eyJhbGciOiJIUzI1NiIs...', sensitive: true, required: false },
  ],
  resend: [
    { key: 'api_key', label: 'RESEND_API_KEY', placeholder: 're_xxxxx...', sensitive: true, required: true },
    { key: 'from_email', label: 'E-mail Remetente', placeholder: 'noreply@seudominio.com', sensitive: false, required: true },
    { key: 'from_name', label: 'Nome Remetente', placeholder: 'Sistema', sensitive: false, required: false },
  ],
  evolution: [
    { key: 'api_url', label: 'URL da API', placeholder: 'https://sua-evolution-api.com', sensitive: false, required: true },
    { key: 'api_key', label: 'API Key', placeholder: 'sua-api-key', sensitive: true, required: true },
    { key: 'instance_name', label: 'Nome da Instância', placeholder: 'minha-instancia', sensitive: false, required: true },
  ],
  gemini: [
    { key: 'api_key', label: 'GEMINI_API_KEY', placeholder: 'AIzaSy...', sensitive: true, required: true },
  ],
};

export const IntegracaoConfigDialog = ({ open, onOpenChange, integracao, onSuccess }: IntegracaoConfigDialogProps) => {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const { toast } = useToast();
  const { logAction } = useAuditLog();

  const fields = integracaoFields[integracao.integracao] || [];

  const handleInputChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setTestResult(null);
  };

  const toggleSensitive = (key: string) => {
    setShowSensitive(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const validateForm = (): boolean => {
    for (const field of fields) {
      if (field.required && !formData[field.key]?.trim()) {
        toast({
          title: 'Campo obrigatório',
          description: `O campo "${field.label}" é obrigatório.`,
          variant: 'destructive'
        });
        return false;
      }
    }
    return true;
  };

  const handleTest = async () => {
    if (!validateForm()) return;

    setTesting(true);
    setTestResult(null);

    try {
      // Chamar edge function para testar conexão
      const { data, error } = await supabase.functions.invoke('test-integration', {
        body: {
          integracao: integracao.integracao,
          config: formData
        }
      });

      if (error) throw error;

      if (data?.success) {
        setTestResult({ success: true, message: 'Conexão testada com sucesso!' });
      } else {
        setTestResult({ success: false, message: data?.message || 'Falha no teste de conexão' });
      }
    } catch (error: any) {
      console.error('Erro ao testar integração:', error);
      setTestResult({ 
        success: false, 
        message: error.message || 'Erro ao testar conexão. Verifique as configurações.' 
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);

    try {
      // Preparar dados para salvar (criptografar campos sensíveis via edge function)
      const { data, error } = await supabase.functions.invoke('save-integration', {
        body: {
          integracao_id: integracao.id,
          integracao: integracao.integracao,
          config: formData
        }
      });

      if (error) throw error;

      // Registrar no audit log
      await logAction({
        action: 'ATUALIZAR_INTEGRACAO',
        tableName: 'configuracoes_integracoes',
        recordId: integracao.id,
        newValues: {
          integracao: integracao.integracao,
          status: 'configured',
          campos_configurados: Object.keys(formData).filter(k => !integracaoFields[integracao.integracao]?.find(f => f.key === k && f.sensitive))
        }
      });

      toast({
        title: 'Integração Salva',
        description: `A integração ${integracao.config_public?.nome} foi configurada com sucesso.`,
      });

      onSuccess();
    } catch (error: any) {
      console.error('Erro ao salvar integração:', error);
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar a configuração.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Configurar {integracao.config_public?.nome}</DialogTitle>
          <DialogDescription>
            {integracao.config_public?.descricao}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Alerta de segurança */}
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              As chaves sensíveis são armazenadas de forma criptografada e nunca são expostas no frontend.
            </AlertDescription>
          </Alert>

          {/* Campos do formulário */}
          {fields.map(field => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key} className="text-sm">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </Label>
              <div className="relative">
                <Input
                  id={field.key}
                  type={field.sensitive && !showSensitive[field.key] ? 'password' : 'text'}
                  placeholder={field.placeholder}
                  value={formData[field.key] || ''}
                  onChange={(e) => handleInputChange(field.key, e.target.value)}
                  className={field.sensitive ? 'pr-10 font-mono text-sm' : 'font-mono text-sm'}
                />
                {field.sensitive && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3"
                    onClick={() => toggleSensitive(field.key)}
                  >
                    {showSensitive[field.key] ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                )}
              </div>
            </div>
          ))}

          {/* Resultado do teste */}
          {testResult && (
            <Alert variant={testResult.success ? 'default' : 'destructive'}>
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{testResult.message}</AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={handleTest} disabled={testing || saving}>
            {testing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Testar Conexão
          </Button>
          <Button onClick={handleSave} disabled={saving || testing}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
