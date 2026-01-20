import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReunioesList } from "@/components/frequencia/ReunioesList";
import { FrequenciaRelatorios } from "@/components/frequencia/FrequenciaRelatorios";
import { Calendar, BarChart3 } from "lucide-react";

const Frequencia = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("frequencia");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <h1 className="text-2xl font-bold">Controle de Frequência</h1>
            <p className="text-muted-foreground">
              Gerencie reuniões, assembleias e controle a presença dos responsáveis
            </p>
          </div>

          <Tabs defaultValue="reunioes" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
              <TabsTrigger value="reunioes" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Reuniões
              </TabsTrigger>
              <TabsTrigger value="relatorios" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Relatórios
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reunioes">
              <ReunioesList />
            </TabsContent>

            <TabsContent value="relatorios">
              <FrequenciaRelatorios />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default Frequencia;
