import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendenciasLista } from '@/components/pendencias/PendenciasLista';
import { AlertasConfig } from '@/components/pendencias/AlertasConfig';
import { CertificadosControl } from '@/components/pendencias/CertificadosControl';
import { useUserRole } from '@/hooks/useUserRole';
import { Badge } from '@/components/ui/badge';

const Pendencias = () => {
  const [activeItem, setActiveItem] = useState('pendencias');
  const [activeTab, setActiveTab] = useState('lista');
  const { role, isAdmin, isAdminMaster } = useUserRole();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-foreground">
                Central de Pendências
              </h1>
              {role === 'lojista' && (
                <Badge variant="secondary">Visualização: Meus Boxes</Badge>
              )}
              {(isAdmin || isAdminMaster) && (
                <Badge variant="default">Visualização: Todos os Boxes</Badge>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="lista">Pendências</TabsTrigger>
                <TabsTrigger value="certificados">Certificados</TabsTrigger>
                {(isAdmin || isAdminMaster) && (
                  <TabsTrigger value="alertas">Configurar Alertas</TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="lista">
                <PendenciasLista />
              </TabsContent>

              <TabsContent value="certificados">
                <CertificadosControl />
              </TabsContent>

              {(isAdmin || isAdminMaster) && (
                <TabsContent value="alertas">
                  <AlertasConfig />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Pendencias;
