import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { MapPin, User, Building2, Ruler, Activity, Calendar, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tables } from "@/integrations/supabase/types";

interface BoxDetailsDialogProps {
  box: Tables<"boxes"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAdmin?: boolean;
}

const statusLabels: Record<string, { label: string; color: string }> = {
  ASSINADO: { label: "Assinado", color: "bg-green-500" },
  DISPONIVEL: { label: "Disponível", color: "bg-blue-500" },
  PROCESSO: { label: "Em Processo", color: "bg-yellow-500" },
  CANCELADO: { label: "Cancelado", color: "bg-red-500" },
  DESATIVADO: { label: "Desativado", color: "bg-gray-500" },
  DEVOLVIDO: { label: "Devolvido", color: "bg-purple-500" },
  INTERDITADO: { label: "Interditado", color: "bg-orange-500" },
};

export const BoxDetailsDialog = ({ box, open, onOpenChange, isAdmin = false }: BoxDetailsDialogProps) => {
  if (!box) return null;

  const statusInfo = statusLabels[box.status] || { label: box.status, color: "bg-gray-500" };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">
              Box {box.codigo}
            </DialogTitle>
            <Badge className={`${statusInfo.color} text-white`}>
              {statusInfo.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações Principais */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Building2 className="w-4 h-4" />
                <span>Nome</span>
              </div>
              <p className="font-medium">{box.boxe}</p>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4" />
                <span>Setor</span>
              </div>
              <p className="font-medium">{box.setor || "Não definido"}</p>
            </div>
          </div>

          <Separator />

          {/* Inquilino */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <User className="w-4 h-4" />
              <span>Inquilino</span>
            </div>
            <p className="font-medium">{box.inquilino || "Sem inquilino"}</p>
          </div>

          {/* Área */}
          {box.area_m2 && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Ruler className="w-4 h-4" />
                <span>Área</span>
              </div>
              <p className="font-medium">{box.area_m2} m²</p>
            </div>
          )}

          {/* Atividades */}
          {box.atividades && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground text-sm">
                <Activity className="w-4 h-4" />
                <span>Atividades</span>
              </div>
              <p className="font-medium">{box.atividades}</p>
            </div>
          )}

          <Separator />

          {/* Datas */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Criado em</span>
              </div>
              <p>{format(new Date(box.created_at), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>Atualizado em</span>
              </div>
              <p>{format(new Date(box.updated_at), "dd/MM/yyyy", { locale: ptBR })}</p>
            </div>
          </div>

          {/* Imagem */}
          {box.imagem_url && (
            <>
              <Separator />
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Imagem</p>
                <img 
                  src={box.imagem_url} 
                  alt={`Box ${box.codigo}`}
                  className="w-full h-48 object-cover rounded-lg"
                />
              </div>
            </>
          )}

          {/* Aviso para funcionalidades de admin */}
          {!isAdmin && (
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              <Lock className="w-4 h-4" />
              <span>Edição disponível apenas para administradores</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
