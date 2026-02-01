import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, FileText, Search, AlertTriangle, Scale, Trash2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUserRole } from '@/hooks/useUserRole';
import { useLojistaResponsavel } from '@/hooks/useLojistaResponsavel';

interface NotificacoesListaProps {
  onViewPad: (padId: string) => void;
}

type NotificationType = 'interna' | 'externa';
type InfractionClassification = 'leve' | 'media' | 'grave' | 'gravissima';

interface Notificacao {
  id: string;
  numero_interno: string | null;
  tipo: NotificationType;
  artigo_violado: string;
  descricao_infracao: string;
  classificacao: InfractionClassification;
  data_notificacao: string;
  prazo_defesa: string | null;
  prazo_adequacao: string | null;
  status: string | null;
  observacoes: string | null;
  box_id: string | null;
  responsavel_id: string | null;
  boxes?: { codigo: string; boxe: string } | null;
  responsaveis?: { nome: string } | null;
  pads?: { id: string; numero_processo: string }[];
}

const classificationColors: Record<InfractionClassification, string> = {
  leve: 'bg-yellow-100 text-yellow-800',
  media: 'bg-orange-100 text-orange-800',
  grave: 'bg-red-100 text-red-800',
  gravissima: 'bg-red-200 text-red-900',
};

const statusColors: Record<string, string> = {
  pendente: 'bg-yellow-100 text-yellow-800',
  em_analise: 'bg-blue-100 text-blue-800',
  resolvida: 'bg-green-100 text-green-800',
  pad_aberto: 'bg-red-100 text-red-800',
};

