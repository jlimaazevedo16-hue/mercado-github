import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, Clock, FileWarning, Wrench, Scale, Search,
  Upload, CheckCircle, AlertCircle, Calendar, FileX, Plus, Building2,
  History, Eye, XCircle, RotateCcw, Send, Loader2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import type { Database } from '@/integrations/supabase/types';

type PendenciaStatus = Database['public']['Enums']['pendencia_status'];
type PendenciaTipo = Database['public']['Enums']['pendencia_tipo'];
type PendenciaUrgencia = Database['public']['Enums']['pendencia_urgencia'];

interface Pendencia {
  id: string;
  created_at: string;
  tipo: PendenciaTipo;
  titulo: string;
  descricao: string | null;
  box_id: string | null;
  responsavel_id: string | null;
  status: PendenciaStatus;
  urgencia: PendenciaUrgencia;
  data_vencimento: string | null;
  documento_url: string | null;
  documento_nome: string | null;
  motivo_rejeicao: string | null;
  observacoes: string | null;
  boxes?: { codigo: string; boxe: string; inquilino: string | null; setor_id: string | null } | null;
  responsaveis?: { nome: string } | null;
}

interface PendenciaLog {
  id: string;
  created_at: string;
  status_anterior: PendenciaStatus | null;
  status_novo: PendenciaStatus;
  acao: string;
  observacao: string | null;
  user_id: string | null;
}

