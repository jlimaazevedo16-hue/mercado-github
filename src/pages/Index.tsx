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

const Index = () => {
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState("boxes");
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [setorFilter, setSetorFilter] = useState("all");
  const [responsavelFilter, setResponsavelFilter] = useState("all");

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

  // Calculate stats
  const stats = useMemo(() => {
    if (!boxesData) return {
      total: 0,
      assinados: 0,
      disponiveis: 0,
      emProcesso: 0,
      interditados: 0,
      responsaveisAtivos: 0,
      areaTotal: 0
    };

    const uniqueResponsaveis = new Set(boxesData.filter(b => b.responsavel_id).map(b => b.responsavel_id));

    return {
      total: boxesData.length,
      assinados: boxesData.filter(b => b.status === "ASSINADO").length,
      disponiveis: boxesData.filter(b => b.status === "DISPONIVEL").length,
      emProcesso: boxesData.filter(b => b.status === "PROCESSO").length,
      interditados: boxesData.filter(b => b.status === "INTERDITADO").length,
      responsaveisAtivos: uniqueResponsaveis.size,
      areaTotal: boxesData.reduce((sum, b) => sum + (b.area_m2 || 0), 0)
    };
  }, [boxesData]);

  // Get unique setores for filter
  const setores = useMemo(() => {
    const uniqueSetores = new Set<string>();
    boxesData?.forEach(box => {
      if (box.setor_nome) uniqueSetores.add(box.setor_nome);
    });
    return Array.from(uniqueSetores).sort();
  }, [boxesData]);

  // Filter boxes
  const filteredBoxes = useMemo(() => {
    if (!boxesData) return [];
    
    return boxesData.filter(box => {
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

      // Responsavel filter
      const matchesResponsavel = responsavelFilter === "all" || box.responsavel_id === responsavelFilter;

      return matchesSearch && matchesStatus && matchesSetor && matchesResponsavel;
    });
  }, [boxesData, searchTerm, statusFilter, setorFilter, responsavelFilter]);

  const handleSelectBox = (box: Box) => {
    setSelectedBox(box);
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
              responsavelFilter={responsavelFilter}
              onResponsavelChange={setResponsavelFilter}
              responsaveis={responsaveisData}
              onNewBox={() => navigate("/boxes/novo")}
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
      </div>
    </div>
  );
};

export default Index;
