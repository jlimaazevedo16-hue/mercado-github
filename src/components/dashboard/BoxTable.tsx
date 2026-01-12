import { ExternalLink, List, Pencil, MoreHorizontal, Filter } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface Box {
  id: string;
  bloco: string;
  tipo: string;
  responsavel: string;
  status: "Ativo" | "Em Reforma" | "Disponível" | "Interditado";
}

interface BoxTableProps {
  boxes: Box[];
  onSelectBox: (box: Box) => void;
  selectedBoxId?: string;
}

const StatusBadge = ({ status }: { status: Box["status"] }) => {
  const statusClasses = {
    Ativo: "status-active",
    "Em Reforma": "status-reform",
    Disponível: "status-available",
    Interditado: "status-blocked",
  };

  return (
    <span className={`status-badge ${statusClasses[status]}`}>
      {status}
    </span>
  );
};

export const BoxTable = ({ boxes, onSelectBox, selectedBoxId }: BoxTableProps) => {
  return (
    <div className="bg-card rounded-lg shadow-sm">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">Listagem de Boxes</h2>
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
            <TableHead className="font-semibold">Box</TableHead>
            <TableHead className="font-semibold">Bloco</TableHead>
            <TableHead className="font-semibold">Tipo</TableHead>
            <TableHead className="font-semibold">Responsável</TableHead>
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
                  {box.id}
                </span>
              </TableCell>
              <TableCell className="text-foreground">{box.bloco}</TableCell>
              <TableCell className="text-foreground">{box.tipo}</TableCell>
              <TableCell className="text-foreground">{box.responsavel || "—"}</TableCell>
              <TableCell>
                <StatusBadge status={box.status} />
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <button className="p-2 hover:bg-muted rounded-md transition-colors">
                    <ExternalLink size={16} className="text-muted-foreground" />
                  </button>
                  <button className="p-2 hover:bg-muted rounded-md transition-colors">
                    <List size={16} className="text-muted-foreground" />
                  </button>
                  <button className="p-2 hover:bg-muted rounded-md transition-colors">
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
