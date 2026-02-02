import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { Building2, Save, Loader2, Lock, FileText, MapPin, Phone, Mail, Palette, Image } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface InstituicaoConfigData {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  telefone: string;
  email: string;
  logoUrl: string;
  corPrimaria: string;
  corSecundaria: string;
  sistemaNome: string;
  rodapeTexto: string;
}

const CONFIG_KEYS = [
  'instituicao_nome',
  'instituicao_cnpj',
  'instituicao_endereco',
  'instituicao_cidade',
  'instituicao_telefone',
  'instituicao_email',
  'instituicao_logo_url',
  'instituicao_cor_primaria',
  'instituicao_cor_secundaria',
  'sistema_nome',
  'rodape_texto',
];

const DEFAULT_VALUES: InstituicaoConfigData = {
  nome: 'Associação dos Feirantes do Mercado Central',
  cnpj: '00.000.000/0001-00',
  endereco: 'Rua do Mercado, 100 - Centro',
  cidade: 'Cidade/UF',
  telefone: '(00) 0000-0000',
  email: 'contato@mercadomunicipal.com.br',
  logoUrl: '',
  corPrimaria: '#1e40af',
  corSecundaria: '#f59e0b',
  sistemaNome: 'Mercado Municipal Digital',
  rodapeTexto: 'Documento gerado eletronicamente pelo sistema. Este documento possui validade administrativa.',
};

export function InstituicaoConfig() {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const { isAdminMaster, loading: roleLoading } = useUserRole();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<InstituicaoConfigData>(DEFAULT_VALUES);
  const [hasChanges, setHasChanges] = useState(false);

  const canEdit = isAdminMaster;

  const { isLoading } = useQuery({
    queryKey: ["instituicao-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_administrativas")
        .select("chave, descricao")
        .in("chave", CONFIG_KEYS);

      if (error) throw error;

      const configMap = new Map(data?.map(item => [item.chave, item.descricao]) || []);

      const loadedConfig: InstituicaoConfigData = {
        nome: configMap.get('instituicao_nome') || DEFAULT_VALUES.nome,
        cnpj: configMap.get('instituicao_cnpj') || DEFAULT_VALUES.cnpj,
        endereco: configMap.get('instituicao_endereco') || DEFAULT_VALUES.endereco,
        cidade: configMap.get('instituicao_cidade') || DEFAULT_VALUES.cidade,
        telefone: configMap.get('instituicao_telefone') || DEFAULT_VALUES.telefone,
        email: configMap.get('instituicao_email') || DEFAULT_VALUES.email,
        logoUrl: configMap.get('instituicao_logo_url') || DEFAULT_VALUES.logoUrl,
        corPrimaria: configMap.get('instituicao_cor_primaria') || DEFAULT_VALUES.corPrimaria,
        corSecundaria: configMap.get('instituicao_cor_secundaria') || DEFAULT_VALUES.corSecundaria,
        sistemaNome: configMap.get('sistema_nome') || DEFAULT_VALUES.sistemaNome,
        rodapeTexto: configMap.get('rodape_texto') || DEFAULT_VALUES.rodapeTexto,
      };

      setFormData(loadedConfig);
      return loadedConfig;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (config: InstituicaoConfigData) => {
      const updates = [
        { chave: 'instituicao_nome', descricao: config.nome },
        { chave: 'instituicao_cnpj', descricao: config.cnpj },
        { chave: 'instituicao_endereco', descricao: config.endereco },
        { chave: 'instituicao_cidade', descricao: config.cidade },
        { chave: 'instituicao_telefone', descricao: config.telefone },
        { chave: 'instituicao_email', descricao: config.email },
        { chave: 'instituicao_logo_url', descricao: config.logoUrl },
        { chave: 'instituicao_cor_primaria', descricao: config.corPrimaria },
        { chave: 'instituicao_cor_secundaria', descricao: config.corSecundaria },
        { chave: 'sistema_nome', descricao: config.sistemaNome },
        { chave: 'rodape_texto', descricao: config.rodapeTexto },
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
      queryClient.invalidateQueries({ queryKey: ["instituicao-config"] });
      logAction({
        action: "UPDATE_INSTITUICAO_CONFIG",
        tableName: "configuracoes_administrativas",
        recordId: "instituicao",
        newValues: config as unknown as Record<string, unknown>,
      });
      toast({ 
        title: "Configurações salvas",
        description: "Os dados institucionais foram atualizados com sucesso.",
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

  const handleChange = (field: keyof InstituicaoConfigData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
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
            Apenas o <strong>Administrador Master</strong> pode alterar os dados institucionais.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Instituição */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <div>
                <CardTitle>Dados da Instituição</CardTitle>
                <CardDescription>
                  Informações exibidas nos cabeçalhos e rodapés dos relatórios
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <Label htmlFor="endereco" className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Endereço
                </Label>
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

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telefone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Telefone
                </Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => handleChange('telefone', e.target.value)}
                  disabled={!canEdit}
                  placeholder="(00) 0000-0000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  E-mail
                </Label>
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
          </CardContent>
        </Card>

        {/* Identidade Visual */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              <div>
                <CardTitle>Identidade Visual</CardTitle>
                <CardDescription>
                  Cores e logotipo usados nos e-mails e relatórios
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="corPrimaria">Cor Primária</Label>
                <div className="flex gap-2">
                  <Input
                    id="corPrimaria"
                    type="color"
                    value={formData.corPrimaria}
                    onChange={(e) => handleChange('corPrimaria', e.target.value)}
                    disabled={!canEdit}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.corPrimaria}
                    onChange={(e) => handleChange('corPrimaria', e.target.value)}
                    disabled={!canEdit}
                    placeholder="#1e40af"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="corSecundaria">Cor Secundária</Label>
                <div className="flex gap-2">
                  <Input
                    id="corSecundaria"
                    type="color"
                    value={formData.corSecundaria}
                    onChange={(e) => handleChange('corSecundaria', e.target.value)}
                    disabled={!canEdit}
                    className="w-14 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.corSecundaria}
                    onChange={(e) => handleChange('corSecundaria', e.target.value)}
                    disabled={!canEdit}
                    placeholder="#f59e0b"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="logoUrl" className="flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  URL do Logotipo
                </Label>
                <Input
                  id="logoUrl"
                  value={formData.logoUrl}
                  onChange={(e) => handleChange('logoUrl', e.target.value)}
                  disabled={!canEdit}
                  placeholder="https://..."
                />
              </div>
            </div>

            {formData.logoUrl && (
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <img 
                  src={formData.logoUrl} 
                  alt="Logo preview" 
                  className="h-16 w-auto object-contain"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-sm text-muted-foreground">Preview do logotipo</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sistema e Rodapé */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <div>
                <CardTitle>Sistema e Documentos</CardTitle>
                <CardDescription>
                  Nome do sistema e texto padrão para documentos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sistemaNome">Nome do Sistema</Label>
              <Input
                id="sistemaNome"
                value={formData.sistemaNome}
                onChange={(e) => handleChange('sistemaNome', e.target.value)}
                disabled={!canEdit}
                placeholder="Nome exibido nos relatórios"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="rodapeTexto">Texto Institucional (Rodapé)</Label>
              <Textarea
                id="rodapeTexto"
                value={formData.rodapeTexto}
                onChange={(e) => handleChange('rodapeTexto', e.target.value)}
                disabled={!canEdit}
                placeholder="Texto exibido no rodapé de todos os relatórios"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {canEdit && (
          <div className="flex justify-end">
            <Button type="submit" disabled={!hasChanges || updateMutation.isPending}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
