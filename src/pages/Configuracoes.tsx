import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfiguracoesUFMS } from "@/components/configuracoes/ConfiguracoesUFMS";
import { ExtracaoMensal } from "@/components/configuracoes/ExtracaoMensal";
import { SegmentosManager } from "@/components/configuracoes/SegmentosManager";
import { InstituicaoConfig } from "@/components/configuracoes/InstituicaoConfig";
import { Settings, FileSpreadsheet, Calculator, Tag, Building2 } from "lucide-react";

export default function Configuracoes() {
  const [activeItem, setActiveItem] = useState("configuracoes");

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <Settings className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Configurações Administrativas</h1>
                <p className="text-muted-foreground">
                  Gerencie valores UFMS, fatores de cálculo, segmentos e extrações mensais
                </p>
              </div>
            </div>

            <Tabs defaultValue="ufms" className="space-y-4">
              <TabsList>
                <TabsTrigger value="ufms" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  UFMS e Fatores
                </TabsTrigger>
                <TabsTrigger value="instituicao" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  Instituição
                </TabsTrigger>
                <TabsTrigger value="segmentos" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Segmentos
                </TabsTrigger>
                <TabsTrigger value="extracao" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Extração Mensal
                </TabsTrigger>
              </TabsList>

              <TabsContent value="ufms">
                <ConfiguracoesUFMS />
              </TabsContent>

              <TabsContent value="instituicao">
                <InstituicaoConfig />
              </TabsContent>

              <TabsContent value="segmentos">
                <SegmentosManager />
              </TabsContent>

              <TabsContent value="extracao">
                <ExtracaoMensal />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
