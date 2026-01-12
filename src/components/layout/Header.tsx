import { FileText, ClipboardList, ChevronDown, Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Header = () => {
  return (
    <header className="bg-header text-header-foreground h-16 flex items-center justify-between px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Building2 size={28} />
          <span className="text-xl font-bold">Mercado Municipal Digital</span>
        </div>
        <span className="text-header-foreground/60 px-2">|</span>
        <span className="text-header-foreground/80">Gestão de Permissionários</span>
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
        <div className="flex items-center gap-2 cursor-pointer">
          <Avatar className="h-9 w-9">
            <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face" />
            <AvatarFallback>AD</AvatarFallback>
          </Avatar>
          <span className="font-medium">Admin</span>
          <ChevronDown size={16} />
        </div>
      </div>
    </header>
  );
};
