import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, X } from "lucide-react";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { toast } from "sonner";

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUploadComplete: (documentData: {
    nome: string;
    tipo: string;
    descricao: string;
    data_emissao: string;
    data_validade: string;
    arquivo_url: string;
  }) => void;
  entityType: 'box' | 'responsavel';
  entityId: string;
}

const DOCUMENT_TYPES = [
  { value: "Alvará", label: "Alvará" },
  { value: "Certificado", label: "Certificado" },
  { value: "Curso", label: "Curso" },
  { value: "Contrato", label: "Contrato" },
  { value: "Licença", label: "Licença" },
  { value: "Comprovante", label: "Comprovante" },
  { value: "RG", label: "RG" },
  { value: "CPF", label: "CPF" },
  { value: "Comprovante de Residência", label: "Comprovante de Residência" },
  { value: "Outro", label: "Outro" },
];

export const DocumentUploadDialog = ({
  open,
  onOpenChange,
  onUploadComplete,
  entityType,
  entityId,
}: DocumentUploadDialogProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadDocument, uploading, progress } = useDocumentUpload();
  
  const [formData, setFormData] = useState({
    nome: "",
    tipo: "",
    descricao: "",
    data_emissao: "",
    data_validade: "",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return;
      }
      setSelectedFile(file);
      // Auto-fill document name if empty
      if (!formData.nome) {
        setFormData(prev => ({ ...prev, nome: file.name.split('.')[0] }));
      }
    }
  };

  const handleSubmit = async () => {
    if (!formData.nome) {
      toast.error("Nome do documento é obrigatório");
      return;
    }

    if (!selectedFile) {
      toast.error("Selecione um arquivo para upload");
      return;
    }

    const folder = `${entityType}/${entityId}`;
    const result = await uploadDocument(selectedFile, folder);

    if (result) {
      onUploadComplete({
        ...formData,
        arquivo_url: result.url,
      });
      
      // Reset form
      setFormData({ nome: "", tipo: "", descricao: "", data_emissao: "", data_validade: "" });
      setSelectedFile(null);
      toast.success("Documento enviado com sucesso!");
    } else {
      toast.error("Erro ao enviar documento. Verifique se está autenticado.");
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFormData({ nome: "", tipo: "", descricao: "", data_emissao: "", data_validade: "" });
      setSelectedFile(null);
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Documento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Upload Area */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
              selectedFile ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif"
            />
            
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="h-8 w-8 text-primary" />
                <div className="text-left">
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(selectedFile.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="ml-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Clique para selecionar ou arraste um arquivo
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF, DOC, DOCX, JPG, PNG (max 10MB)
                </p>
              </>
            )}
          </div>

          {uploading && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-center text-muted-foreground">
                Enviando... {progress}%
              </p>
            </div>
          )}

          <div>
            <Label>Nome do Documento *</Label>
            <Input
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              placeholder="Ex: Contrato de Locação 2025"
            />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData({ ...formData, tipo: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição opcional do documento"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Data de Emissão</Label>
              <Input
                type="date"
                value={formData.data_emissao}
                onChange={(e) => setFormData({ ...formData, data_emissao: e.target.value })}
              />
            </div>
            <div>
              <Label>Data de Validade</Label>
              <Input
                type="date"
                value={formData.data_validade}
                onChange={(e) => setFormData({ ...formData, data_validade: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleClose}
              disabled={uploading}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleSubmit}
              disabled={!formData.nome || !selectedFile || uploading}
            >
              {uploading ? "Enviando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
