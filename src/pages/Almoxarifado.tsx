import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ItemsCadastro } from "@/components/almoxarifado/ItemsCadastro";
import { ItemsEntrada } from "@/components/almoxarifado/ItemsEntrada";
import { ItemsSaida } from "@/components/almoxarifado/ItemsSaida";
import { ConsumoReport } from "@/components/almoxarifado/ConsumoReport";
import { AlmoxarifadoDashboard } from "@/components/almoxarifado/AlmoxarifadoDashboard";

const Almoxarifado = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("almoxarifado");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Almoxarifado</h1>
          
          <AlmoxarifadoDashboard />
          
          <Tabs defaultValue="cadastro" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="cadastro">Cadastro de Itens</TabsTrigger>
              <TabsTrigger value="entrada">Entrada</TabsTrigger>
              <TabsTrigger value="saida">Saída</TabsTrigger>
              <TabsTrigger value="consumo">Consumo</TabsTrigger>
            </TabsList>
            
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
