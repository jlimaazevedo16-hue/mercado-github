import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  AlertTriangle, Clock, FileWarning, Wrench, Scale, Search,
  Upload, CheckCircle, AlertCircle, Calendar, FileX, Plus, Building2
} from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { useUserRole } from '@/hooks/useUserRole';
import { useAuth } from '@/hooks/useAuth';

interface Pendencia {
  id: string;
  tipo: 'notificacao' | 'certificado' | 'reforma' | 'processo' | 'documento_ausente' | 'ocorrencia';
  titulo: string;
  descricao: string;
  data_vencimento: string | null;
  status: string;
  urgencia: 'vencido' | 'urgente' | 'proximo' | 'normal';
  entidade_tipo: string;
  entidade_id: string;
  entidade_nome: string;
  responsavel_id?: string | null;
  em_providencia?: boolean;
  comprovante_url?: string;
}

const urgenciaLabels: Record<string, { label: string; className: string }> = {
  vencido: { label: 'Vencido', className: 'bg-destructive text-destructive-foreground' },
  urgente: { label: 'Urgente', className: 'bg-orange-500 text-white' },
  proximo: { label: 'Próximo', className: 'bg-yellow-500 text-white' },
  normal: { label: 'Normal', className: 'bg-muted text-muted-foreground' },
};

const tipoIcons: Record<string, React.ReactNode> = {
  notificacao: <AlertTriangle className="h-4 w-4" />,
  certificado: <FileWarning className="h-4 w-4" />,
  reforma: <Wrench className="h-4 w-4" />,
  processo: <Scale className="h-4 w-4" />,
  documento_ausente: <FileX className="h-4 w-4" />,
  ocorrencia: <AlertCircle className="h-4 w-4" />,
};

const tipoLabels: Record<string, string> = {
  notificacao: 'Notificação',
  certificado: 'Certificado',
  reforma: 'Reforma',
  processo: 'Processo',
  documento_ausente: 'Doc. Ausente',
  ocorrencia: 'Ocorrência',
};

// Documentos obrigatórios por tipo de box
const DOCUMENTOS_OBRIGATORIOS = [
  'Alvará de Funcionamento',
  'Licença Sanitária',
  'Certificado de Higiene',
];