const statusLabels: Record<PendenciaStatus, { label: string; className: string; icon: React.ReactNode }> = {
  PENDENTE: { label: 'Pendente', className: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300', icon: <AlertCircle className="h-3 w-3" /> },
  EM_REGULARIZACAO: { label: 'Em Regularização', className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300', icon: <Clock className="h-3 w-3" /> },
  EM_ANALISE: { label: 'Em Análise', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300', icon: <Eye className="h-3 w-3" /> },
  REGULARIZADO: { label: 'Regularizado', className: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300', icon: <CheckCircle className="h-3 w-3" /> },
  REJEITADO: { label: 'Rejeitado', className: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300', icon: <XCircle className="h-3 w-3" /> },
};

const urgenciaLabels: Record<PendenciaUrgencia, { label: string; className: string }> = {
  vencido: { label: 'Vencido', className: 'bg-destructive text-destructive-foreground' },
  urgente: { label: 'Urgente', className: 'bg-orange-500 text-white' },
  proximo: { label: 'Próximo', className: 'bg-yellow-500 text-white' },
  normal: { label: 'Normal', className: 'bg-muted text-muted-foreground' },
};

const tipoIcons: Record<PendenciaTipo, React.ReactNode> = {
  notificacao: <AlertTriangle className="h-4 w-4" />,
  certificado: <FileWarning className="h-4 w-4" />,
  reforma: <Wrench className="h-4 w-4" />,
  processo: <Scale className="h-4 w-4" />,
  documento_ausente: <FileX className="h-4 w-4" />,
  ocorrencia: <AlertCircle className="h-4 w-4" />,
};

const tipoLabels: Record<PendenciaTipo, string> = {
  notificacao: 'Notificação',
  certificado: 'Certificado',
  reforma: 'Reforma',
  processo: 'Processo',
  documento_ausente: 'Doc. Ausente',
  ocorrencia: 'Ocorrência',
};

export const PendenciasLista = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { role, isAdmin, isAdminMaster } = useUserRole();
  const { logAction } = useAuditLog();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('all');
  const [setorFilter, setSetorFilter] = useState<string>('all');
  
  // Dialogs
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [actionType, setActionType] = useState<'regularizar' | 'enviar_analise' | 'aprovar' | 'rejeitar' | 'reabrir'>('regularizar');
  const [actionObservacao, setActionObservacao] = useState('');
  const [motivoRejeicao, setMotivoRejeicao] = useState('');
  const [showOcorrenciaDialog, setShowOcorrenciaDialog] = useState(false);
  const [ocorrenciaData, setOcorrenciaData] = useState({
    box_id: '',
    titulo: '',
    descricao: '',
    data_vencimento: '',
  });

  const isLojistaView = role === 'lojista';

  // Fetch setores for filter
  const { data: setores } = useQuery({
    queryKey: ['setores-filter'],
    queryFn: async () => {
      const { data } = await supabase.from('setores').select('id, nome').order('nome');
      return data || [];
    },
    enabled: isAdmin || isAdminMaster,
  });

  // Fetch boxes for new occurrence
  const { data: allBoxes } = useQuery({
    queryKey: ['all-boxes-pendencias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('boxes')
        .select('id, codigo, boxe, inquilino, responsavel_id, setor_id')
        .order('codigo');
      return data || [];
    },
    enabled: isAdmin || isAdminMaster,
  });

  // Fetch pendências
  const { data: pendencias, isLoading } = useQuery({
    queryKey: ['pendencias-v2'],
    queryFn: async () => {
      let query = supabase
        .from('pendencias')
        .select(`
          *,
          boxes (codigo, boxe, inquilino, setor_id),
          responsaveis (nome)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as Pendencia[];
    },
  });

  // Fetch logs for selected pendencia
  const { data: pendenciaLogs } = useQuery({
    queryKey: ['pendencia-logs', selectedPendencia?.id],
    queryFn: async () => {
      if (!selectedPendencia?.id) return [];
      const { data } = await supabase
        .from('pendencia_logs')
        .select('*')
        .eq('pendencia_id', selectedPendencia.id)
        .order('created_at', { ascending: false });
      return (data || []) as PendenciaLog[];
    },
    enabled: !!selectedPendencia?.id,
  });

  // Status transition mutation
  const transitionMutation = useMutation({
    mutationFn: async ({ 
      pendenciaId, 
      novoStatus, 
      acao, 
      observacao,
      motivoRejeicao 
    }: { 
      pendenciaId: string; 
      novoStatus: PendenciaStatus; 
      acao: string; 
      observacao?: string;
      motivoRejeicao?: string;
    }) => {
      const pendencia = pendencias?.find(p => p.id === pendenciaId);
      
      // Update pendencia
      const updateData: Record<string, unknown> = { status: novoStatus };
      if (motivoRejeicao) updateData.motivo_rejeicao = motivoRejeicao;
      if (novoStatus === 'REGULARIZADO') updateData.motivo_rejeicao = null;

      const { error: updateError } = await supabase
        .from('pendencias')
        .update(updateData)
        .eq('id', pendenciaId);

      if (updateError) throw updateError;

      // Create log
      const { error: logError } = await supabase
        .from('pendencia_logs')
        .insert([{
          pendencia_id: pendenciaId,
          user_id: user?.id,
          status_anterior: pendencia?.status,
          status_novo: novoStatus,
          acao,
          observacao,
        }]);

      if (logError) throw logError;

      // Audit log
      await logAction({
        action: `pendencia_${acao}`,
        tableName: 'pendencias',
        recordId: pendenciaId,
        oldValues: { status: pendencia?.status },
        newValues: { status: novoStatus },
      });

      return { pendencia, novoStatus };
    },
    onSuccess: ({ novoStatus }) => {
      queryClient.invalidateQueries({ queryKey: ['pendencias-v2'] });
      queryClient.invalidateQueries({ queryKey: ['pendencia-logs'] });
      
      const messages: Record<string, string> = {
        PENDENTE: 'Pendência reaberta',
        EM_REGULARIZACAO: 'Pendência marcada como "Em Regularização"',
        EM_ANALISE: 'Documento enviado para análise',
        REGULARIZADO: 'Pendência aprovada e regularizada',
        REJEITADO: 'Pendência rejeitada',
      };
      
      toast.success(messages[novoStatus] || 'Status atualizado');
      setShowActionDialog(false);
      setActionObservacao('');
      setMotivoRejeicao('');
    },
    onError: (error) => {
      console.error('Transition error:', error);
      toast.error('Erro ao atualizar status');
    },
  });

  // Create occurrence mutation
  const createOcorrenciaMutation = useMutation({
    mutationFn: async (data: typeof ocorrenciaData) => {
      const box = allBoxes?.find(b => b.id === data.box_id);
      
      const { data: newPendencia, error } = await supabase
        .from('pendencias')
        .insert([{
          tipo: 'ocorrencia' as PendenciaTipo,
          titulo: data.titulo,
          descricao: data.descricao,
          box_id: data.box_id,
          responsavel_id: box?.responsavel_id,
          data_vencimento: data.data_vencimento || null,
          status: 'PENDENTE' as PendenciaStatus,
          urgencia: calculateUrgencia(data.data_vencimento) as PendenciaUrgencia,
        }])
        .select()
        .single();

      if (error) throw error;

      // Create initial log
      await supabase.from('pendencia_logs').insert([{
        pendencia_id: newPendencia.id,
        user_id: user?.id,
        status_novo: 'PENDENTE',
        acao: 'criacao',
        observacao: 'Ocorrência criada manualmente',
      }]);

      return newPendencia;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendencias-v2'] });
      toast.success('Ocorrência registrada com sucesso');
      setShowOcorrenciaDialog(false);
      setOcorrenciaData({ box_id: '', titulo: '', descricao: '', data_vencimento: '' });
    },
    onError: (error) => {
      console.error('Create error:', error);
      toast.error('Erro ao criar ocorrência');
    },
  });

  const calculateUrgencia = (dataVencimento: string | null): PendenciaUrgencia => {
    if (!dataVencimento) return 'normal';
    const dias = differenceInDays(new Date(dataVencimento), new Date());
    if (dias < 0) return 'vencido';
    if (dias <= 7) return 'urgente';
    if (dias <= 30) return 'proximo';
    return 'normal';
  };

  const handleAction = (pendencia: Pendencia, action: typeof actionType) => {
    setSelectedPendencia(pendencia);
    setActionType(action);
    setShowActionDialog(true);
  };

  const executeAction = () => {
    if (!selectedPendencia) return;

    const statusMap: Record<typeof actionType, PendenciaStatus> = {
      regularizar: 'EM_REGULARIZACAO',
      enviar_analise: 'EM_ANALISE',
      aprovar: 'REGULARIZADO',
      rejeitar: 'REJEITADO',
      reabrir: 'PENDENTE',
    };

    transitionMutation.mutate({
      pendenciaId: selectedPendencia.id,
      novoStatus: statusMap[actionType],
      acao: actionType,
      observacao: actionObservacao,
      motivoRejeicao: actionType === 'rejeitar' ? motivoRejeicao : undefined,
    });
  };

  // Filter pendencias
  const filteredPendencias = pendencias?.filter((p) => {
    const matchesSearch = !searchTerm || 
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.boxes?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.responsaveis?.nome?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === 'all' || p.tipo === tipoFilter;
    const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
    const matchesUrgencia = urgenciaFilter === 'all' || p.urgencia === urgenciaFilter;
    const matchesSetor = setorFilter === 'all' || p.boxes?.setor_id === setorFilter;

    return matchesSearch && matchesTipo && matchesStatus && matchesUrgencia && matchesSetor;
  });

  // Stats
  const stats = {
    total: pendencias?.length || 0,
    pendentes: pendencias?.filter(p => p.status === 'PENDENTE').length || 0,
    emRegularizacao: pendencias?.filter(p => p.status === 'EM_REGULARIZACAO').length || 0,
    emAnalise: pendencias?.filter(p => p.status === 'EM_ANALISE').length || 0,
    regularizados: pendencias?.filter(p => p.status === 'REGULARIZADO').length || 0,
    rejeitados: pendencias?.filter(p => p.status === 'REJEITADO').length || 0,
  };

  const getAvailableActions = (pendencia: Pendencia) => {
    const actions: Array<{ action: typeof actionType; label: string; icon: React.ReactNode; variant?: 'default' | 'destructive' | 'outline' }> = [];

    if (isLojistaView) {
      // Lojista actions
      if (pendencia.status === 'PENDENTE' || pendencia.status === 'REJEITADO') {
        actions.push({ action: 'regularizar', label: 'Estou Providenciando', icon: <Clock className="h-4 w-4" /> });
      }
      if (pendencia.status === 'EM_REGULARIZACAO') {
        actions.push({ action: 'enviar_analise', label: 'Enviar para Análise', icon: <Send className="h-4 w-4" /> });
      }
    } else {
      // Admin actions
      if (pendencia.status === 'EM_ANALISE') {
        actions.push({ action: 'aprovar', label: 'Aprovar', icon: <CheckCircle className="h-4 w-4" /> });
        actions.push({ action: 'rejeitar', label: 'Rejeitar', icon: <XCircle className="h-4 w-4" />, variant: 'destructive' });
      }
      if (pendencia.status === 'REGULARIZADO' || pendencia.status === 'REJEITADO') {
        actions.push({ action: 'reabrir', label: 'Reabrir', icon: <RotateCcw className="h-4 w-4" />, variant: 'outline' });
      }
    }

    return actions;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{stats.pendentes}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-yellow-600">{stats.emRegularizacao}</p>
              <p className="text-xs text-muted-foreground">Em Regularização</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.emAnalise}</p>
              <p className="text-xs text-muted-foreground">Em Análise</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{stats.regularizados}</p>
              <p className="text-xs text-muted-foreground">Regularizados</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-purple-500/50">
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">{stats.rejeitados}</p>
              <p className="text-xs text-muted-foreground">Rejeitados</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pendências
              {isLojistaView && <Badge variant="secondary">Meus Boxes</Badge>}
            </CardTitle>
            {(isAdmin || isAdminMaster) && (
              <Button onClick={() => setShowOcorrenciaDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Ocorrência
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px] relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Status</SelectItem>
                <SelectItem value="PENDENTE">Pendente</SelectItem>
                <SelectItem value="EM_REGULARIZACAO">Em Regularização</SelectItem>
                <SelectItem value="EM_ANALISE">Em Análise</SelectItem>
                <SelectItem value="REGULARIZADO">Regularizado</SelectItem>
                <SelectItem value="REJEITADO">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Tipos</SelectItem>
                <SelectItem value="notificacao">Notificação</SelectItem>
                <SelectItem value="certificado">Certificado</SelectItem>
                <SelectItem value="documento_ausente">Doc. Ausente</SelectItem>
                <SelectItem value="reforma">Reforma</SelectItem>
                <SelectItem value="processo">Processo</SelectItem>
                <SelectItem value="ocorrencia">Ocorrência</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vencido">Vencido</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
                <SelectItem value="proximo">Próximo</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
            {(isAdmin || isAdminMaster) && setores && setores.length > 0 && (
              <Select value={setorFilter} onValueChange={setSetorFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Setor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Setores</SelectItem>
                  {setores.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Box</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPendencias?.map((pendencia) => {
                const actions = getAvailableActions(pendencia);
                return (
                  <TableRow key={pendencia.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {tipoIcons[pendencia.tipo]}
                        <span className="text-xs">{tipoLabels[pendencia.tipo]}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{pendencia.titulo}</p>
                        {pendencia.descricao && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {pendencia.descricao}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{pendencia.boxes?.codigo || '-'}</TableCell>
                    <TableCell className="text-sm">{pendencia.responsaveis?.nome || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {pendencia.data_vencimento 
                        ? format(new Date(pendencia.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge className={`gap-1 ${statusLabels[pendencia.status].className}`}>
                        {statusLabels[pendencia.status].icon}
                        {statusLabels[pendencia.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={urgenciaLabels[pendencia.urgencia].className}>
                        {urgenciaLabels[pendencia.urgencia].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedPendencia(pendencia);
                            setShowDetailDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {actions.map((act) => (
                          <Button
                            key={act.action}
                            variant={act.variant || 'outline'}
                            size="sm"
                            onClick={() => handleAction(pendencia, act.action)}
                          >
                            {act.icon}
                          </Button>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredPendencias || filteredPendencias.length === 0) && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhuma pendência encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedPendencia && tipoIcons[selectedPendencia.tipo]}
              {selectedPendencia?.titulo}
            </DialogTitle>
          </DialogHeader>
          {selectedPendencia && (
            <Tabs defaultValue="info" className="mt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="info">Informações</TabsTrigger>
                <TabsTrigger value="historico">
                  Histórico
                  {pendenciaLogs && pendenciaLogs.length > 0 && (
                    <Badge variant="secondary" className="ml-2">{pendenciaLogs.length}</Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="info" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <Badge className={`mt-1 gap-1 ${statusLabels[selectedPendencia.status].className}`}>
                      {statusLabels[selectedPendencia.status].icon}
                      {statusLabels[selectedPendencia.status].label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Urgência</Label>
                    <Badge className={`mt-1 ${urgenciaLabels[selectedPendencia.urgencia].className}`}>
                      {urgenciaLabels[selectedPendencia.urgencia].label}
                    </Badge>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Box</Label>
                    <p className="font-medium">{selectedPendencia.boxes?.codigo || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Responsável</Label>
                    <p className="font-medium">{selectedPendencia.responsaveis?.nome || '-'}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Vencimento</Label>
                    <p className="font-medium">
                      {selectedPendencia.data_vencimento 
                        ? format(new Date(selectedPendencia.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'
                      }
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Criado em</Label>
                    <p className="font-medium">
                      {format(new Date(selectedPendencia.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </div>
                {selectedPendencia.descricao && (
                  <div>
                    <Label className="text-muted-foreground">Descrição</Label>
                    <p className="mt-1">{selectedPendencia.descricao}</p>
                  </div>
                )}
                {selectedPendencia.motivo_rejeicao && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
                    <Label className="text-red-700 dark:text-red-400">Motivo da Rejeição</Label>
                    <p className="mt-1 text-red-700 dark:text-red-300">{selectedPendencia.motivo_rejeicao}</p>
                  </div>
                )}
                {selectedPendencia.documento_url && (
                  <div>
                    <Label className="text-muted-foreground">Documento Anexado</Label>
                    <a 
                      href={selectedPendencia.documento_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline block mt-1"
                    >
                      {selectedPendencia.documento_nome || 'Ver documento'}
                    </a>
                  </div>
                )}
              </TabsContent>
              <TabsContent value="historico" className="mt-4">
                <ScrollArea className="h-[300px]">
                  {pendenciaLogs && pendenciaLogs.length > 0 ? (
                    <div className="space-y-3">
                      {pendenciaLogs.map((log) => (
                        <div key={log.id} className="flex gap-3 p-3 bg-muted/50 rounded-lg">
                          <History className="h-4 w-4 mt-1 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {log.status_anterior && (
                                <>
                                  <Badge variant="outline" className="text-xs">
                                    {statusLabels[log.status_anterior]?.label}
                                  </Badge>
                                  <span className="text-muted-foreground">→</span>
                                </>
                              )}
                              <Badge className={`text-xs ${statusLabels[log.status_novo].className}`}>
                                {statusLabels[log.status_novo].label}
                              </Badge>
                            </div>
                            {log.observacao && (
                              <p className="text-sm mt-1">{log.observacao}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhum histórico disponível
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Action Dialog */}
      <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'regularizar' && 'Marcar como "Em Regularização"'}
              {actionType === 'enviar_analise' && 'Enviar para Análise'}
              {actionType === 'aprovar' && 'Aprovar Regularização'}
              {actionType === 'rejeitar' && 'Rejeitar'}
              {actionType === 'reabrir' && 'Reabrir Pendência'}
            </DialogTitle>
            <DialogDescription>
              {selectedPendencia?.titulo} - {selectedPendencia?.boxes?.codigo}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {actionType === 'rejeitar' && (
              <div>
                <Label>Motivo da Rejeição *</Label>
                <Textarea
                  value={motivoRejeicao}
                  onChange={(e) => setMotivoRejeicao(e.target.value)}
                  placeholder="Informe o motivo da rejeição..."
                  rows={3}
                />
              </div>
            )}
            <div>
              <Label>Observação {actionType !== 'rejeitar' && '(opcional)'}</Label>
              <Textarea
                value={actionObservacao}
                onChange={(e) => setActionObservacao(e.target.value)}
                placeholder="Adicione uma observação..."
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowActionDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={executeAction}
              disabled={transitionMutation.isPending || (actionType === 'rejeitar' && !motivoRejeicao)}
              variant={actionType === 'rejeitar' ? 'destructive' : 'default'}
            >
              {transitionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Occurrence Dialog */}
      <Dialog open={showOcorrenciaDialog} onOpenChange={setShowOcorrenciaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Nova Ocorrência
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Box *</Label>
              <Select
                value={ocorrenciaData.box_id}
                onValueChange={(v) => setOcorrenciaData({ ...ocorrenciaData, box_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o box" />
                </SelectTrigger>
                <SelectContent>
                  {allBoxes?.map((box) => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.codigo} - {box.inquilino || 'Sem inquilino'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Título *</Label>
              <Input
                value={ocorrenciaData.titulo}
                onChange={(e) => setOcorrenciaData({ ...ocorrenciaData, titulo: e.target.value })}
                placeholder="Ex: Limpeza pendente"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={ocorrenciaData.descricao}
                onChange={(e) => setOcorrenciaData({ ...ocorrenciaData, descricao: e.target.value })}
                placeholder="Descreva a ocorrência..."
                rows={3}
              />
            </div>
            <div>
              <Label>Prazo (opcional)</Label>
              <Input
                type="date"
                value={ocorrenciaData.data_vencimento}
                onChange={(e) => setOcorrenciaData({ ...ocorrenciaData, data_vencimento: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOcorrenciaDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => createOcorrenciaMutation.mutate(ocorrenciaData)}
              disabled={createOcorrenciaMutation.isPending || !ocorrenciaData.box_id || !ocorrenciaData.titulo}
            >
              {createOcorrenciaMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
