import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { NotificacoesLista } from '@/components/notificacoes/NotificacoesLista';
import { NotificacaoForm } from '@/components/notificacoes/NotificacaoForm';
import { PADLista } from '@/components/notificacoes/PADLista';
import { PADDetalhes } from '@/components/notificacoes/PADDetalhes';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { ExportButton } from '@/components/export/ExportButton';
import { ExportDialog } from '@/components/export/ExportDialog';
import type { ExportColumn } from '@/lib/export';
import { format } from 'date-fns';

const Notificacoes = () => {
  const [activeItem, setActiveItem] = useState('notificacoes');
  const [activeTab, setActiveTab] = useState('lista');
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const { role, isAdmin, isAdminMaster } = useUserRole();
  const isLojista = role === 'lojista';
  const navigate = useNavigate();
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Fetch notificacoes for export
  const { data: notificacoes } = useQuery({
    queryKey: ['notificacoes-export'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('notificacoes')
        .select(`
          *,
          boxes (codigo, boxe),
          responsaveis (nome)
        `)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const exportColumns: ExportColumn[] = [
    { key: 'numero_interno', header: 'Número', width: 12 },
    { key: 'tipo', header: 'Tipo', width: 10 },
    { key: 'artigo_violado', header: 'Artigo', width: 15 },
    { key: 'classificacao', header: 'Classificação', width: 12 },
    { key: 'data_notificacao', header: 'Data', width: 12, formatter: (v) => v ? format(new Date(v as string), 'dd/MM/yyyy') : '-' },
    { key: 'status', header: 'Status', width: 12 },
  ];

  const exportData = notificacoes?.map(n => ({
    ...n,
    box_codigo: (n.boxes as any)?.codigo || '-',
    responsavel_nome: (n.responsaveis as any)?.nome || '-',
  })) || [];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                {isLojista ? 'Minhas Notificações' : 'Notificações e PAD'}
              </h1>
              <div className="flex items-center gap-2">
                {!isLojista && <ExportButton onClick={() => setShowExportDialog(true)} permissionKey="notificacoes" />}
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/pendencias')}
                  className="gap-2"
                >
                  Ver Central de Pendências
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="lista">Notificações</TabsTrigger>
                {(isAdmin || isAdminMaster) && (
                  <TabsTrigger value="nova">Nova Notificação</TabsTrigger>
                )}
                <TabsTrigger value="pads">Processos (PAD)</TabsTrigger>
                {selectedPadId && (
                  <TabsTrigger value="pad-detalhes">Detalhes PAD</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="lista">
                <NotificacoesLista 
                  onViewPad={(padId) => {
                    setSelectedPadId(padId);
                    setActiveTab('pad-detalhes');
                  }}
                />
              </TabsContent>

              {(isAdmin || isAdminMaster) && (
                <TabsContent value="nova">
                  <NotificacaoForm 
                    onSuccess={() => setActiveTab('lista')}
                  />
                </TabsContent>
              )}

              <TabsContent value="pads">
                <PADLista 
                  onViewDetails={(padId) => {
                    setSelectedPadId(padId);
                    setActiveTab('pad-detalhes');
                  }}
                />
              </TabsContent>

              <TabsContent value="pad-detalhes">
                {selectedPadId && (
                  <PADDetalhes 
                    padId={selectedPadId}
                    onBack={() => {
                      setSelectedPadId(null);
                      setActiveTab('pads');
                    }}
                  />
                )}
              </TabsContent>
            </Tabs>

            <ExportDialog
              open={showExportDialog}
              onOpenChange={setShowExportDialog}
              module="notificacoes"
              title="Relatório de Notificações"
              columns={exportColumns}
              data={exportData}
              permissionKey="notificacoes"
            />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notificacoes;
