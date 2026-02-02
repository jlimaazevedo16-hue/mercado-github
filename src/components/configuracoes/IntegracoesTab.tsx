import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Mail, 
  MessageCircle, 
  Bot, 
  Settings, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Loader2,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { IntegracaoConfigDialog } from './IntegracaoConfigDialog';
import { useToast } from '@/hooks/use-toast';

type IntegrationStatus = 'not_configured' | 'testing' | 'configured' | 'error';

interface Integracao {
  id: string;
  integracao: string;
  status: IntegrationStatus;
  config_public: {
    nome: string;
    descricao: string;
    icone: string;
  };
  obrigatoria: boolean;
  ultima_verificacao: string | null;
  mensagem_erro: string | null;
}

const iconMap: Record<string, React.ElementType> = {
  Database,
  Mail,
  MessageCircle,
  Bot,
  Settings
};

const statusConfig: Record<IntegrationStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
  not_configured: { label: 'Não configurado', variant: 'secondary', icon: AlertCircle },
  testing: { label: 'Testando...', variant: 'outline', icon: Loader2 },
  configured: { label: 'Configurado', variant: 'default', icon: CheckCircle2 },
  error: { label: 'Erro', variant: 'destructive', icon: XCircle }
};

export const IntegracoesTab = () => {
  const [integracoes, setIntegracoes] = useState<Integracao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIntegracao, setSelectedIntegracao] = useState<Integracao | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { isAdminMaster } = useUserRole();
  const { toast } = useToast();

  const fetchIntegracoes = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracoes_integracoes')
        .select('*')
        .order('ordem');

      if (error) throw error;
      
      // Type assertion para garantir que config_public tem a estrutura correta
      const typedData = (data || []).map(item => ({
        ...item,
        status: item.status as IntegrationStatus,
        config_public: item.config_public as Integracao['config_public']
      }));
      
      setIntegracoes(typedData);
    } catch (error) {
      console.error('Erro ao carregar integrações:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as integrações',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegracoes();
  }, []);

  const handleConfigureClick = (integracao: Integracao) => {
    setSelectedIntegracao(integracao);
    setDialogOpen(true);
  };

  const obrigatorias = integracoes.filter(i => i.obrigatoria);
  const opcionais = integracoes.filter(i => !i.obrigatoria);
  const todasObrigatoriasConfiguradas = obrigatorias.every(i => i.status === 'configured');

  if (!isAdminMaster) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Apenas administradores master podem gerenciar integrações.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Geral */}
      <Card className={todasObrigatoriasConfiguradas ? 'border-green-500/50' : 'border-amber-500/50'}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            {todasObrigatoriasConfiguradas ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <AlertCircle className="h-5 w-5 text-amber-500" />
            )}
            <CardTitle className="text-lg">
              {todasObrigatoriasConfiguradas ? 'Sistema Configurado' : 'Configuração Pendente'}
            </CardTitle>
          </div>
          <CardDescription>
            {todasObrigatoriasConfiguradas 
              ? 'Todas as integrações obrigatórias estão configuradas. O sistema está pronto para uso.'
              : 'Configure as integrações obrigatórias para liberar o acesso ao sistema.'}
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Integrações Obrigatórias */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Obrigatórias
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {obrigatorias.map(integracao => (
            <IntegracaoCard 
              key={integracao.id} 
              integracao={integracao} 
              onConfigure={() => handleConfigureClick(integracao)}
            />
          ))}
        </div>
      </div>

      {/* Integrações Opcionais */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Opcionais
        </h3>
        <div className="grid gap-4 md:grid-cols-2">
          {opcionais.map(integracao => (
            <IntegracaoCard 
              key={integracao.id} 
              integracao={integracao}
              onConfigure={() => handleConfigureClick(integracao)}
            />
          ))}
        </div>
      </div>

      {/* Espaço para futuras integrações */}
      <Card className="border-dashed">
        <CardContent className="flex items-center justify-center py-8 text-muted-foreground">
          <div className="text-center">
            <Plus className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Novas integrações serão adicionadas em versões futuras</p>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Configuração */}
      {selectedIntegracao && (
        <IntegracaoConfigDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          integracao={selectedIntegracao}
          onSuccess={() => {
            fetchIntegracoes();
            setDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

interface IntegracaoCardProps {
  integracao: Integracao;
  onConfigure: () => void;
}

const IntegracaoCard = ({ integracao, onConfigure }: IntegracaoCardProps) => {
  const Icon = iconMap[integracao.config_public?.icone] || Settings;
  const status = statusConfig[integracao.status];
  const StatusIcon = status.icon;

  return (
    <Card className="relative overflow-hidden">
      {integracao.obrigatoria && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-medium px-2 py-0.5">
          OBRIGATÓRIO
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base">{integracao.config_public?.nome || integracao.integracao}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {integracao.config_public?.descricao}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <Badge variant={status.variant} className="gap-1">
            <StatusIcon className={`h-3 w-3 ${integracao.status === 'testing' ? 'animate-spin' : ''}`} />
            {status.label}
          </Badge>
          <Button size="sm" variant="outline" onClick={onConfigure}>
            {integracao.status === 'configured' ? 'Editar' : 'Configurar'}
          </Button>
        </div>
        {integracao.mensagem_erro && (
          <p className="text-xs text-destructive mt-2 line-clamp-2">
            {integracao.mensagem_erro}
          </p>
        )}
        {integracao.ultima_verificacao && (
          <p className="text-xs text-muted-foreground mt-2">
            Última verificação: {new Date(integracao.ultima_verificacao).toLocaleString('pt-BR')}
          </p>
        )}
      </CardContent>
    </Card>
  );
};
