import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Palette, Save, Loader2, Lock, Upload, Image, Mail, Building2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface EmailBrandingConfig {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  email: string;
  logoUrl: string;
  corPrimaria: string;
  corSecundaria: string;
}

const CONFIG_KEYS = [
  'instituicao_nome',
  'instituicao_cnpj',
  'instituicao_endereco',
  'instituicao_cidade',
  'instituicao_email',
  'instituicao_logo_url',
  'instituicao_cor_primaria',
  'instituicao_cor_secundaria',
];

const DEFAULT_VALUES: EmailBrandingConfig = {
  nome: 'Associação dos Feirantes do Mercado Central',
  cnpj: '00.000.000/0001-00',
  endereco: 'Rua do Mercado, 100 - Centro',
  cidade: 'Cidade/UF',
  email: 'contato@mercadomunicipal.com.br',
  logoUrl: '',
  corPrimaria: '#1e40af',
  corSecundaria: '#f59e0b',
};

export function EmailBrandingConfig() {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const { isAdminMaster, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<EmailBrandingConfig>(DEFAULT_VALUES);
  const [hasChanges, setHasChanges] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canEdit = isAdminMaster;

  const { isLoading } = useQuery({
    queryKey: ["email-branding-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_administrativas")
        .select("chave, descricao")
        .in("chave", CONFIG_KEYS);

      if (error) throw error;

      const configMap = new Map(data?.map(item => [item.chave, item.descricao]) || []);

      const loadedConfig: EmailBrandingConfig = {
        nome: configMap.get('instituicao_nome') || DEFAULT_VALUES.nome,
        cnpj: configMap.get('instituicao_cnpj') || DEFAULT_VALUES.cnpj,
        endereco: configMap.get('instituicao_endereco') || DEFAULT_VALUES.endereco,
        cidade: configMap.get('instituicao_cidade') || DEFAULT_VALUES.cidade,
        email: configMap.get('instituicao_email') || DEFAULT_VALUES.email,
        logoUrl: configMap.get('instituicao_logo_url') || DEFAULT_VALUES.logoUrl,
        corPrimaria: configMap.get('instituicao_cor_primaria') || DEFAULT_VALUES.corPrimaria,
        corSecundaria: configMap.get('instituicao_cor_secundaria') || DEFAULT_VALUES.corSecundaria,
      };

      setFormData(loadedConfig);
      return loadedConfig;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (config: EmailBrandingConfig) => {
      const updates = [
        { chave: 'instituicao_nome', descricao: config.nome },
        { chave: 'instituicao_cnpj', descricao: config.cnpj },
        { chave: 'instituicao_endereco', descricao: config.endereco },
        { chave: 'instituicao_cidade', descricao: config.cidade },
        { chave: 'instituicao_email', descricao: config.email },
        { chave: 'instituicao_logo_url', descricao: config.logoUrl },
        { chave: 'instituicao_cor_primaria', descricao: config.corPrimaria },
        { chave: 'instituicao_cor_secundaria', descricao: config.corSecundaria },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("configuracoes_administrativas")
          .update({ descricao: update.descricao })
          .eq("chave", update.chave);

        if (error) throw error;
      }

      return config;
    },
    onSuccess: (config) => {
      queryClient.invalidateQueries({ queryKey: ["email-branding-config"] });
      queryClient.invalidateQueries({ queryKey: ["instituicao-config"] });
      logAction({
        action: "UPDATE_EMAIL_BRANDING_CONFIG",
        tableName: "configuracoes_administrativas",
        recordId: "email-branding",
        newValues: config as unknown as Record<string, unknown>,
      });
      toast({ 
        title: "Configurações salvas",
        description: "Os dados de branding de e-mail foram atualizados.",
      });
      setHasChanges(false);
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleChange = (field: keyof EmailBrandingConfig, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "O tamanho máximo é 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logo-institucional.${fileExt}`;
      const filePath = `branding/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      const logoUrl = urlData.publicUrl + `?v=${Date.now()}`;
      handleChange('logoUrl', logoUrl);

      toast({
        title: "Logo enviado",
        description: "O logotipo foi atualizado com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (isLoading || roleLoading) {
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
            Apenas o <strong>Administrador Master</strong> pode alterar o branding de e-mail.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              <div>
                <CardTitle>Branding de E-mail Institucional</CardTitle>
                <CardDescription>
                  Configure os dados que aparecerão em todos os e-mails enviados pelo sistema
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Dados da Instituição */}
            <div className="space-y-4">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Dados da Instituição
              </h4>
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome da Instituição</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Nome completo da associação"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input
                    id="cnpj"
                    value={formData.cnpj}
                    onChange={(e) => handleChange('cnpj', e.target.value)}
                    disabled={!canEdit}
                    placeholder="00.000.000/0001-00"
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => handleChange('endereco', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Rua, número - Bairro"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade/UF</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => handleChange('cidade', e.target.value)}
                    disabled={!canEdit}
                    placeholder="Cidade/UF"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">E-mail Institucional</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  disabled={!canEdit}
                  placeholder="contato@exemplo.com.br"
                />
              </div>
            </div>

            {/* Logotipo */}
            <div className="space-y-4 border-t pt-6">
              <h4 className="font-medium flex items-center gap-2">
                <Image className="h-4 w-4" />
                Logotipo
              </h4>
              
              <div className="flex items-start gap-6">
                <div className="flex-shrink-0">
                  {formData.logoUrl ? (
                    <img 
                      src={formData.logoUrl} 
                      alt="Logo institucional" 
                      className="w-32 h-32 object-contain border rounded-lg bg-white p-2"
                    />
                  ) : (
                    <div className="w-32 h-32 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    O logotipo será exibido no cabeçalho de todos os e-mails enviados.
                    Formatos: PNG, JPG, SVG. Tamanho máximo: 2MB.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                    disabled={!canEdit}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!canEdit || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Enviar Logo
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Cores Institucionais */}
            <div className="space-y-4 border-t pt-6">
              <h4 className="font-medium flex items-center gap-2">
                <Palette className="h-4 w-4" />
                Cores Institucionais
              </h4>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                  <Label htmlFor="corPrimaria">Cor Primária (Azul)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="corPrimaria"
                      value={formData.corPrimaria}
                      onChange={(e) => handleChange('corPrimaria', e.target.value)}
                      disabled={!canEdit}
                      className="w-12 h-12 rounded-md border cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Input
                      value={formData.corPrimaria}
                      onChange={(e) => handleChange('corPrimaria', e.target.value)}
                      disabled={!canEdit}
                      placeholder="#1e40af"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usada em cabeçalhos, botões principais e links.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="corSecundaria">Cor Secundária (Laranja)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      id="corSecundaria"
                      value={formData.corSecundaria}
                      onChange={(e) => handleChange('corSecundaria', e.target.value)}
                      disabled={!canEdit}
                      className="w-12 h-12 rounded-md border cursor-pointer disabled:cursor-not-allowed"
                    />
                    <Input
                      value={formData.corSecundaria}
                      onChange={(e) => handleChange('corSecundaria', e.target.value)}
                      disabled={!canEdit}
                      placeholder="#f59e0b"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Usada em alertas, destaques e ações secundárias.
                  </p>
                </div>
              </div>

              {/* Preview das cores */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <p className="text-sm font-medium mb-3">Pré-visualização</p>
                <div className="flex gap-4">
                  <div 
                    className="h-16 flex-1 rounded-md flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: formData.corPrimaria }}
                  >
                    Cabeçalho
                  </div>
                  <div 
                    className="h-16 flex-1 rounded-md flex items-center justify-center text-white font-medium"
                    style={{ backgroundColor: formData.corSecundaria }}
                  >
                    Destaque
                  </div>
                </div>
              </div>
            </div>

            {canEdit && (
              <div className="flex justify-end pt-4 border-t">
                <Button type="submit" disabled={!hasChanges || updateMutation.isPending}>
                  {updateMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
