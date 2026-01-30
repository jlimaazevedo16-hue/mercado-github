import { useState } from "react";
import { LayoutDashboard, Package, Users, FileText, Settings, Warehouse, Map, BarChart3, AlertTriangle, Bell, Calculator, Calendar, DollarSign, MessageCircle, Menu, X, ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
  { id: "frequencia", label: "Frequência", icon: Calendar, path: "/frequencia", permission: "frequencia" },
  { id: "almoxarifado", label: "Almoxarifado", icon: Warehouse, path: "/almoxarifado", permission: "almoxarifado" },
  { id: "observatorio", label: "Observatório", icon: BarChart3, path: "/observatorio", permission: "observatorio" },
  { id: "financeiro", label: "Financeiro", icon: DollarSign, path: "/financeiro", permission: "financeiro" },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, path: "/whatsapp", permission: "whatsapp" },
  { id: "configuracoes", label: "Configurações", icon: Calculator, path: "/configuracoes", permission: "configuracoes" },
  { id: "gestao-usuarios", label: "Gestão de Usuários", icon: Settings, path: "/gestao-usuarios", permission: "gestao_usuarios" },
];

export const Sidebar = ({ activeItem, onItemClick }: SidebarProps) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

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
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeItem === item.id;
          return (
            <li key={item.id}>
              <button
                onClick={() => handleItemClick(item)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "hover:bg-sidebar-accent/50",
                  !showLabels && "justify-center px-2"
                )}
                title={!showLabels ? item.label : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {showLabels && <span className="font-medium">{item.label}</span>}
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
          <SheetContent side="left" className="w-64 p-0 bg-sidebar text-sidebar-foreground">
            <div className="flex items-center justify-between px-4 py-4 border-b border-sidebar-border">
              <span className="font-semibold text-lg">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </Button>
            </div>
            <MenuContent />
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