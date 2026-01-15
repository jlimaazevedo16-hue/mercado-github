import { FileText, ClipboardList, ChevronDown, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import logo from "@/assets/logo_associacao.jpeg";

export const Header = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  // Get user initials from email
  const getInitials = (email: string | undefined) => {
    if (!email) return 'U';
    return email.charAt(0).toUpperCase();
  };

  return (
    <header className="bg-header text-header-foreground h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <img src={logo} alt="Logo" className="h-12 w-auto rounded" />
        <div className="flex flex-col">
          <span className="text-lg font-bold leading-tight">Mercado Municipal Digital</span>
          <span className="text-xs text-header-foreground/70">Gestão de Permissionários</span>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <button className="flex items-center gap-2 hover:text-header-foreground/80 transition-colors">
          <ClipboardList size={18} />
          <span>Audit Logs</span>
        </button>
        <button className="flex items-center gap-2 hover:text-header-foreground/80 transition-colors">
          <FileText size={18} />
          <span>Exportar PDF</span>
        </button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer">
              <Avatar className="h-9 w-9">
                <AvatarImage src="" />
                <AvatarFallback>{getInitials(user?.email)}</AvatarFallback>
              </Avatar>
              <span className="font-medium max-w-[150px] truncate">{user?.email || 'Usuário'}</span>
              <ChevronDown size={16} />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
