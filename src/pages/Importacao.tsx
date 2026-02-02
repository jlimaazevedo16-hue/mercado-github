import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Upload, CheckCircle, FileSpreadsheet } from "lucide-react";
import { ImportacaoModelo } from "@/components/importacao/ImportacaoModelo";
import { ImportacaoUpload } from "@/components/importacao/ImportacaoUpload";
import { ImportacaoValidar } from "@/components/importacao/ImportacaoValidar";
import { ImportacaoLogs } from "@/components/importacao/ImportacaoLogs";

export interface ImportData {
  fileName: string;
  data: Record<string, unknown>[];
  headers: string[];
}

export default function Importacao() {
  const [activeItem, setActiveItem] = useState("importacao");
  const [activeTab, setActiveTab] = useState("modelo");
  const [importData, setImportData] = useState<ImportData | null>(null);

  const handleFileUploaded = (data: ImportData) => {
    setImportData(data);
    setActiveTab("validar");
  };

  const handleImportComplete = () => {
    setImportData(null);
    setActiveTab("logs");
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Importação por Planilha</h1>
                <p className="text-muted-foreground">
                  Importe dados em massa para acelerar o cadastro inicial do sistema
                </p>
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="modelo" className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">1. Baixar Modelo</span>
                  <span className="sm:hidden">Modelo</span>
                </TabsTrigger>
                <TabsTrigger value="upload" className="gap-2">
                  <Upload className="h-4 w-4" />
                  <span className="hidden sm:inline">2. Enviar Planilha</span>
                  <span className="sm:hidden">Upload</span>
                </TabsTrigger>
                <TabsTrigger value="validar" className="gap-2" disabled={!importData}>
                  <CheckCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">3. Validar e Importar</span>
                  <span className="sm:hidden">Validar</span>
                </TabsTrigger>
                <TabsTrigger value="logs" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  <span className="hidden sm:inline">Histórico</span>
                  <span className="sm:hidden">Logs</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="modelo">
                <ImportacaoModelo />
              </TabsContent>

              <TabsContent value="upload">
                <ImportacaoUpload onFileUploaded={handleFileUploaded} />
              </TabsContent>

              <TabsContent value="validar">
                {importData && (
                  <ImportacaoValidar 
                    importData={importData} 
                    onImportComplete={handleImportComplete}
                    onCancel={() => {
                      setImportData(null);
                      setActiveTab("upload");
                    }}
                  />
                )}
              </TabsContent>

              <TabsContent value="logs">
                <ImportacaoLogs />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
