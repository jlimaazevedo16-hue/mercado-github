import { Search, ChevronDown, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const SearchFilters = () => {
  return (
    <div className="flex items-center gap-3 bg-card p-4 rounded-lg shadow-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar por número do box ou CPF" 
          className="pl-10 bg-background border-input"
        />
      </div>
      
      <Button variant="outline" className="flex items-center gap-2">
        Bloco
        <ChevronDown size={16} />
      </Button>
      
      <Button variant="outline" className="flex items-center gap-2">
        Segmento
        <ChevronDown size={16} />
      </Button>
      
      <Button variant="outline" className="flex items-center gap-2">
        Status
        <ChevronDown size={16} />
      </Button>
      
      <Button className="flex items-center gap-2 bg-status-available hover:bg-status-available/90 text-white">
        <Plus size={18} />
        Novo Box
      </Button>
    </div>
  );
};
