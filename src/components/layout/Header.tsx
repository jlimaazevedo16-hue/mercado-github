import { useState } from "react";
import { FileText, ClipboardList, ChevronDown, LogOut, Shield, User, Key, Mail } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserProfileDrawer } from "@/components/profile/UserProfileDrawer";
import { ChangePasswordDialog } from "@/components/profile/ChangePasswordDialog";
import { ForgotPasswordDialog } from "@/components/profile/ForgotPasswordDialog";
import logo from "@/assets/logo_associacao.jpeg";

export const Header = () => {
  const { signOut } = useAuth();
  const { role, isAdminMaster } = useUserRole();
  const { profile, displayName, initials } = useUserProfile();
  const navigate = useNavigate();

  const [profileDrawerOpen, setProfileDrawerOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const getRoleBadge = () => {
    if (isAdminMaster) {
      return (
        <Badge className="bg-amber-500 text-white flex items-center gap-1 text-xs">
          <Shield className="h-3 w-3" />
          Admin Master
        </Badge>
      );
    }
    if (role === 'administrador') {
      return <Badge variant="default" className="text-xs">Administrador</Badge>;
    }
    if (role === 'fiscal') {
      return <Badge variant="secondary" className="text-xs">Fiscal</Badge>;
    }
    if (role === 'funcionario') {
      return <Badge variant="outline" className="text-xs">Funcionário</Badge>;
    }
    return null;
  };

  return (
    <>
      <header className="bg-header text-header-foreground h-16 flex items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Logo" className="h-10 md:h-12 w-auto rounded" />
          <div className="flex flex-col">
            <span className="text-sm md:text-lg font-bold leading-tight">Mercado Municipal Digital</span>
            <span className="text-xs text-header-foreground/70 hidden sm:block">Gestão de Permissionários</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-6">
          <button className="hidden lg:flex items-center gap-2 hover:text-header-foreground/80 transition-colors">
            <ClipboardList size={18} />
            <span>Audit Logs</span>
          </button>
          <button className="hidden lg:flex items-center gap-2 hover:text-header-foreground/80 transition-colors">
            <FileText size={18} />
            <span>Exportar PDF</span>
          </button>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="flex items-center gap-2 cursor-pointer hover:opacity-90 transition-opacity">
                <Avatar className="h-9 w-9 border-2 border-header-foreground/20">
                  <AvatarImage src={profile?.foto_url || ""} alt={displayName} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden sm:flex flex-col items-start">
                  <span className="font-medium max-w-[120px] truncate text-sm">{displayName}</span>
                  {getRoleBadge()}
                </div>
                <ChevronDown size={16} className="hidden sm:block" />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-2 sm:hidden">
                <p className="font-medium text-sm truncate">{displayName}</p>
                <div className="mt-1">{getRoleBadge()}</div>
              </div>
              <DropdownMenuSeparator className="sm:hidden" />
              
              <DropdownMenuItem 
                onClick={() => setProfileDrawerOpen(true)} 
                className="cursor-pointer"
              >
                <User className="mr-2 h-4 w-4" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setChangePasswordOpen(true)} 
                className="cursor-pointer"
              >
                <Key className="mr-2 h-4 w-4" />
                <span>Alterar Senha</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onClick={() => setForgotPasswordOpen(true)} 
                className="cursor-pointer"
              >
                <Mail className="mr-2 h-4 w-4" />
                <span>Recuperar Senha</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem 
                onClick={handleSignOut} 
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <UserProfileDrawer 
        open={profileDrawerOpen} 
        onOpenChange={setProfileDrawerOpen} 
      />
      <ChangePasswordDialog 
        open={changePasswordOpen} 
        onOpenChange={setChangePasswordOpen} 
      />
      <ForgotPasswordDialog 
        open={forgotPasswordOpen} 
        onOpenChange={setForgotPasswordOpen} 
      />
    </>
  );
};
