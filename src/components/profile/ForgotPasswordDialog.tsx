import { useState } from "react";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useAuth } from "@/hooks/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mail, MessageSquare, Loader2, CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ForgotPasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ForgotPasswordDialog({ open, onOpenChange }: ForgotPasswordDialogProps) {
  const { user } = useAuth();
  const { requestPasswordReset, isRequestingReset } = useUserProfile();
  
  const [email, setEmail] = useState(user?.email || "");
  const [sent, setSent] = useState(false);
  const [activeTab, setActiveTab] = useState("email");

  const handleEmailReset = () => {
    requestPasswordReset(email, {
      onSuccess: () => {
        setSent(true);
      },
    });
  };

  const handleClose = () => {
    onOpenChange(false);
    setSent(false);
    setActiveTab("email");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Recuperar Senha</DialogTitle>
          <DialogDescription>
            Escolha como deseja receber o link de recuperação
          </DialogDescription>
        </DialogHeader>

        {sent ? (
          <div className="py-6 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Email enviado!</h3>
              <p className="text-sm text-muted-foreground">
                Verifique sua caixa de entrada em <strong>{email}</strong> e siga as instruções para redefinir sua senha.
              </p>
            </div>
            <Button onClick={handleClose} className="w-full">
              Fechar
            </Button>
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="whatsapp" className="gap-2" disabled>
                <MessageSquare className="h-4 w-4" />
                WhatsApp
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="recovery-email">Email</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="outline" onClick={handleClose}>
                  Cancelar
                </Button>
                <Button onClick={handleEmailReset} disabled={isRequestingReset || !email}>
                  {isRequestingReset && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Enviar Link
                </Button>
              </DialogFooter>
            </TabsContent>

            <TabsContent value="whatsapp" className="space-y-4 mt-4">
              <Alert>
                <MessageSquare className="h-4 w-4" />
                <AlertDescription>
                  A recuperação via WhatsApp estará disponível em breve. Por enquanto, utilize a opção de email.
                </AlertDescription>
              </Alert>

              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Fechar
                </Button>
              </DialogFooter>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
