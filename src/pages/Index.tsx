import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatCards } from "@/components/dashboard/StatCards";
import { SearchFilters } from "@/components/dashboard/SearchFilters";
import { BoxTable, Box } from "@/components/dashboard/BoxTable";
import { BoxDetails } from "@/components/dashboard/BoxDetails";

const Index = () => {
  const navigate = useNavigate();
  const [activeMenuItem, setActiveMenuItem] = useState("boxes");
  const [selectedBox, setSelectedBox] = useState<Box | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [setorFilter, setSetorFilter] = useState("all");

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
          setor,
          inquilino,
          status,
          area_m2,
          responsaveis (nome)
        `)
        .order("codigo");
      
      if (error) throw error;
      
      return data?.map(box => ({
        id: box.id,
        codigo: box.codigo,
        boxe: box.boxe,
        setor: box.setor,
        inquilino: box.inquilino,
        status: box.status,
        area_m2: box.area_m2,
        responsavel_nome: (box.responsaveis as any)?.nome || null,
      })) || [];
    }
  });

  // Get unique setores for filter
  const setores = useMemo(() => {
    const uniqueSetores = new Set<string>();
    boxesData?.forEach(box => {
      if (box.setor) uniqueSetores.add(box.setor);
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
        box.responsavel_nome?.toLowerCase().includes(searchTerm.toLowerCase());

      // Status filter
      const matchesStatus = statusFilter === "all" || box.status === statusFilter;

      // Setor filter
      const matchesSetor = setorFilter === "all" || box.setor === setorFilter;

      return matchesSearch && matchesStatus && matchesSetor;
    });
  }, [boxesData, searchTerm, statusFilter, setorFilter]);

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
            <StatCards />
            <SearchFilters 
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              statusFilter={statusFilter}
              onStatusChange={setStatusFilter}
              setorFilter={setorFilter}
              onSetorChange={setSetorFilter}
              setores={setores}
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
                bloco: selectedBox.boxe,
                tipo: selectedBox.setor || "Box",
                segmento: selectedBox.setor || undefined,
                area: undefined,
                status: selectedBox.status === "ASSINADO" ? "Ativo" : 
                        selectedBox.status === "DISPONIVEL" ? "Disponível" :
                        selectedBox.status === "PROCESSO" ? "Em Reforma" : "Interditado"
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
