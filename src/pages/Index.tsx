import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { StatCards } from "@/components/dashboard/StatCards";
import { SearchFilters } from "@/components/dashboard/SearchFilters";
import { BoxTable, Box } from "@/components/dashboard/BoxTable";
import { BoxDetails } from "@/components/dashboard/BoxDetails";

const mockBoxes: Box[] = [
  { id: "A-12", bloco: "Floricultura Bela Flor", tipo: "Box", responsavel: "", status: "Ativo" },
  { id: "B-05", bloco: "Lanchonete Sabor", tipo: "Quiosque", responsavel: "", status: "Em Reforma" },
  { id: "C-22", bloco: "Eletrônica TechBox", tipo: "Box", responsavel: "", status: "Disponível" },
  { id: "K-07", bloco: "Quiosque Tropical", tipo: "Quiosque", responsavel: "", status: "Interditado" },
];

const Index = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("boxes");
  const [selectedBox, setSelectedBox] = useState<Box | null>(mockBoxes[0]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <div className="flex flex-1">
          <main className="flex-1 p-6 space-y-6 overflow-auto">
            <StatCards />
            <SearchFilters />
            <BoxTable 
              boxes={mockBoxes} 
              onSelectBox={setSelectedBox}
              selectedBoxId={selectedBox?.id}
            />
          </main>
          
          {selectedBox && (
            <BoxDetails 
              box={selectedBox} 
              onClose={() => setSelectedBox(null)} 
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
