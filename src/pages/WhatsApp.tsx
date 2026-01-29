import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppInstancias } from "@/components/whatsapp/WhatsAppInstancias";
import { WhatsAppTemplates } from "@/components/whatsapp/WhatsAppTemplates";
import { WhatsAppEnvios } from "@/components/whatsapp/WhatsAppEnvios";
import { WhatsAppFila } from "@/components/whatsapp/WhatsAppFila";
import { WhatsAppLogs } from "@/components/whatsapp/WhatsAppLogs";
import { WhatsAppConfig } from "@/components/whatsapp/WhatsAppConfig";

const WhatsApp = () => {
  const [activeItem, setActiveItem] = useState("whatsapp");
  const [activeTab, setActiveTab] = useState("instancias");

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">WhatsApp - Evolution API</h1>
            <p className="text-muted-foreground">
              Gerencie instâncias, templates e envios de mensagens via WhatsApp
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
              <TabsTrigger value="instancias">Instâncias</TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
              <TabsTrigger value="envios">Envios</TabsTrigger>
              <TabsTrigger value="fila">Fila</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="config">Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="instancias">
              <WhatsAppInstancias />
            </TabsContent>

            <TabsContent value="templates">
              <WhatsAppTemplates />
            </TabsContent>

            <TabsContent value="envios">
              <WhatsAppEnvios />
            </TabsContent>

            <TabsContent value="fila">
              <WhatsAppFila />
            </TabsContent>

            <TabsContent value="logs">
              <WhatsAppLogs />
            </TabsContent>

            <TabsContent value="config">
              <WhatsAppConfig />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default WhatsApp;
