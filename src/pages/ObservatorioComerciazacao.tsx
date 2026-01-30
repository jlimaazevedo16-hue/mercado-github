import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MOCDashboard } from "@/components/observatorio/MOCDashboard";
import { MOCRegistroForm } from "@/components/observatorio/MOCRegistroForm";
import { MOCProdutos } from "@/components/observatorio/MOCProdutos";
import { MOCRelatorios } from "@/components/observatorio/MOCRelatorios";
import { MOCExportar } from "@/components/observatorio/MOCExportar";
import { Building2 } from "lucide-react";
import { ExportButton } from "@/components/export/ExportButton";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { ExportColumn } from "@/lib/export";
import { format } from "date-fns";

const ObservatorioComerciazacao = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("observatorio");
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Fetch registros for export
  const { data: registros } = useQuery({
    queryKey: ["moc-registros-export"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("moc_registros")
        .select(`
          *,
          moc_produtos (nome_popular, segmento)
        `)
        .order("data_coleta", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const exportColumns: ExportColumn[] = [
    { key: 'data_coleta', header: 'Data', width: 12, formatter: (v) => v ? format(new Date(v as string), 'dd/MM/yyyy') : '-' },
    { key: 'produto_nome', header: 'Produto', width: 20 },
    { key: 'quantidade_kg', header: 'Quantidade (kg)', width: 15 },
    { key: 'estado_produto', header: 'Estado', width: 12 },
    { key: 'destinacao', header: 'Destinação', width: 15 },
    { key: 'origem_municipio', header: 'Origem', width: 15 },
  ];

  const exportData = registros?.map(r => ({
    ...r,
    produto_nome: (r.moc_produtos as any)?.nome_popular || '-',
  })) || [];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          {/* Cabeçalho Institucional */}
          <div className="bg-muted/50 border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Building2 className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-xl font-bold">Observatório de Comercialização - MOC</h1>
                  <p className="text-sm text-muted-foreground">
                    Associação dos Feirantes do Mercado Central | CNPJ: 00.000.000/0001-00 | Localidade: [Cidade/UF]
                  </p>
                </div>
              </div>
              <ExportButton onClick={() => setShowExportDialog(true)} permissionKey="observatorio" />
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

          <ExportDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            module="observatorio"
            title="Relatório do Observatório de Comercialização"
            columns={exportColumns}
            data={exportData}
            permissionKey="observatorio"
          />
        </main>
      </div>
    </div>
  );
};

export default ObservatorioComerciazacao;
