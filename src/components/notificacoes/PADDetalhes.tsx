import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ArrowLeft, Scale, FileText, Upload, Download, History, 
  CheckCircle, AlertCircle, Clock, Gavel 
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentsTable } from '@/components/documents/DocumentsTable';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PADDetalhesProps {
  padId: string;
  onBack: () => void;
}

type PadStatus = 'autuacao' | 'defesa' | 'julgamento' | 'recurso' | 'decisao_final' | 'arquivado';

const statusFlow: PadStatus[] = ['autuacao', 'defesa', 'julgamento', 'recurso', 'decisao_final', 'arquivado'];

const statusLabels: Record<PadStatus, string> = {
  autuacao: 'Autuação',
  defesa: 'Defesa',
  julgamento: 'Julgamento',
  recurso: 'Recurso',
  decisao_final: 'Decisão Final',
  arquivado: 'Arquivado',
};

const statusIcons: Record<PadStatus, React.ReactNode> = {
  autuacao: <AlertCircle className="h-5 w-5" />,
  defesa: <FileText className="h-5 w-5" />,
  julgamento: <Gavel className="h-5 w-5" />,
  recurso: <Clock className="h-5 w-5" />,
  decisao_final: <CheckCircle className="h-5 w-5" />,
  arquivado: <CheckCircle className="h-5 w-5" />,
};

