import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCDashboard } from "@/components/observatorio/MOCDashboard";
import { MOCRegistroForm } from "@/components/observatorio/MOCRegistroForm";
import { MOCProdutos } from "@/components/observatorio/MOCProdutos";
import { MOCRelatorios } from "@/components/observatorio/MOCRelatorios";
import { MOCExportar } from "@/components/observatorio/MOCExportar";
import { Building2 } from "lucide-react";

const ObservatorioComerciazacao = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("observatorio");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Cabeçalho Institucional */}
          <div className="bg-muted/50 border rounded-lg p-4 mb-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-xl font-bold">Observatório de Comercialização - MOC</h1>
                <p className="text-sm text-muted-foreground">
                  Associação dos Feirantes do Mercado Central | CNPJ: 00.000.000/0001-00 | Localidade: [Cidade/UF]
                </p>
              </div>
            </div>
          </div>
          
          {/* Dashboard */}
          <MOCDashboard />
          
          <Tabs defaultValue="registro" className="w-full mt-6">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="registro">Registro de Vendas</TabsTrigger>
              <TabsTrigger value="produtos">Produtos/Espécies</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              <TabsTrigger value="exportar">Exportar Dados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="registro">
              <MOCRegistroForm />
            </TabsContent>
            
            <TabsContent value="produtos">
              <MOCProdutos />
            </TabsContent>
            
            <TabsContent value="relatorios">
              <MOCRelatorios />
            </TabsContent>
            
            <TabsContent value="exportar">
              <MOCExportar />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default ObservatorioComerciazacao;
