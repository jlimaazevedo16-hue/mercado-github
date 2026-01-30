import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ConfiguracoesUFMS } from "@/components/configuracoes/ConfiguracoesUFMS";
import { ExtracaoMensal } from "@/components/configuracoes/ExtracaoMensal";
import { SegmentosManager } from "@/components/configuracoes/SegmentosManager";
import { SetoresManager } from "@/components/configuracoes/SetoresManager";
import { InstituicaoConfig } from "@/components/configuracoes/InstituicaoConfig";
import { BackupManager } from "@/components/configuracoes/BackupManager";
import { EmailConfig } from "@/components/configuracoes/EmailConfig";
import { useUserRole } from "@/hooks/useUserRole";
import { Settings, FileSpreadsheet, Calculator, Tag, Building2, Database, MapPin, Mail } from "lucide-react";

export default function Configuracoes() {
  const [activeItem, setActiveItem] = useState("configuracoes");
  const { isAdminMaster } = useUserRole();

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
              <TabsList className="flex-wrap h-auto gap-1">
                <TabsTrigger value="ufms" className="gap-2">
                  <Calculator className="h-4 w-4" />
                  <span className="hidden sm:inline">UFMS e Fatores</span>
                  <span className="sm:hidden">UFMS</span>
                </TabsTrigger>
                <TabsTrigger value="instituicao" className="gap-2">
                  <Building2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Instituição</span>
                  <span className="sm:hidden">Inst.</span>
                </TabsTrigger>
                <TabsTrigger value="segmentos" className="gap-2">
                  <Tag className="h-4 w-4" />
                  Segmentos
                </TabsTrigger>
                <TabsTrigger value="setores" className="gap-2">
                  <MapPin className="h-4 w-4" />
                  Setores
                </TabsTrigger>
                <TabsTrigger value="extracao" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Extração Mensal</span>
                  <span className="sm:hidden">Extração</span>
                </TabsTrigger>
                {isAdminMaster && (
                  <TabsTrigger value="email" className="gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail
                  </TabsTrigger>
                )}
                {isAdminMaster && (
                  <TabsTrigger value="backup" className="gap-2">
                    <Database className="h-4 w-4" />
                    Backup
                  </TabsTrigger>
                )}
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

              <TabsContent value="setores">
                <SetoresManager />
              </TabsContent>

              <TabsContent value="extracao">
                <ExtracaoMensal />
              </TabsContent>

              {isAdminMaster && (
                <TabsContent value="email">
                  <EmailConfig />
                </TabsContent>
              )}

              {isAdminMaster && (
                <TabsContent value="backup">
                  <BackupManager />
                </TabsContent>
              )}
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
