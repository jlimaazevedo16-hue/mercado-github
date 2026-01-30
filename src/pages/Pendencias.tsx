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
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-4 md:mb-6">
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Central de Pendências
              </h1>
              {role === 'lojista' && (
                <Badge variant="secondary" className="w-fit">Visualização: Meus Boxes</Badge>
              )}
              {(isAdmin || isAdminMaster) && (
                <Badge variant="default" className="w-fit">Visualização: Todos os Boxes</Badge>
              )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 md:mb-6 w-full md:w-auto overflow-x-auto">
                <TabsTrigger value="lista" className="flex-1 md:flex-none">Pendências</TabsTrigger>
                <TabsTrigger value="certificados" className="flex-1 md:flex-none">Certificados</TabsTrigger>
                {(isAdmin || isAdminMaster) && (
                  <TabsTrigger value="alertas" className="flex-1 md:flex-none">Alertas</TabsTrigger>
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
