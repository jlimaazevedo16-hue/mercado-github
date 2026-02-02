import { useState } from "react";
import { LayoutDashboard, Package, Users, FileText, Settings, Warehouse, Map, BarChart3, AlertTriangle, Bell, Calendar, DollarSign, MessageCircle, Menu, X, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { useLojistaPendencias } from "@/hooks/useLojistaPendencias";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", permission: "dashboard" },
  { id: "boxes", label: "Boxes", icon: Package, path: "/boxes", permission: "boxes" },
  { id: "planta-baixa", label: "Planta Baixa", icon: Map, path: "/planta-baixa", permission: "planta_baixa" },
  { id: "responsaveis", label: "Responsáveis", icon: Users, path: "/responsaveis", permission: "responsaveis" },
  { id: "documentos", label: "Documentos", icon: FileText, path: "/documentos", permission: "documentos" },
  { id: "pendencias", label: "Pendências", icon: Bell, path: "/pendencias", permission: "pendencias" },
  { id: "notificacoes", label: "Notificações/PAD", icon: AlertTriangle, path: "/notificacoes", permission: "notificacoes" },
  { id: "frequencia", label: "Reuniões/Assembleias", icon: Calendar, path: "/frequencia", permission: "frequencia" },
  { id: "almoxarifado", label: "Almoxarifado", icon: Warehouse, path: "/almoxarifado", permission: "almoxarifado" },
  { id: "observatorio", label: "Observatório", icon: BarChart3, path: "/observatorio", permission: "observatorio" },
  { id: "financeiro", label: "Financeiro", icon: DollarSign, path: "/financeiro", permission: "financeiro" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, path: "/whatsapp", permission: "whatsapp" },
  { id: "configuracoes", label: "Configurações", icon: Settings, path: "/configuracoes", permission: "configuracoes" },
];

export const Sidebar = ({ activeItem, onItemClick }: SidebarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { hasPermission, role } = useUserRole();
  const isLojista = role === 'lojista';
  
  // Get pendencias for lojista badges
  const { 
    total: totalPendencias, 
    totalNotificacoes, 
    totalDocumentosVencidos, 
    totalDocumentosVencendo 
  } = useLojistaPendencias();

  // Calculate badge counts per menu item for lojista
  const getBadgeCount = (menuId: string): number => {
    if (!isLojista) return 0;
    
    switch (menuId) {
      case 'boxes':
        return totalPendencias;
      case 'pendencias':
        return totalNotificacoes + totalDocumentosVencidos + totalDocumentosVencendo;
      case 'documentos':
        return totalDocumentosVencidos + totalDocumentosVencendo;
      default:
        return 0;
    }
  };

  // Filter menu items based on user permissions
  const visibleMenuItems = menuItems.filter(item => hasPermission(item.permission, 'view'));

  const handleItemClick = (item: typeof menuItems[0]) => {
    onItemClick(item.id);
    navigate(item.path);
    if (isMobile) {
      setIsOpen(false);
    }
  };

  const MenuContent = ({ showLabels = true }: { showLabels?: boolean }) => (
    <nav className="flex-1 py-6">
      <ul className="space-y-1 px-3">
        {visibleMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          const badgeCount = getBadgeCount(item.id);
          
          return (
            <li key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left relative",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50",
                  !showLabels && "justify-center px-2"
                )}
                title={!showLabels ? item.label : undefined}
              >
                <div className="relative">
                  <Icon size={20} className="flex-shrink-0" />
                  {/* Badge indicator for collapsed state */}
                  {!showLabels && badgeCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white animate-pulse">
                      {badgeCount > 9 ? '9+' : badgeCount}
                    </span>
                  )}
                </div>
                {showLabels && (
                  <>
                    <span className="font-medium flex-1">{item.label}</span>
                    {/* Badge for expanded state */}
                    {badgeCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="ml-auto h-5 min-w-5 px-1.5 text-xs animate-pulse"
                      >
                        {badgeCount > 99 ? '99+' : badgeCount}
                      </Badge>
                    )}
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );

  // Mobile: Sheet/Drawer
  if (isMobile) {
    return (
      <>
        {/* Floating Menu Button */}
        <Button
          variant="outline"
          size="icon"
          className="fixed bottom-4 left-4 z-50 h-12 w-12 rounded-full shadow-lg bg-sidebar text-sidebar-foreground border-sidebar-border"
          onClick={() => setIsOpen(true)}
        >
          <Menu size={24} />
        </Button>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border flex-shrink-0">
              <span className="font-semibold text-lg">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <MenuContent />
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  // Desktop: Collapsible Sidebar
  return (
    <aside 
      className={cn(
        "bg-sidebar text-sidebar-foreground flex flex-col min-h-screen transition-all duration-300 relative",
        isCollapsed ? "w-16" : "w-52"
      )}
    >
      {/* Collapse Toggle */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 z-10 w-6 h-6 rounded-full bg-sidebar-accent text-sidebar-accent-foreground flex items-center justify-center shadow-md hover:bg-sidebar-accent/80 transition-colors"
        title={isCollapsed ? "Expandir menu" : "Recolher menu"}
      >
        <ChevronLeft 
          size={14} 
          className={cn(
            "transition-transform duration-300",
            isCollapsed && "rotate-180"
          )} 
        />
      </button>

      <MenuContent showLabels={!isCollapsed} />
    </aside>
  );
};