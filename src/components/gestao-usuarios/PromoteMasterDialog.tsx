import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, AlertTriangle, Loader2, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PromoteMasterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUser: {
    user_id: string;
    nome: string;
    email: string;
  } | null;
  onSuccess: () => void;
}

export function PromoteMasterDialog({
  open,
  onOpenChange,
  targetUser,
  onSuccess,
}: PromoteMasterDialogProps) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePromote = async () => {
    if (!password) {
      setError("Digite sua senha para confirmar");
      return;
    }

    if (!targetUser) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke('promote-master', {
        body: {
          targetUserId: targetUser.user_id,
          password: password,
        }
      });

      if (fnError) throw fnError;

      if (data?.error) {
        setError(data.error);
        return;
      }

      toast.success(`${targetUser.nome} foi promovido a Administrador Master`);
      setPassword("");
      onOpenChange(false);
      onSuccess();
    } catch (err: any) {
      console.error("Promote error:", err);
      setError(err.message || "Erro ao promover usuário");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPassword("");
    setError("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            Promover a Administrador Master
          </DialogTitle>
          <DialogDescription>
            Você está prestes a promover <strong>{targetUser?.nome}</strong> ao cargo de Administrador Master.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning */}
          <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-700 dark:text-amber-300 text-sm">
              <strong>Atenção:</strong> Administradores Master têm acesso total ao sistema, incluindo:
              <ul className="list-disc ml-4 mt-2 space-y-1">
                <li>Gerenciar integrações e APIs</li>
                <li>Alterar valores da UFMS</li>
                <li>Promover outros usuários a Master</li>
                <li>Acessar todas as configurações</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Password Confirmation */}
          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Confirme sua senha
            </Label>
            <Input
              id="confirm-password"
              type="password"
              placeholder="Digite sua senha atual"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handlePromote()}
            />
            <p className="text-xs text-muted-foreground">
              Por segurança, confirme sua identidade digitando sua senha.
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handlePromote} 
            disabled={loading || !password}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Promovendo...
              </>
            ) : (
              <>
                <Shield className="h-4 w-4 mr-2" />
                Confirmar Promoção
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
