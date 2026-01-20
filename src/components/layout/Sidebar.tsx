import { LayoutDashboard, Package, Users, FileText, Settings, Warehouse, Map, BarChart3, AlertTriangle, Bell, Calculator, Calendar, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/", permission: "dashboard" },
  { id: "boxes", label: "Boxes", icon: Package, path: "/", permission: "boxes" },
  { id: "planta-baixa", label: "Planta Baixa", icon: Map, path: "/planta-baixa", permission: "planta_baixa" },
  { id: "responsaveis", label: "Responsáveis", icon: Users, path: "/responsaveis", permission: "responsaveis" },
  { id: "documentos", label: "Documentos", icon: FileText, path: "/", permission: "documentos" },
  { id: "pendencias", label: "Pendências", icon: Bell, path: "/pendencias", permission: "pendencias" },
  { id: "notificacoes", label: "Notificações/PAD", icon: AlertTriangle, path: "/notificacoes", permission: "notificacoes" },
  { id: "frequencia", label: "Frequência", icon: Calendar, path: "/frequencia", permission: "frequencia" },
  { id: "almoxarifado", label: "Almoxarifado", icon: Warehouse, path: "/almoxarifado", permission: "almoxarifado" },
  { id: "observatorio", label: "Observatório", icon: BarChart3, path: "/observatorio", permission: "observatorio" },
  { id: "financeiro", label: "Financeiro", icon: DollarSign, path: "/financeiro", permission: "configuracoes" },
  { id: "configuracoes", label: "Configurações", icon: Calculator, path: "/configuracoes", permission: "configuracoes" },
  { id: "gestao-usuarios", label: "Gestão de Usuários", icon: Settings, path: "/gestao-usuarios", permission: "gestao_usuarios" },
];

export const Sidebar = ({ activeItem, onItemClick }: SidebarProps) => {
  const navigate = useNavigate();

  const handleItemClick = (item: typeof menuItems[0]) => {
    onItemClick(item.id);
    navigate(item.path);
  };

  return (
    <aside className="w-52 bg-sidebar text-sidebar-foreground flex flex-col min-h-screen">
      <nav className="flex-1 py-6">
        <ul className="space-y-1 px-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeItem === item.id;
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleItemClick(item)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-left ${
                    isActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover:bg-sidebar-accent/50"
                  }`}
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};
