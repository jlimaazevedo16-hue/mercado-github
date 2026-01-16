import { LayoutDashboard, Package, Users, FileText, Settings, Warehouse, Map, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
}

const menuItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/" },
  { id: "boxes", label: "Boxes", icon: Package, path: "/" },
  { id: "planta-baixa", label: "Planta Baixa", icon: Map, path: "/planta-baixa" },
  { id: "responsaveis", label: "Responsáveis", icon: Users, path: "/responsaveis" },
  { id: "documentos", label: "Documentos", icon: FileText, path: "/" },
  { id: "almoxarifado", label: "Almoxarifado", icon: Warehouse, path: "/almoxarifado" },
  { id: "observatorio", label: "Observatório", icon: BarChart3, path: "/observatorio" },
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
      <div className="px-3 pb-6">
        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent/50 transition-colors">
          <Settings size={20} />
          <span className="font-medium">Configurações</span>
        </button>
      </div>
    </aside>
  );
};
