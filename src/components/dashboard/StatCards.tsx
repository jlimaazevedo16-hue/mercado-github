import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, CheckCircle, AlertTriangle, XCircle, Users } from "lucide-react";

interface StatCardProps {
  label: string;
  value: number;
  variant: "active" | "available" | "reform" | "blocked" | "total";
  icon: React.ReactNode;
  loading?: boolean;
}

const StatCard = ({ label, value, variant, icon, loading }: StatCardProps) => {
  const variantClasses = {
    active: "stat-card-active",
    available: "stat-card-available",
    reform: "stat-card-reform",
    blocked: "stat-card-blocked",
    total: "bg-primary text-primary-foreground",
  };

  return (
    <div className={`stat-card ${variantClasses[variant]}`}>
      <div>
        <p className="text-sm font-medium opacity-90">{label}</p>
        <p className="text-3xl font-bold mt-1">
          {loading ? "..." : value}
        </p>
      </div>
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
        {icon}
      </div>
    </div>
  );
};

export const StatCards = () => {
  // Fetch box statistics
  const { data: boxStats, isLoading: loadingBoxes } = useQuery({
    queryKey: ["dashboard-box-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("status");
      
      if (error) throw error;
      
      const stats = {
        total: data?.length || 0,
        assinado: 0,
        disponivel: 0,
        processo: 0,
        interditado: 0,
        outros: 0,
      };

      data?.forEach((box) => {
        switch (box.status) {
          case 'ASSINADO':
            stats.assinado++;
            break;
          case 'DISPONIVEL':
            stats.disponivel++;
            break;
          case 'PROCESSO':
            stats.processo++;
            break;
          case 'INTERDITADO':
          case 'CANCELADO':
          case 'DESATIVADO':
            stats.interditado++;
            break;
          default:
            stats.outros++;
        }
      });

      return stats;
    }
  });

  // Fetch responsaveis count
  const { data: respCount, isLoading: loadingResp } = useQuery({
    queryKey: ["dashboard-resp-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("responsaveis")
        .select("*", { count: 'exact', head: true })
        .eq("status", "ATIVO");
      
      if (error) throw error;
      return count || 0;
    }
  });

  // Fetch boxes with pending documents (no documents or expired)
  const { data: pendingDocs, isLoading: loadingPending } = useQuery({
    queryKey: ["dashboard-pending-docs"],
    queryFn: async () => {
      // Get all boxes
      const { data: boxes, error: boxError } = await supabase
        .from("boxes")
        .select("id")
        .in("status", ["ASSINADO", "PROCESSO"]);
      
      if (boxError) throw boxError;

      // Get document counts per box
      const { data: docs, error: docError } = await supabase
        .from("box_documents")
        .select("box_id");
      
      if (docError) throw docError;

      // Count boxes without any documents
      const boxesWithDocs = new Set(docs?.map(d => d.box_id) || []);
      const boxesWithoutDocs = boxes?.filter(b => !boxesWithDocs.has(b.id)).length || 0;

      return boxesWithoutDocs;
    }
  });

  const stats = [
    { 
      label: "Ativos (Assinados)", 
      value: boxStats?.assinado || 0, 
      variant: "active" as const,
      icon: <CheckCircle className="h-6 w-6 text-white/80" />,
      loading: loadingBoxes 
    },
    { 
      label: "Disponíveis", 
      value: boxStats?.disponivel || 0, 
      variant: "available" as const,
      icon: <Package className="h-6 w-6 text-white/80" />,
      loading: loadingBoxes 
    },
    { 
      label: "Em Processo", 
      value: boxStats?.processo || 0, 
      variant: "reform" as const,
      icon: <AlertTriangle className="h-6 w-6 text-white/80" />,
      loading: loadingBoxes 
    },
    { 
      label: "Interditados", 
      value: boxStats?.interditado || 0, 
      variant: "blocked" as const,
      icon: <XCircle className="h-6 w-6 text-white/80" />,
      loading: loadingBoxes 
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card rounded-lg p-4 shadow-sm border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Package className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total de Boxes</p>
            <p className="text-2xl font-bold">{loadingBoxes ? "..." : boxStats?.total}</p>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-4 shadow-sm border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Users className="h-6 w-6 text-blue-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Responsáveis Ativos</p>
            <p className="text-2xl font-bold">{loadingResp ? "..." : respCount}</p>
          </div>
        </div>
        
        <div className="bg-card rounded-lg p-4 shadow-sm border flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-yellow-500" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Sem Documentos</p>
            <p className="text-2xl font-bold">{loadingPending ? "..." : pendingDocs}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
