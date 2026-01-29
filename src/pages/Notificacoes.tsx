import { useState } from 'react';
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

const Notificacoes = () => {
  const [activeItem, setActiveItem] = useState('notificacoes');
  const [activeTab, setActiveTab] = useState('lista');
  const [selectedPadId, setSelectedPadId] = useState<string | null>(null);
  const { isAdmin, isAdminMaster } = useUserRole();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                Notificações e PAD
              </h1>
              <Button 
                variant="outline" 
                onClick={() => navigate('/pendencias')}
                className="gap-2"
              >
                Ver Central de Pendências
                <ArrowRight className="h-4 w-4" />
              </Button>
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
          </div>
        </main>
      </div>
    </div>
  );
};

export default Notificacoes;