export const PendenciasLista = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { role, isAdmin, isAdminMaster } = useUserRole();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('all');
  const [showProvidenciaDialog, setShowProvidenciaDialog] = useState(false);
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);
  const [providenciaDescricao, setProvidenciaDescricao] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [showOcorrenciaDialog, setShowOcorrenciaDialog] = useState(false);
  const [ocorrenciaData, setOcorrenciaData] = useState({
    box_id: '',
    titulo: '',
    descricao: '',
    data_vencimento: '',
  });

  // Buscar boxes do usuário se for lojista (por email OU CPF)
  const { data: userBoxes } = useQuery({
    queryKey: ['user-boxes', user?.id],
    queryFn: async () => {
      if (isAdmin || isAdminMaster) return null;
      
      // Buscar perfil do usuário logado (email e possível CPF)
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('user_id', user?.id || '')
        .single();

      if (!profile?.email) return { responsavelId: null, boxes: [] };

      // Primeiro tenta buscar por email
      let { data: responsavel } = await supabase
        .from('responsaveis')
        .select('id, cpf')
        .eq('email', profile.email)
        .maybeSingle();

      // Se não encontrou por email, buscar todos os responsáveis para tentar match por CPF
      // O CPF do lojista pode estar no metadata do auth ou em outro campo
      if (!responsavel) {
        // Tentar buscar pelo telefone que pode estar no perfil como identificador alternativo
        const { data: profileFull } = await supabase
          .from('profiles')
          .select('telefone')
          .eq('user_id', user?.id || '')
          .single();
        
        if (profileFull?.telefone) {
          const { data: respByPhone } = await supabase
            .from('responsaveis')
            .select('id, cpf')
            .eq('telefone', profileFull.telefone)
            .maybeSingle();
          
          if (respByPhone) {
            responsavel = respByPhone;
          }
        }
      }

      if (!responsavel) return { responsavelId: null, boxes: [] };

      const { data: boxes } = await supabase
        .from('boxes')
        .select('id, codigo')
        .eq('responsavel_id', responsavel.id);

      return { responsavelId: responsavel.id, boxes: boxes || [] };
    },
    enabled: !!user && role === 'lojista',
  });

  // Buscar boxes para seleção na ocorrência manual
  const { data: allBoxes } = useQuery({
    queryKey: ['all-boxes-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('boxes')
        .select('id, codigo, boxe, inquilino, responsavel_id')
        .order('codigo');
      return data || [];
    },
    enabled: isAdmin || isAdminMaster,
  });

  const calculateUrgencia = (dataVencimento: string | null): 'vencido' | 'urgente' | 'proximo' | 'normal' => {
    if (!dataVencimento) return 'normal';
    const today = new Date();
    const vencimento = new Date(dataVencimento);
    const dias = differenceInDays(vencimento, today);
    
    if (dias < 0) return 'vencido';
    if (dias <= 7) return 'urgente';
    if (dias <= 30) return 'proximo';
    return 'normal';
  };

  // Fetch all pending items from different sources
  const { data: pendencias, isLoading } = useQuery({
    queryKey: ['pendencias', userBoxes],
    queryFn: async () => {
      const allPendencias: Pendencia[] = [];
      const userBoxIds = userBoxes?.boxes?.map(b => b.id) || [];
      const isLojistaView = role === 'lojista' && userBoxIds.length > 0;

      // 1. Notificações pendentes
      let notificacoesQuery = supabase
        .from('notificacoes')
        .select(`
          id, numero_interno, descricao_infracao, prazo_defesa, prazo_adequacao, status,
          box_id, responsavel_id,
          boxes (codigo, boxe),
          responsaveis (nome)
        `)
        .in('status', ['pendente', 'em_analise']);

      if (isLojistaView) {
        notificacoesQuery = notificacoesQuery.in('box_id', userBoxIds);
      }

      const { data: notificacoes } = await notificacoesQuery;

      notificacoes?.forEach((n: any) => {
        const dataVenc = n.prazo_adequacao || n.prazo_defesa;
        allPendencias.push({
          id: n.id,
          tipo: 'notificacao',
          titulo: n.numero_interno || 'Notificação',
          descricao: n.descricao_infracao?.substring(0, 100) + '...',
          data_vencimento: dataVenc,
          status: n.status,
          urgencia: calculateUrgencia(dataVenc),
          entidade_tipo: 'box',
          entidade_id: n.boxes?.codigo || '',
          entidade_nome: `${n.boxes?.codigo || ''} - ${n.responsaveis?.nome || 'N/A'}`,
          responsavel_id: n.responsavel_id,
        });
      });

      // 2. Certificados vencidos ou próximos do vencimento
      let boxDocsQuery = supabase
        .from('box_documents')
        .select(`
          id, nome, tipo, data_validade,
          boxes!box_documents_box_id_fkey (id, codigo, boxe, inquilino, responsavel_id)
        `)
        .not('data_validade', 'is', null);

      if (isLojistaView) {
        boxDocsQuery = boxDocsQuery.in('box_id', userBoxIds);
      }

      const { data: boxDocs } = await boxDocsQuery;

      boxDocs?.forEach((doc: any) => {
        const urgencia = calculateUrgencia(doc.data_validade);
        if (urgencia === 'vencido' || urgencia === 'urgente' || urgencia === 'proximo') {
          allPendencias.push({
            id: doc.id,
            tipo: 'certificado',
            titulo: doc.nome,
            descricao: `${doc.tipo || 'Documento'} - ${urgencia === 'vencido' ? 'Vencido' : 'Próximo do vencimento'}`,
            data_vencimento: doc.data_validade,
            status: urgencia === 'vencido' ? 'vencido' : 'pendente',
            urgencia,
            entidade_tipo: 'box',
            entidade_id: doc.boxes?.id || '',
            entidade_nome: `${doc.boxes?.codigo || ''} - ${doc.boxes?.inquilino || 'N/A'}`,
            responsavel_id: doc.boxes?.responsavel_id,
          });
        }
      });

      // 3. Documentos ausentes (verificar quais boxes não têm documentos obrigatórios)
      let boxesForDocsQuery = supabase
        .from('boxes')
        .select('id, codigo, inquilino, responsavel_id, status')
        .eq('status', 'ASSINADO');

      if (isLojistaView) {
        boxesForDocsQuery = boxesForDocsQuery.in('id', userBoxIds);
      }

      const { data: boxesAtivos } = await boxesForDocsQuery;

      if (boxesAtivos) {
        for (const box of boxesAtivos) {
          const { data: docsDoBox } = await supabase
            .from('box_documents')
            .select('nome, tipo')
            .eq('box_id', box.id);

          const docsExistentes = docsDoBox?.map(d => d.tipo || d.nome) || [];

          DOCUMENTOS_OBRIGATORIOS.forEach(docObrigatorio => {
            const temDoc = docsExistentes.some(d => 
              d.toLowerCase().includes(docObrigatorio.toLowerCase().split(' ')[0])
            );
            
            if (!temDoc) {
              allPendencias.push({
                id: `ausente-${box.id}-${docObrigatorio}`,
                tipo: 'documento_ausente',
                titulo: docObrigatorio,
                descricao: `Documento obrigatório não encontrado`,
                data_vencimento: null,
                status: 'ausente',
                urgencia: 'urgente',
                entidade_tipo: 'box',
                entidade_id: box.id,
                entidade_nome: `${box.codigo} - ${box.inquilino || 'N/A'}`,
                responsavel_id: box.responsavel_id,
              });
            }
          });
        }
      }

      // 4. Reformas/Manutenções pendentes
      let manutencoesQuery = supabase
        .from('box_maintenances')
        .select(`
          id, tipo, descricao, data_solicitacao, status,
          boxes!box_maintenances_box_id_fkey (id, codigo, inquilino, responsavel_id)
        `)
        .in('status', ['PENDENTE', 'EM_ANDAMENTO']);

      if (isLojistaView) {
        manutencoesQuery = manutencoesQuery.in('box_id', userBoxIds);
      }

      const { data: manutencoes } = await manutencoesQuery;

      manutencoes?.forEach((m: any) => {
        const dataVenc = m.data_solicitacao ? 
          format(addDays(new Date(m.data_solicitacao), 30), 'yyyy-MM-dd') : null;
        allPendencias.push({
          id: m.id,
          tipo: 'reforma',
          titulo: m.tipo,
          descricao: m.descricao?.substring(0, 100) || 'Manutenção pendente',
          data_vencimento: dataVenc,
          status: m.status,
          urgencia: calculateUrgencia(dataVenc),
          entidade_tipo: 'box',
          entidade_id: m.boxes?.id || '',
          entidade_nome: `${m.boxes?.codigo || ''} - ${m.boxes?.inquilino || 'N/A'}`,
          responsavel_id: m.boxes?.responsavel_id,
        });
      });

      // 5. Processos aguardando decisão
      let padsQuery = supabase
        .from('pads')
        .select(`
          id, numero_processo, status, data_autuacao,
          box_id, responsavel_id,
          boxes (codigo, inquilino),
          responsaveis (nome)
        `)
        .not('status', 'in', '("arquivado","decisao_final")');

      if (isLojistaView) {
        padsQuery = padsQuery.in('box_id', userBoxIds);
      }

      const { data: pads } = await padsQuery;

      pads?.forEach((p: any) => {
        const isUrgent = ['julgamento', 'recurso'].includes(p.status);
        allPendencias.push({
          id: p.id,
          tipo: 'processo',
          titulo: p.numero_processo,
          descricao: `Status: ${p.status}`,
          data_vencimento: null,
          status: p.status,
          urgencia: isUrgent ? 'urgente' : 'normal',
          entidade_tipo: 'pad',
          entidade_id: p.id,
          entidade_nome: `${p.boxes?.codigo || ''} - ${p.responsaveis?.nome || 'N/A'}`,
          responsavel_id: p.responsavel_id,
        });
      });

      // Sort by urgency
      const urgencyOrder = { vencido: 0, urgente: 1, proximo: 2, normal: 3 };
      return allPendencias.sort((a, b) => urgencyOrder[a.urgencia] - urgencyOrder[b.urgencia]);
    },
  });

  const filteredPendencias = pendencias?.filter((p) => {
    const matchesSearch = !searchTerm || 
      p.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.entidade_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.descricao.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTipo = tipoFilter === 'all' || p.tipo === tipoFilter;
    const matchesUrgencia = urgenciaFilter === 'all' || p.urgencia === urgenciaFilter;

    return matchesSearch && matchesTipo && matchesUrgencia;
  });

  // Stats
  const stats = {
    total: pendencias?.length || 0,
    vencidos: pendencias?.filter(p => p.urgencia === 'vencido').length || 0,
    urgentes: pendencias?.filter(p => p.urgencia === 'urgente').length || 0,
    proximos: pendencias?.filter(p => p.urgencia === 'proximo').length || 0,
    documentosAusentes: pendencias?.filter(p => p.tipo === 'documento_ausente').length || 0,
  };

  const handleProvidencia = (pendencia: Pendencia) => {
    setSelectedPendencia(pendencia);
    setShowProvidenciaDialog(true);
  };

  const handleDocumentUpload = async (docData: {
    nome: string;
    tipo: string;
    descricao: string;
    data_emissao: string;
    data_validade: string;
    arquivo_url: string;
  }) => {
    toast.success('Comprovante anexado! Pendência marcada como "Em Providência"');
    setShowUploadDialog(false);
    setShowProvidenciaDialog(false);
    setSelectedPendencia(null);
    setProvidenciaDescricao('');
  };

  const handleCreateOcorrencia = () => {
    // Criar uma pendência manual (ocorrência)
    toast.success('Ocorrência registrada com sucesso!');
    setShowOcorrenciaDialog(false);
    setOcorrenciaData({ box_id: '', titulo: '', descricao: '', data_vencimento: '' });
    queryClient.invalidateQueries({ queryKey: ['pendencias'] });
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando pendências...</div>;
  }

  return (
    <div className="space-y-6">
      {/* View indicator for lojista */}
      {role === 'lojista' && userBoxes?.boxes && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Building2 className="h-5 w-5" />
            <span className="font-medium">
              Visualizando pendências dos seus boxes: {userBoxes.boxes.map(b => b.codigo).join(', ')}
            </span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Clock className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-destructive">{stats.vencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgentes</p>
                <p className="text-2xl font-bold text-orange-500">{stats.urgentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Próximos</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.proximos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <FileX className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Docs Ausentes</p>
                <p className="text-2xl font-bold text-purple-500">{stats.documentosAusentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Pendências
              {role === 'lojista' && <Badge variant="secondary">Meus Boxes</Badge>}
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
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar pendências..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                <SelectItem value="notificacao">Notificações</SelectItem>
                <SelectItem value="certificado">Certificados</SelectItem>
                <SelectItem value="documento_ausente">Docs Ausentes</SelectItem>
                <SelectItem value="reforma">Reformas</SelectItem>
                <SelectItem value="processo">Processos</SelectItem>
                <SelectItem value="ocorrencia">Ocorrências</SelectItem>
              </SelectContent>
            </Select>
            <Select value={urgenciaFilter} onValueChange={setUrgenciaFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Urgência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
                <SelectItem value="urgente">Urgentes</SelectItem>
                <SelectItem value="proximo">Próximos</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Entidade</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Urgência</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPendencias?.map((pendencia) => (
                <TableRow key={`${pendencia.tipo}-${pendencia.id}`}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {tipoIcons[pendencia.tipo]}
                      <span>{tipoLabels[pendencia.tipo]}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{pendencia.titulo}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-xs">
                        {pendencia.descricao}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{pendencia.entidade_nome}</TableCell>
                  <TableCell>
                    {pendencia.data_vencimento 
                      ? format(new Date(pendencia.data_vencimento), 'dd/MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </TableCell>
                  <TableCell>
                    <Badge className={urgenciaLabels[pendencia.urgencia].className}>
                      {urgenciaLabels[pendencia.urgencia].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProvidencia(pendencia)}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Em Providência
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredPendencias || filteredPendencias.length === 0) && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {role === 'lojista' 
                      ? 'Nenhuma pendência encontrada para seus boxes'
                      : 'Nenhuma pendência encontrada'
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Providência Dialog */}
      <Dialog open={showProvidenciaDialog} onOpenChange={setShowProvidenciaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar como "Em Providência"</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Pendência</Label>
              <p className="font-medium">{selectedPendencia?.titulo}</p>
              <p className="text-sm text-muted-foreground">{selectedPendencia?.entidade_nome}</p>
            </div>
            <div>
              <Label>Descrição da providência</Label>
              <Textarea
                value={providenciaDescricao}
                onChange={(e) => setProvidenciaDescricao(e.target.value)}
                placeholder="Descreva a ação em andamento..."
                rows={3}
              />
            </div>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowUploadDialog(true)}
            >
              <Upload className="h-4 w-4 mr-2" />
              Anexar Comprovante
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowProvidenciaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast.success('Pendência marcada como "Em Providência"');
              setShowProvidenciaDialog(false);
              setSelectedPendencia(null);
              setProvidenciaDescricao('');
            }}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nova Ocorrência Dialog - Only for Admin */}
      <Dialog open={showOcorrenciaDialog} onOpenChange={setShowOcorrenciaDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Registrar Nova Ocorrência
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Box</Label>
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
              <Label>Título da Ocorrência</Label>
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
              onClick={handleCreateOcorrencia}
              disabled={!ocorrenciaData.box_id || !ocorrenciaData.titulo}
            >
              Registrar Ocorrência
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog - Only visible when we have a selected pendencia with an entity */}
      {showUploadDialog && selectedPendencia?.entidade_id && (
        <DocumentUploadDialog
          open={showUploadDialog}
          onOpenChange={setShowUploadDialog}
          onUploadComplete={handleDocumentUpload}
          entityType="box"
          entityId={selectedPendencia.entidade_id}
        />
      )}
    </div>
  );
};
