import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Download, Eye, FileText, AlertTriangle } from "lucide-react";
import { differenceInDays } from "date-fns";

interface Document {
  id: string;
  nome: string;
  tipo: string | null;
  descricao: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  arquivo_url: string | null;
  created_at: string;
}

interface DocumentsTableProps {
  documents: Document[];
  onDelete: (docId: string) => void;
  isDeleting?: boolean;
}

const getValidityStatus = (dataValidade: string | null) => {
  if (!dataValidade) return null;
  
  const today = new Date();
  const validade = new Date(dataValidade);
  const daysUntilExpiry = differenceInDays(validade, today);
  
  if (daysUntilExpiry < 0) {
    return { status: 'expired', label: 'Vencido', variant: 'destructive' as const };
  } else if (daysUntilExpiry <= 30) {
    return { status: 'expiring', label: `Vence em ${daysUntilExpiry}d`, variant: 'warning' as const };
  }
  return null;
};

export const DocumentsTable = ({ documents, onDelete, isDeleting }: DocumentsTableProps) => {
  const handleView = (url: string | null) => {
    if (url) {
      window.open(url, '_blank');
    }
  };

  const handleDownload = async (url: string | null, nome: string) => {
    if (!url) return;
    
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = nome;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download error:', error);
      // Fallback: open in new tab
      window.open(url, '_blank');
    }
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>Nenhum documento cadastrado</p>
        <p className="text-sm">Clique em "Adicionar Documento" para começar</p>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nome</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Emissão</TableHead>
          <TableHead>Validade</TableHead>
          <TableHead>Arquivo</TableHead>
          <TableHead>Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => {
          const validityStatus = getValidityStatus(doc.data_validade);
          
          return (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  {doc.nome}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{doc.tipo || "—"}</Badge>
              </TableCell>
              <TableCell>
                {doc.data_emissao ? format(new Date(doc.data_emissao), "dd/MM/yyyy") : "—"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {doc.data_validade ? format(new Date(doc.data_validade), "dd/MM/yyyy") : "—"}
                  {validityStatus && (
                    <Badge 
                      variant={validityStatus.variant === 'warning' ? 'outline' : validityStatus.variant}
                      className={validityStatus.variant === 'warning' ? 'border-yellow-500 text-yellow-600' : ''}
                    >
                      {validityStatus.status === 'expired' && <AlertTriangle className="h-3 w-3 mr-1" />}
                      {validityStatus.label}
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {doc.arquivo_url ? (
                  <Badge variant="secondary" className="text-green-600">
                    Anexado
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    Sem arquivo
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {doc.arquivo_url && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleView(doc.arquivo_url)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(doc.arquivo_url, doc.nome)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(doc.id)}
                    disabled={isDeleting}
                    title="Excluir"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
};
