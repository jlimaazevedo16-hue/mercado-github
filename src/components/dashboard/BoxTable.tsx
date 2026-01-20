import { ExternalLink, List, Pencil, MoreHorizontal, Filter } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export interface Box {
  id: string;
  codigo: string;
  boxe: string;
  setor: string | null;
  inquilino: string | null;
  status: string;
  responsavel_nome?: string;
}

interface BoxTableProps {
  boxes: Box[];
  onSelectBox: (box: Box) => void;
  selectedBoxId?: string;
  isLoading?: boolean;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'ASSINADO':
      return 'default';
    case 'DISPONIVEL':
      return 'secondary';
    case 'PROCESSO':
      return 'outline';
    case 'INTERDITADO':
    case 'CANCELADO':
    case 'DESATIVADO':
      return 'destructive';
    default:
      return 'outline';
  }
};

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    ASSINADO: 'Assinado',
    DISPONIVEL: 'Disponível',
    PROCESSO: 'Em Processo',
    CANCELADO: 'Cancelado',
    DESATIVADO: 'Desativado',
    DEVOLVIDO: 'Devolvido',
    INTERDITADO: 'Interditado',
  };
  return labels[status] || status;
};

export const BoxTable = ({ boxes, onSelectBox, selectedBoxId, isLoading }: BoxTableProps) => {
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg shadow-sm p-8 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-muted-foreground">Carregando boxes...</p>
      </div>
    );
  }

  if (!boxes || boxes.length === 0) {
    return (
      <div className="bg-card rounded-lg shadow-sm p-8 text-center">
        <p className="text-muted-foreground">Nenhum box encontrado</p>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Listagem de Boxes ({boxes.length})
        </h2>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-muted rounded-md transition-colors">
            <Filter size={18} className="text-muted-foreground" />
          </button>
          <button className="p-2 hover:bg-muted rounded-md transition-colors">
            <MoreHorizontal size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>
      
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="font-semibold">Código</TableHead>
            <TableHead className="font-semibold">Box</TableHead>
            <TableHead className="font-semibold">Setor</TableHead>
            <TableHead className="font-semibold">Inquilino</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {boxes.map((box) => (
            <TableRow 
              key={box.id}
              className={`cursor-pointer transition-colors ${
                selectedBoxId === box.id ? "bg-muted" : ""
              }`}
              onClick={() => onSelectBox(box)}
            >
              <TableCell>
                <span className="inline-flex items-center justify-center bg-primary text-primary-foreground text-sm font-medium px-2 py-1 rounded">
                  {box.codigo}
                </span>
              </TableCell>
              <TableCell className="text-foreground font-medium">{box.boxe}</TableCell>
              <TableCell className="text-foreground">{box.setor || "—"}</TableCell>
              <TableCell className="text-foreground">{box.inquilino || "—"}</TableCell>
              <TableCell>
                <Badge variant={getStatusBadgeVariant(box.status)}>
                  {getStatusLabel(box.status)}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <button 
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/boxes/${box.id}`);
                    }}
                    title="Ver ficha completa"
                  >
                    <ExternalLink size={16} className="text-muted-foreground" />
                  </button>
                  <button className="p-2 hover:bg-muted rounded-md transition-colors">
                    <List size={16} className="text-muted-foreground" />
                  </button>
                  <button 
                    className="p-2 hover:bg-muted rounded-md transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/boxes/${box.id}`);
                    }}
                    title="Editar"
                  >
                    <Pencil size={16} className="text-muted-foreground" />
                  </button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};