export const PADDetalhes = ({ padId, onBack }: PADDetalhesProps) => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [etapaDescricao, setEtapaDescricao] = useState('');

  const { data: pad, isLoading } = useQuery({
    queryKey: ['pad', padId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pads')
        .select(`
          *,
          boxes (codigo, boxe, inquilino),
          responsaveis (nome, cpf, telefone, email),
          notificacoes (numero_interno, artigo_violado, descricao_infracao, classificacao, data_notificacao)
        `)
        .eq('id', padId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  const { data: etapas } = useQuery({
    queryKey: ['pad-etapas', padId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pad_etapas')
        .select('*')
        .eq('pad_id', padId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: documents, refetch: refetchDocuments } = useQuery({
    queryKey: ['pad-documents', padId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pad_documents')
        .select('*')
        .eq('pad_id', padId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const advanceStatusMutation = useMutation({
    mutationFn: async (newStatus: PadStatus) => {
      const dateField = `data_${newStatus}` as keyof typeof pad;
      
      const { error: padError } = await supabase
        .from('pads')
        .update({ 
          status: newStatus,
          [dateField]: format(new Date(), 'yyyy-MM-dd'),
        })
        .eq('id', padId);

      if (padError) throw padError;

      const { error: etapaError } = await supabase
        .from('pad_etapas')
        .insert({
          pad_id: padId,
          etapa: newStatus,
          descricao: etapaDescricao || `Processo avançou para ${statusLabels[newStatus]}`,
          responsavel_etapa: pad?.relator,
        });

      if (etapaError) throw etapaError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pad', padId] });
      queryClient.invalidateQueries({ queryKey: ['pad-etapas', padId] });
      queryClient.invalidateQueries({ queryKey: ['pads'] });
      logAction({
        action: 'UPDATE_PAD_STATUS',
        tableName: 'pads',
        recordId: padId,
      });
      toast.success('Status atualizado com sucesso!');
      setEtapaDescricao('');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const updateDecisaoMutation = useMutation({
    mutationFn: async (decisao: string) => {
      const { error } = await supabase
        .from('pads')
        .update({ decisao_final: decisao })
        .eq('id', padId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pad', padId] });
      toast.success('Decisão salva!');
    },
  });

  const handleDocumentUpload = async (docData: {
    nome: string;
    tipo: string;
    descricao: string;
    data_validade: string;
    arquivo_url: string;
  }) => {
    const { error } = await supabase
      .from('pad_documents')
      .insert({
        pad_id: padId,
        nome: docData.nome,
        tipo: docData.tipo,
        descricao: docData.descricao,
        arquivo_url: docData.arquivo_url,
      });

    if (error) throw error;
    
    refetchDocuments();
    logAction({
      action: 'UPLOAD_PAD_DOCUMENT',
      tableName: 'pad_documents',
      recordId: padId,
    });
    toast.success('Documento anexado com sucesso!');
  };

  const handleDeleteDocument = async (docId: string) => {
    const { error } = await supabase
      .from('pad_documents')
      .delete()
      .eq('id', docId);

    if (error) {
      toast.error('Erro ao excluir documento');
      return;
    }

    refetchDocuments();
    toast.success('Documento excluído');
  };

  const generatePDF = () => {
    if (!pad) return;

    const doc = new jsPDF();
    let yPos = 20;
    
    // ========== HEADER ==========
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('PROCESSO ADMINISTRATIVO DISCIPLINAR', 105, yPos, { align: 'center' });
    yPos += 8;
    
    doc.setFontSize(14);
    doc.text(pad.numero_processo, 105, yPos, { align: 'center' });
    yPos += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Status: ${statusLabels[pad.status as PadStatus]}`, 105, yPos, { align: 'center' });
    yPos += 12;

    // ========== DADOS DO PROCESSO ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('1. DADOS DO PROCESSO', 14, yPos);
    yPos += 6;

    const processoData = [
      ['Número do Processo', pad.numero_processo],
      ['Status Atual', statusLabels[pad.status as PadStatus]],
      ['Data de Autuação', format(new Date(pad.data_autuacao), 'dd/MM/yyyy', { locale: ptBR })],
      ['Relator', pad.relator || '-'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: processoData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 130 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ========== DADOS DO AUTUADO ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('2. DADOS DO AUTUADO', 14, yPos);
    yPos += 6;

    const autuadoData = [
      ['Box', `${pad.boxes?.codigo || '-'} - ${pad.boxes?.boxe || ''}`],
      ['Inquilino', pad.boxes?.inquilino || '-'],
      ['Responsável', pad.responsaveis?.nome || '-'],
      ['CPF', pad.responsaveis?.cpf || '-'],
      ['Telefone', pad.responsaveis?.telefone || '-'],
      ['Email', pad.responsaveis?.email || '-'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: autuadoData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 130 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // ========== DADOS DA INFRAÇÃO ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('3. DADOS DA INFRAÇÃO', 14, yPos);
    yPos += 6;

    const infracaoData = [
      ['Notificação de Origem', pad.notificacoes?.numero_interno || '-'],
      ['Artigo Violado', pad.notificacoes?.artigo_violado || '-'],
      ['Classificação', pad.notificacoes?.classificacao?.toUpperCase() || '-'],
      ['Data da Notificação', pad.notificacoes?.data_notificacao ? 
        format(new Date(pad.notificacoes.data_notificacao), 'dd/MM/yyyy', { locale: ptBR }) : '-'],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: infracaoData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 130 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 6;

    // Descrição da Infração
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Descrição da Infração:', 14, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const descricaoInfracao = doc.splitTextToSize(pad.notificacoes?.descricao_infracao || '-', 180);
    doc.text(descricaoInfracao, 14, yPos);
    yPos += descricaoInfracao.length * 4 + 8;

    // ========== VALORES E MULTAS ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('4. CÁLCULO DA MULTA', 14, yPos);
    yPos += 6;

    const multaData = [
      ['Taxa de Condomínio Base', `R$ ${(pad.taxa_condominio_base || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
      ['Percentual Aplicado', `${pad.percentual_multa || 0}%`],
      ['Valor da Multa', `R$ ${(pad.valor_multa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      startY: yPos,
      head: [],
      body: multaData,
      theme: 'grid',
      styles: { fontSize: 9 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 50 },
        1: { cellWidth: 130 },
      },
    });
    yPos = (doc as any).lastAutoTable.finalY + 10;

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // ========== HISTÓRICO DE ETAPAS ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('5. HISTÓRICO DO PROCESSO', 14, yPos);
    yPos += 6;

    if (etapas && etapas.length > 0) {
      const etapasData = etapas.map((e) => [
        statusLabels[e.etapa as PadStatus],
        format(new Date(e.data_etapa), 'dd/MM/yyyy', { locale: ptBR }),
        e.responsavel_etapa || '-',
        (e.descricao || '-').substring(0, 60) + ((e.descricao?.length || 0) > 60 ? '...' : ''),
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Etapa', 'Data', 'Responsável', 'Descrição']],
        body: etapasData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
        columnStyles: {
          0: { cellWidth: 30 },
          1: { cellWidth: 25 },
          2: { cellWidth: 35 },
          3: { cellWidth: 90 },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhuma etapa registrada.', 14, yPos);
      yPos += 10;
    }

    // Check if we need a new page
    if (yPos > 240) {
      doc.addPage();
      yPos = 20;
    }

    // ========== DOCUMENTOS ANEXADOS ==========
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('6. DOCUMENTOS ANEXADOS', 14, yPos);
    yPos += 6;

    if (documents && documents.length > 0) {
      const docsData = documents.map((d, index) => [
        (index + 1).toString(),
        d.nome,
        d.tipo || '-',
        format(new Date(d.created_at), 'dd/MM/yyyy', { locale: ptBR }),
        d.arquivo_url ? 'Sim' : 'Não',
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['#', 'Nome', 'Tipo', 'Data Upload', 'Arquivo']],
        body: docsData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [66, 66, 66] },
        columnStyles: {
          0: { cellWidth: 10 },
          1: { cellWidth: 70 },
          2: { cellWidth: 40 },
          3: { cellWidth: 30 },
          4: { cellWidth: 25 },
        },
      });
      yPos = (doc as any).lastAutoTable.finalY + 10;
    } else {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.text('Nenhum documento anexado.', 14, yPos);
      yPos += 10;
    }

    // ========== DECISÃO FINAL ==========
    if (pad.decisao_final) {
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('7. DECISÃO FINAL', 14, yPos);
      yPos += 6;

      if (pad.data_decisao_final) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Data da Decisão: ${format(new Date(pad.data_decisao_final), 'dd/MM/yyyy', { locale: ptBR })}`, 14, yPos);
        yPos += 6;
      }

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const decisaoText = doc.splitTextToSize(pad.decisao_final, 180);
      doc.text(decisaoText, 14, yPos);
    }

    // ========== FUNDAMENTAÇÃO ==========
    if (pad.fundamentacao) {
      yPos = (doc as any).lastAutoTable?.finalY + 10 || yPos + 10;
      if (yPos > 220) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('8. FUNDAMENTAÇÃO LEGAL', 14, yPos);
      yPos += 6;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const fundText = doc.splitTextToSize(pad.fundamentacao, 180);
      doc.text(fundText, 14, yPos);
    }

    // ========== FOOTER ==========
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Line separator
      doc.setDrawColor(200);
      doc.line(14, 282, 196, 282);
      
      // Footer text
      doc.text(
        `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
        14,
        288
      );
      doc.text(
        `Página ${i} de ${pageCount}`,
        196,
        288,
        { align: 'right' }
      );
    }

    // Save PDF
    const fileName = `PAD_${pad.numero_processo.replace(/\//g, '-')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
    doc.save(fileName);
    toast.success('Relatório PDF gerado com sucesso!');
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  if (!pad) {
    return <div className="text-center py-8">Processo não encontrado</div>;
  }

  const currentStatusIndex = statusFlow.indexOf(pad.status as PadStatus);
  const nextStatus = statusFlow[currentStatusIndex + 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <Button onClick={generatePDF}>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Header do Processo */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-6 w-6" />
              {pad.numero_processo}
            </CardTitle>
            <Badge className="text-lg px-4 py-1">
              {statusLabels[pad.status as PadStatus]}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label className="text-muted-foreground">Box</Label>
              <p className="font-medium">{pad.boxes?.codigo} - {pad.boxes?.boxe}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Responsável</Label>
              <p className="font-medium">{pad.responsaveis?.nome || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Relator</Label>
              <p className="font-medium">{pad.relator || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Valor da Multa</Label>
              <p className="font-medium text-lg">
                R$ {(pad.valor_multa || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                <span className="text-sm text-muted-foreground ml-1">
                  ({pad.percentual_multa}%)
                </span>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Timeline de Status */}
      <Card>
        <CardHeader>
          <CardTitle>Andamento do Processo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-6">
            {statusFlow.map((status, index) => {
              const isCompleted = index <= currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              
              return (
                <div key={status} className="flex flex-col items-center flex-1">
                  <div 
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      isCompleted 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted text-muted-foreground'
                    } ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  >
                    {statusIcons[status]}
                  </div>
                  <span className={`text-xs mt-2 text-center ${
                    isCompleted ? 'font-medium' : 'text-muted-foreground'
                  }`}>
                    {statusLabels[status]}
                  </span>
                  {index < statusFlow.length - 1 && (
                    <div className={`absolute h-0.5 w-full -z-10 top-5 ${
                      index < currentStatusIndex ? 'bg-primary' : 'bg-muted'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>

          {nextStatus && pad.status !== 'arquivado' && (
            <div className="border-t pt-4 mt-4">
              <Label>Avançar para próxima etapa</Label>
              <div className="flex gap-4 mt-2">
                <Textarea
                  placeholder="Descrição da etapa..."
                  value={etapaDescricao}
                  onChange={(e) => setEtapaDescricao(e.target.value)}
                  className="flex-1"
                  rows={2}
                />
                <Button 
                  onClick={() => advanceStatusMutation.mutate(nextStatus)}
                  disabled={advanceStatusMutation.isPending}
                >
                  Avançar para {statusLabels[nextStatus]}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="detalhes">
        <TabsList>
          <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
          <TabsTrigger value="documentos">Documentos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
          <TabsTrigger value="decisao">Decisão</TabsTrigger>
        </TabsList>

        <TabsContent value="detalhes" className="mt-4">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div>
                <Label className="text-muted-foreground">Notificação de Origem</Label>
                <p className="font-medium">{pad.notificacoes?.numero_interno || '-'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Artigo Violado</Label>
                <p className="font-medium">{pad.notificacoes?.artigo_violado}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Classificação</Label>
                <Badge className="ml-2">
                  {pad.notificacoes?.classificacao}
                </Badge>
              </div>
              <div>
                <Label className="text-muted-foreground">Descrição da Infração</Label>
                <p className="mt-1">{pad.notificacoes?.descricao_infracao}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Fundamentação</Label>
                <p className="mt-1">{pad.fundamentacao || '-'}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Taxa Base</Label>
                  <p className="font-medium">
                    R$ {(pad.taxa_condominio_base || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Percentual Aplicado</Label>
                  <p className="font-medium">{pad.percentual_multa}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documentos do Processo</CardTitle>
                <Button onClick={() => setShowUploadDialog(true)}>
                  <Upload className="h-4 w-4 mr-2" />
                  Anexar Documento
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <DocumentsTable
                documents={documents?.map((d) => ({
                  id: d.id,
                  nome: d.nome,
                  tipo: d.tipo,
                  descricao: d.descricao,
                  arquivo_url: d.arquivo_url,
                  data_validade: null,
                  data_emissao: null,
                  created_at: d.created_at,
                })) || []}
                onDelete={handleDeleteDocument}
              />
            </CardContent>
          </Card>

          <DocumentUploadDialog
            open={showUploadDialog}
            onOpenChange={setShowUploadDialog}
            onUploadComplete={handleDocumentUpload}
            entityType="box"
            entityId={padId}
          />
        </TabsContent>

        <TabsContent value="historico" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Histórico de Etapas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {etapas?.map((etapa, index) => (
                  <div 
                    key={etapa.id} 
                    className={`flex gap-4 ${
                      index < etapas.length - 1 ? 'border-b pb-4' : ''
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      {statusIcons[etapa.etapa as PadStatus]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{statusLabels[etapa.etapa as PadStatus]}</p>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(etapa.data_etapa), 'dd/MM/yyyy', { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {etapa.descricao}
                      </p>
                      {etapa.responsavel_etapa && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Por: {etapa.responsavel_etapa}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {etapas?.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhuma etapa registrada
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisao" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Decisão Final</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Decisão</Label>
                <Textarea
                  value={pad.decisao_final || ''}
                  onChange={(e) => updateDecisaoMutation.mutate(e.target.value)}
                  placeholder="Registre a decisão final do processo..."
                  rows={6}
                  disabled={pad.status === 'arquivado'}
                />
              </div>
              {pad.data_decisao_final && (
                <p className="text-sm text-muted-foreground">
                  Data da decisão: {format(new Date(pad.data_decisao_final), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
