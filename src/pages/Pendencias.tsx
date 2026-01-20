import { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PendenciasLista } from '@/components/pendencias/PendenciasLista';
import { AlertasConfig } from '@/components/pendencias/AlertasConfig';
import { CertificadosControl } from '@/components/pendencias/CertificadosControl';

const Pendencias = () => {
  const [activeItem, setActiveItem] = useState('pendencias');
  const [activeTab, setActiveTab] = useState('lista');

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-2xl font-bold text-foreground mb-6">
              Central de Pendências
            </h1>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-6">
                <TabsTrigger value="lista">Pendências</TabsTrigger>
                <TabsTrigger value="certificados">Certificados</TabsTrigger>
                <TabsTrigger value="alertas">Configurar Alertas</TabsTrigger>
              </TabsList>

              <TabsContent value="lista">
                <PendenciasLista />
              </TabsContent>

              <TabsContent value="certificados">
                <CertificadosControl />
              </TabsContent>

              <TabsContent value="alertas">
                <AlertasConfig />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Pendencias;
