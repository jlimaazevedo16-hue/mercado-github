import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReunioesList } from "@/components/frequencia/ReunioesList";
import { FrequenciaRelatorios } from "@/components/frequencia/FrequenciaRelatorios";
import { LojistaFrequencia } from "@/components/frequencia/LojistaFrequencia";
import { Calendar, BarChart3 } from "lucide-react";
import { ExportButton } from "@/components/export/ExportButton";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { ExportColumn } from "@/lib/export";
import { format } from "date-fns";
import { useLojistaResponsavel } from "@/hooks/useLojistaResponsavel";

const Frequencia = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("frequencia");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const { responsavelId, isLojista } = useLojistaResponsavel();

  // Fetch reunioes for export
  const { data: reunioes } = useQuery({
    queryKey: ["reunioes-export"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reunioes")
        .select("*")
        .order("data_evento", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const exportColumns: ExportColumn[] = [
    { key: 'titulo', header: 'Título', width: 25 },
    { key: 'tipo', header: 'Tipo', width: 15 },
    { key: 'data_evento', header: 'Data', width: 12, formatter: (v) => v ? format(new Date(v as string), 'dd/MM/yyyy') : '-' },
    { key: 'local', header: 'Local', width: 20 },
    { key: 'status', header: 'Status', width: 12 },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {isLojista ? 'Minha Frequência' : 'Controle de Frequência'}
              </h1>
              <p className="text-muted-foreground">
                {isLojista 
                  ? 'Acompanhe sua presença em reuniões e assembleias'
                  : 'Gerencie reuniões, assembleias e controle a presença dos responsáveis'}
              </p>
            </div>
            {!isLojista && (
              <ExportButton onClick={() => setShowExportDialog(true)} permissionKey="frequencia" />
            )}
          </div>

          {isLojista && responsavelId ? (
            <LojistaFrequencia responsavelId={responsavelId} />
          ) : (
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
          )}

          <ExportDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            module="frequencia"
            title="Relatório de Reuniões e Frequência"
            columns={exportColumns}
            data={reunioes || []}
            permissionKey="frequencia"
          />
        </main>
      </div>
    </div>
  );
};

export default Frequencia;
