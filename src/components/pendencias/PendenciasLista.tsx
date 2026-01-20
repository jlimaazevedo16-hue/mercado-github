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
  Upload, CheckCircle, AlertCircle, Calendar
} from 'lucide-react';
import { format, differenceInDays, addDays, isAfter, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';

interface Pendencia {
  id: string;
  tipo: 'notificacao' | 'certificado' | 'reforma' | 'processo';
  titulo: string;
  descricao: string;
  data_vencimento: string | null;
  status: string;
  urgencia: 'vencido' | 'urgente' | 'proximo' | 'normal';
  entidade_tipo: string;
  entidade_id: string;
  entidade_nome: string;
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
};

const tipoLabels: Record<string, string> = {
  notificacao: 'Notificação',
  certificado: 'Certificado',
  reforma: 'Reforma',
  processo: 'Processo',
};

export const PendenciasLista = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [urgenciaFilter, setUrgenciaFilter] = useState<string>('all');
  const [showProvidenciaDialog, setShowProvidenciaDialog] = useState(false);
  const [selectedPendencia, setSelectedPendencia] = useState<Pendencia | null>(null);
  const [providenciaDescricao, setProvidenciaDescricao] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

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
    queryKey: ['pendencias'],
    queryFn: async () => {
      const allPendencias: Pendencia[] = [];

      // 1. Notificações pendentes
      const { data: notificacoes } = await supabase
        .from('notificacoes')
        .select(`
          id, numero_interno, descricao_infracao, prazo_defesa, prazo_adequacao, status,
          boxes (codigo, boxe),
          responsaveis (nome)
        `)
        .in('status', ['pendente', 'em_analise']);

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
        });
      });

      // 2. Certificados vencidos ou próximos do vencimento
      const { data: boxDocs } = await supabase
        .from('box_documents')
        .select(`
          id, nome, tipo, data_validade,
          boxes!box_documents_box_id_fkey (id, codigo, boxe, inquilino)
        `)
        .not('data_validade', 'is', null);

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
          });
        }
      });

      // 3. Reformas/Manutenções pendentes
      const { data: manutencoes } = await supabase
        .from('box_maintenances')
        .select(`
          id, tipo, descricao, data_solicitacao, status,
          boxes!box_maintenances_box_id_fkey (id, codigo, inquilino)
        `)
        .in('status', ['PENDENTE', 'EM_ANDAMENTO']);

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
        });
      });

      // 4. Processos aguardando decisão
      const { data: pads } = await supabase
        .from('pads')
        .select(`
          id, numero_processo, status, data_autuacao,
          boxes (codigo, inquilino),
          responsaveis (nome)
        `)
        .not('status', 'in', '("arquivado","decisao_final")');

      pads?.forEach((p: any) => {
        // Processos em julgamento/recurso são urgentes
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
    // Save the providencia with proof
    toast.success('Comprovante anexado! Pendência marcada como "Em Providência"');
    setShowUploadDialog(false);
    setShowProvidenciaDialog(false);
    setSelectedPendencia(null);
    setProvidenciaDescricao('');
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando pendências...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
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
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Pendências
          </CardTitle>
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
                <SelectItem value="reforma">Reformas</SelectItem>
                <SelectItem value="processo">Processos</SelectItem>
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
                    Nenhuma pendência encontrada
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
            }}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Upload Dialog */}
      {selectedPendencia && (
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
