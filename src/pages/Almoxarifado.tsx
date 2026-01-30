import { useState } from "react";
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

const Almoxarifado = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("almoxarifado");
  const isMobile = useIsMobile();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <h1 className="text-xl md:text-2xl font-bold mb-4 md:mb-6">Almoxarifado</h1>
          
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
        </main>
      </div>
    </div>
  );
};

export default Almoxarifado;