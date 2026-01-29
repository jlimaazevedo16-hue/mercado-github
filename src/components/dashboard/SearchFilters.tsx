import { Search, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Responsavel {
  id: string;
  nome: string;
}

interface SearchFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  setorFilter: string;
  onSetorChange: (value: string) => void;
  setores: string[];
  responsavelFilter?: string;
  onResponsavelChange?: (value: string) => void;
  responsaveis?: Responsavel[];
  onNewBox?: () => void;
}

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "ASSINADO", label: "Assinado" },
  { value: "DISPONIVEL", label: "Disponível" },
  { value: "PROCESSO", label: "Em Processo" },
  { value: "CANCELADO", label: "Cancelado" },
  { value: "DESATIVADO", label: "Desativado" },
  { value: "DEVOLVIDO", label: "Devolvido" },
  { value: "INTERDITADO", label: "Interditado" },
];

export const SearchFilters = ({
  searchTerm,
  onSearchChange,
  statusFilter,
  onStatusChange,
  setorFilter,
  onSetorChange,
  setores,
  responsavelFilter,
  onResponsavelChange,
  responsaveis,
  onNewBox,
}: SearchFiltersProps) => {
  return (
    <div className="flex flex-wrap items-center gap-3 bg-card p-4 rounded-lg shadow-sm">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
        <Input 
          placeholder="Buscar por código, box ou inquilino..." 
          className="pl-10 bg-background border-input"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      
      <Select value={setorFilter} onValueChange={onSetorChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Setor" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todos os Setores</SelectItem>
          {setores.map((setor) => (
            <SelectItem key={setor} value={setor}>{setor}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={statusFilter} onValueChange={onStatusChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {responsaveis && onResponsavelChange && (
        <Select value={responsavelFilter || "all"} onValueChange={onResponsavelChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Responsáveis</SelectItem>
            {responsaveis.map((resp) => (
              <SelectItem key={resp.id} value={resp.id}>{resp.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      
      {onNewBox && (
        <Button 
          className="flex items-center gap-2 bg-status-available hover:bg-status-available/90 text-white"
          onClick={onNewBox}
        >
          <Plus size={18} />
          Novo Box
        </Button>
      )}
    </div>
  );
};
