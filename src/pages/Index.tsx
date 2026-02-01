import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { SearchFilters } from "@/components/dashboard/SearchFilters";
import { BoxTable, Box } from "@/components/dashboard/BoxTable";
import { BoxDetails } from "@/components/dashboard/BoxDetails";
import { BoxesStatCards } from "@/components/boxes/BoxesStatCards";
import { ExportButton } from "@/components/export/ExportButton";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { ExportColumn } from "@/lib/export";
import { useUserRole } from "@/hooks/useUserRole";
import { useLojistaResponsavel } from "@/hooks/useLojistaResponsavel";

const Index = () => {
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState("boxes");
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [setorFilter, setSetorFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");
  const [showExportDialog, setShowExportDialog] = useState(false);
  
  const { hasPermission, role } = useUserRole();
  const { responsavelId, isLojista, loading: lojistaLoading } = useLojistaResponsavel();
  const canEdit = hasPermission("boxes", "edit");

  // Fetch boxes from database
  const { data: boxesData, isLoading } = useQuery({
    queryKey: ["dashboard-boxes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select(`
          id,
          codigo,
          boxe,
          inquilino,
          status,
          area_m2,
          responsavel_id,
          setores ( id, nome, mercado ),
          segmentos ( id, nome ),
          responsaveis (id, nome)
        `)
        .order("codigo");
      
      if (error) throw error;
      
      return data?.map(box => ({
        id: box.id,
        codigo: box.codigo,
        boxe: box.boxe,
        setor_nome: (box.setores as any)?.nome || null,
        setor_mercado: (box.setores as any)?.mercado || null,
        segmento_nome: (box.segmentos as any)?.nome || null,
        inquilino: box.inquilino,
        status: box.status,
        area_m2: box.area_m2,
        responsavel_id: box.responsavel_id,
        responsavel_nome: (box.responsaveis as any)?.nome || null,
      })) || [];
    }
  });

  // Fetch responsaveis for filter
  const { data: responsaveisData } = useQuery({
    queryKey: ["responsaveis-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, nome")
        .eq("status", "ATIVO")
        .order("nome");
      if (error) throw error;
      return data || [];
    }
  });

  // Filter boxes for lojista (only their linked boxes)
  const baseBoxes = useMemo(() => {
    if (!boxesData) return [];
    
    // Se for lojista, filtrar apenas os boxes vinculados ao responsável
    if (isLojista && responsavelId) {
      return boxesData.filter(box => box.responsavel_id === responsavelId);
    }
    
    return boxesData;
  }, [boxesData, isLojista, responsavelId]);

  // Calculate stats (based on filtered boxes for lojista)
  const stats = useMemo(() => {
    if (!baseBoxes) return {
      total: 0,
      assinados: 0,
      disponiveis: 0,
      emProcesso: 0,
      interditados: 0,
      responsaveisAtivos: 0,
      areaTotal: 0
    };

    const uniqueResponsaveis = new Set(baseBoxes.filter(b => b.responsavel_id).map(b => b.responsavel_id));

    return {
      total: baseBoxes.length,
      assinados: baseBoxes.filter(b => b.status === "ASSINADO").length,
      disponiveis: baseBoxes.filter(b => b.status === "DISPONIVEL").length,
      emProcesso: baseBoxes.filter(b => b.status === "PROCESSO").length,
      interditados: baseBoxes.filter(b => b.status === "INTERDITADO").length,
      responsaveisAtivos: uniqueResponsaveis.size,
      areaTotal: baseBoxes.reduce((sum, b) => sum + (b.area_m2 || 0), 0)
    };
  }, [baseBoxes]);

  // Get unique setores for filter (from base boxes for lojista)
  const setores = useMemo(() => {
    const uniqueSetores = new Set<string>();
    baseBoxes?.forEach(box => {
      if (box.setor_nome) uniqueSetores.add(box.setor_nome);
    });
    return Array.from(uniqueSetores).sort();
  }, [baseBoxes]);

  // Filter boxes (apply additional filters on top of lojista filter)
  const filteredBoxes = useMemo(() => {
    if (!baseBoxes) return [];
    
    return baseBoxes.filter(box => {
      // Search filter
      const matchesSearch = !searchTerm || 
        box.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.boxe?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.inquilino?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.setor_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.segmento_nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        box.responsavel_nome?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || box.status === statusFilter;

      // Setor filter
      const matchesSetor = setorFilter === "all" || box.setor_nome === setorFilter;

      // Responsavel filter (only for non-lojistas, since lojista is already filtered)
      const matchesResponsavel = isLojista || responsavelFilter === "all" || box.responsavel_id === responsavelFilter;

      return matchesSearch && matchesStatus && matchesSetor && matchesResponsavel;
    });
  }, [baseBoxes, searchTerm, statusFilter, setorFilter, responsavelFilter, isLojista]);

  const handleSelectBox = (box: Box) => {
    setSelectedBox(box);
  };

  // Export configuration
  const exportColumns: ExportColumn[] = [
    { key: 'codigo', header: 'Código', width: 12 },
    { key: 'boxe', header: 'Box', width: 15 },
    { key: 'setor_nome', header: 'Setor', width: 18 },
    { key: 'segmento_nome', header: 'Segmento', width: 18 },
    { key: 'area_m2', header: 'Área (m²)', width: 10 },
    { key: 'inquilino', header: 'Inquilino', width: 25 },
    { key: 'responsavel_nome', header: 'Responsável', width: 25 },
    { key: 'status', header: 'Status', width: 12 },
  ];

  const exportFilters = {
    busca: searchTerm || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    setor: setorFilter !== 'all' ? setorFilter : undefined,
    responsavel: responsavelFilter !== 'all' ? responsavelFilter : undefined,
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <div className="flex flex-1">
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">Gestão de Boxes</h1>
              <ExportButton onClick={() => setShowExportDialog(true)} permissionKey="boxes" />
            </div>

            <BoxesStatCards stats={stats} />

            <SearchFilters 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              setorFilter={setorFilter}
              onSetorChange={setSetorFilter}
              setores={setores}
              responsavelFilter={isLojista ? undefined : responsavelFilter}
              onResponsavelChange={isLojista ? undefined : setResponsavelFilter}
              responsaveis={isLojista ? undefined : responsaveisData}
              onNewBox={canEdit ? () => navigate("/boxes/novo") : undefined}
            />
            <BoxTable 
              boxes={filteredBoxes} 
              onSelectBox={handleSelectBox}
              selectedBoxId={selectedBox?.id}
              isLoading={isLoading}
            />
          </main>
          
          {selectedBox && (
            <BoxDetails 
              box={{
                id: selectedBox.codigo,
                boxId: selectedBox.id,
                bloco: selectedBox.boxe,
                tipo: selectedBox.setor_nome || "",
                segmento: selectedBox.segmento_nome || undefined,
                area: selectedBox.area_m2 || undefined,
                status: selectedBox.status === "ASSINADO" ? "Ativo" : 
                        selectedBox.status === "DISPONIVEL" ? "Disponível" :
                        selectedBox.status === "PROCESSO" ? "Em Reforma" : "Interditado",
                fotoUrl: undefined
              }} 
              onClose={() => setSelectedBox(null)} 
            />
          )}
        </div>

        <ExportDialog
          open={showExportDialog}
          onOpenChange={setShowExportDialog}
          module="boxes"
          title="Relatório de Boxes"
          columns={exportColumns}
          data={filteredBoxes}
          filters={exportFilters}
          permissionKey="boxes"
        />
      </div>
    </div>
  );
};

export default Index;
