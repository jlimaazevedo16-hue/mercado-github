import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemsCadastro } from "@/components/almoxarifado/ItemsCadastro";
import { ItemsEntrada } from "@/components/almoxarifado/ItemsEntrada";
import { ItemsSaida } from "@/components/almoxarifado/ItemsSaida";
import { ConsumoReport } from "@/components/almoxarifado/ConsumoReport";
import { AlmoxarifadoDashboard } from "@/components/almoxarifado/AlmoxarifadoDashboard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useIsMobile } from "@/hooks/use-mobile";
import { ExportButton } from "@/components/export/ExportButton";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { ExportColumn } from "@/lib/export";

const Almoxarifado = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("almoxarifado");
  const isMobile = useIsMobile();
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Fetch items for export
  const { data: items } = useQuery({
    queryKey: ["almoxarifado-items-export"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("*")
        .order("descricao");
      if (error) throw error;
      return data;
    },
  });

  const exportColumns: ExportColumn[] = [
    { key: 'descricao', header: 'Descrição', width: 30 },
    { key: 'embalagem', header: 'Unidade', width: 10 },
    { key: 'qtd_atual', header: 'Qtd. Atual', width: 12 },
    { key: 'estoque_minimo', header: 'Estoque Mínimo', width: 12 },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <h1 className="text-xl md:text-2xl font-bold">Almoxarifado</h1>
            <ExportButton onClick={() => setShowExportDialog(true)} permissionKey="almoxarifado" />
          </div>
          
          <AlmoxarifadoDashboard />
          
          <Tabs defaultValue="cadastro" className="w-full mt-4 md:mt-6">
            {isMobile ? (
              <ScrollArea className="w-full whitespace-nowrap mb-4">
                <TabsList className="inline-flex w-auto">
                  <TabsTrigger value="cadastro" className="text-xs px-3">Cadastro</TabsTrigger>
                  <TabsTrigger value="entrada" className="text-xs px-3">Entrada</TabsTrigger>
                  <TabsTrigger value="saida" className="text-xs px-3">Saída</TabsTrigger>
                  <TabsTrigger value="consumo" className="text-xs px-3">Consumo</TabsTrigger>
                </TabsList>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            ) : (
              <TabsList className="grid w-full grid-cols-4 mb-6">
                <TabsTrigger value="cadastro">Cadastro de Itens</TabsTrigger>
                <TabsTrigger value="entrada">Entrada</TabsTrigger>
                <TabsTrigger value="saida">Saída</TabsTrigger>
                <TabsTrigger value="consumo">Consumo</TabsTrigger>
              </TabsList>
            )}
            
            <TabsContent value="cadastro">
              <ItemsCadastro />
            </TabsContent>
            
            <TabsContent value="entrada">
              <ItemsEntrada />
            </TabsContent>
            
            <TabsContent value="saida">
              <ItemsSaida />
            </TabsContent>
            
            <TabsContent value="consumo">
              <ConsumoReport />
            </TabsContent>
          </Tabs>

          <ExportDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            module="almoxarifado"
            title="Relatório de Almoxarifado"
            columns={exportColumns}
            data={items || []}
            permissionKey="almoxarifado"
          />
        </main>
      </div>
    </div>
  );
};

export default Almoxarifado;