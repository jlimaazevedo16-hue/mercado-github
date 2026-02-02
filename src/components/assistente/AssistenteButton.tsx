import { useState } from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { useUserRole } from "@/hooks/useUserRole";
import { AssistenteDrawer } from "./AssistenteDrawer";

export function AssistenteButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { role } = useUserRole();

  // Only show for admin users
  const isAdmin = role === "administrador_master" || role === "administrador";
  if (!isAdmin) return null;

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
        title="Assistente IA"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>

      <AssistenteDrawer open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
