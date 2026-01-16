import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, TrendingUp, Package, DollarSign } from "lucide-react";

const ObservatorioComerciazacao = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("observatorio");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Observatório de Comercialização</h1>
          
          {/* Dashboard Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Vendas</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 0,00</div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Produtos Vendidos</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Unidades este mês</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">R$ 0,00</div>
                <p className="text-xs text-muted-foreground">Por venda</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Registros</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">0</div>
                <p className="text-xs text-muted-foreground">Total de registros</p>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="registro" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="registro">Registro de Vendas</TabsTrigger>
              <TabsTrigger value="produtos">Produtos</TabsTrigger>
              <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              <TabsTrigger value="exportar">Exportar Dados</TabsTrigger>
            </TabsList>
            
            <TabsContent value="registro">
              <Card>
                <CardHeader>
                  <CardTitle>Registro de Vendas</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Área para registro de dados de comercialização dos produtos da feira.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="produtos">
              <Card>
                <CardHeader>
                  <CardTitle>Cadastro de Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Cadastro de produtos comercializados na feira.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="relatorios">
              <Card>
                <CardHeader>
                  <CardTitle>Relatórios Analíticos</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Relatórios e análises para pesquisadores e universidades.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="exportar">
              <Card>
                <CardHeader>
                  <CardTitle>Exportação de Dados</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Exportação de dados em formatos CSV, Excel e PDF para análise externa.
                  </p>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
};

export default ObservatorioComerciazacao;