export const NotificacoesLista = ({ onViewPad }: NotificacoesListaProps) => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const { role, isAdmin, isAdminMaster } = useUserRole();
  const { responsavelId, isLojista } = useLojistaResponsavel();
  
  const [search, setSearch] = useState('');
  const [filterClassificacao, setFilterClassificacao] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showPadDialog, setShowPadDialog] = useState(false);
  const [selectedNotificacao, setSelectedNotificacao] = useState<Notificacao | null>(null);
  const [padData, setPadData] = useState({
    relator: '',
    taxa_condominio_base: '',
    percentual_multa: '50',
    fundamentacao: '',
  });

  // Buscar boxes vinculados ao lojista
  const { data: userBoxIds } = useQuery({
    queryKey: ['lojista-box-ids', responsavelId],
    queryFn: async () => {
      if (!responsavelId) return [];
      const { data } = await supabase
        .from('boxes')
        .select('id')
        .eq('responsavel_id', responsavelId);
      return data?.map(b => b.id) || [];
    },
    enabled: isLojista && !!responsavelId,
  });

  const { data: notificacoes, isLoading } = useQuery({
    queryKey: ['notificacoes', isLojista, userBoxIds],
    queryFn: async () => {
      let query = supabase
        .from('notificacoes')
        .select(`
          *,
          boxes (codigo, boxe),
          responsaveis (nome),
          pads (id, numero_processo)
        `)
        .order('created_at', { ascending: false });

      // Filtrar para lojista: apenas notificações dos seus boxes
      if (isLojista && userBoxIds && userBoxIds.length > 0) {
        query = query.in('box_id', userBoxIds);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Notificacao[];
    },
  });

  const createPadMutation = useMutation({
    mutationFn: async (notificacao: Notificacao) => {
      const year = new Date().getFullYear();
      const { data: countData } = await supabase
        .from('pads')
        .select('id', { count: 'exact' });
      
      const numero = String((countData?.length || 0) + 1).padStart(4, '0');
      const numeroProcesso = `PAD-${numero}/${year}`;

      const taxaBase = parseFloat(padData.taxa_condominio_base) || 0;
      const percentual = parseInt(padData.percentual_multa) || 50;
      const valorMulta = taxaBase * (percentual / 100);

      const { data, error } = await supabase
        .from('pads')
        .insert({
          numero_processo: numeroProcesso,
          notificacao_id: notificacao.id,
          box_id: notificacao.box_id,
          responsavel_id: notificacao.responsavel_id,
          status: 'autuacao',
          relator: padData.relator,
          taxa_condominio_base: taxaBase,
          percentual_multa: percentual,
          valor_multa: valorMulta,
          fundamentacao: padData.fundamentacao,
        })
        .select()
        .single();

      if (error) throw error;

      // Update notification status
      await supabase
        .from('notificacoes')
        .update({ status: 'pad_aberto' })
        .eq('id', notificacao.id);

      // Create first step
      await supabase
        .from('pad_etapas')
        .insert({
          pad_id: data.id,
          etapa: 'autuacao',
          descricao: 'Processo administrativo instaurado',
          responsavel_etapa: padData.relator,
        });

      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      queryClient.invalidateQueries({ queryKey: ['pads'] });
      logAction({
        action: 'CREATE_PAD',
        tableName: 'pads',
        recordId: data.id,
        newValues: data,
      });
      toast.success('PAD criado com sucesso!');
      setShowPadDialog(false);
      setSelectedNotificacao(null);
      setPadData({ relator: '', taxa_condominio_base: '', percentual_multa: '50', fundamentacao: '' });
      onViewPad(data.id);
    },
    onError: () => {
      toast.error('Erro ao criar PAD');
    },
  });

  const deleteNotificacaoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      logAction({
        action: 'DELETE_NOTIFICACAO',
        tableName: 'notificacoes',
        recordId: id,
      });
      toast.success('Notificação excluída');
    },
    onError: () => {
      toast.error('Erro ao excluir notificação');
    },
  });

  const filteredNotificacoes = notificacoes?.filter((n) => {
    const matchesSearch =
      n.numero_interno?.toLowerCase().includes(search.toLowerCase()) ||
      n.artigo_violado.toLowerCase().includes(search.toLowerCase()) ||
      n.boxes?.codigo.toLowerCase().includes(search.toLowerCase()) ||
      n.responsaveis?.nome.toLowerCase().includes(search.toLowerCase());

    const matchesClassificacao =
      filterClassificacao === 'all' || n.classificacao === filterClassificacao;

    const matchesStatus =
      filterStatus === 'all' || n.status === filterStatus;

    return matchesSearch && matchesClassificacao && matchesStatus;
  });

  const handleOpenPadDialog = (notificacao: Notificacao) => {
    setSelectedNotificacao(notificacao);
    setShowPadDialog(true);
  };

  // Apenas admins podem abrir PAD e excluir notificações
  const canManage = isAdmin || isAdminMaster;

  return (
    <>
      {/* Indicador de visualização do lojista */}
      {isLojista && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Building2 className="h-5 w-5" />
            <span className="font-medium">
              Visualizando notificações dos seus boxes
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Lista de Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, artigo, box ou responsável..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterClassificacao} onValueChange={setFilterClassificacao}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Classificação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="leve">Leve</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="grave">Grave</SelectItem>
                <SelectItem value="gravissima">Gravíssima</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_analise">Em Análise</SelectItem>
                <SelectItem value="resolvida">Resolvida</SelectItem>
                <SelectItem value="pad_aberto">PAD Aberto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Box / Responsável</TableHead>
                  <TableHead>Artigo</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotificacoes?.map((notificacao) => (
                  <TableRow key={notificacao.id}>
                    <TableCell className="font-medium">
                      {notificacao.numero_interno || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {notificacao.tipo === 'interna' ? 'Interna' : 'Externa'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{notificacao.boxes?.codigo || '-'}</div>
                        <div className="text-sm text-muted-foreground">
                          {notificacao.responsaveis?.nome || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{notificacao.artigo_violado}</TableCell>
                    <TableCell>
                      <Badge className={classificationColors[notificacao.classificacao]}>
                        {notificacao.classificacao.charAt(0).toUpperCase() + 
                          notificacao.classificacao.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(notificacao.data_notificacao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[notificacao.status || 'pendente']}>
                        {notificacao.status === 'pad_aberto' ? 'PAD Aberto' : 
                          notificacao.status?.charAt(0).toUpperCase() + 
                          (notificacao.status?.slice(1) || '')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {notificacao.pads && notificacao.pads.length > 0 ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onViewPad(notificacao.pads![0].id)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver PAD
                          </Button>
                        ) : canManage ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleOpenPadDialog(notificacao)}
                          >
                            <Scale className="h-4 w-4 mr-1" />
                            Abrir PAD
                          </Button>
                        ) : null}
                        {canManage && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteNotificacaoMutation.mutate(notificacao.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredNotificacoes?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhuma notificação encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPadDialog} onOpenChange={setShowPadDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Abrir Processo Administrativo (PAD)
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Notificação</Label>
              <p className="text-sm text-muted-foreground">
                {selectedNotificacao?.numero_interno} - {selectedNotificacao?.artigo_violado}
              </p>
            </div>
            <div>
              <Label htmlFor="relator">Relator do Processo</Label>
              <Input
                id="relator"
                value={padData.relator}
                onChange={(e) => setPadData({ ...padData, relator: e.target.value })}
                placeholder="Nome do relator"
              />
            </div>
            <div>
              <Label htmlFor="taxa_base">Taxa de Condomínio Base (R$)</Label>
              <Input
                id="taxa_base"
                type="number"
                value={padData.taxa_condominio_base}
                onChange={(e) => setPadData({ ...padData, taxa_condominio_base: e.target.value })}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label htmlFor="percentual">Percentual da Multa</Label>
              <Select
                value={padData.percentual_multa}
                onValueChange={(v) => setPadData({ ...padData, percentual_multa: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="50">50% - Infrações Leves</SelectItem>
                  <SelectItem value="100">100% - Infrações Médias/Graves</SelectItem>
                  <SelectItem value="200">200% - Infrações Gravíssimas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fundamentacao">Fundamentação</Label>
              <Textarea
                id="fundamentacao"
                value={padData.fundamentacao}
                onChange={(e) => setPadData({ ...padData, fundamentacao: e.target.value })}
                placeholder="Fundamentação legal e factual"
                rows={3}
              />
            </div>
            {padData.taxa_condominio_base && (
              <div className="bg-muted p-3 rounded-md">
                <Label>Valor da Multa Calculado</Label>
                <p className="text-lg font-bold text-foreground">
                  R$ {(parseFloat(padData.taxa_condominio_base) * 
                    parseInt(padData.percentual_multa) / 100).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPadDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => selectedNotificacao && createPadMutation.mutate(selectedNotificacao)}
              disabled={!padData.relator || !padData.taxa_condominio_base}
            >
              Criar PAD
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
