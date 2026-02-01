import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardStats } from "@/components/dashboard-geral/DashboardStats";
import { AlertsPanel } from "@/components/dashboard-geral/AlertsPanel";
import { DashboardCharts } from "@/components/dashboard-geral/DashboardCharts";
import { AlmoxarifadoCard } from "@/components/dashboard-geral/AlmoxarifadoCard";
import { ObservatorioCard } from "@/components/dashboard-geral/ObservatorioCard";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/export/ExportButton";
import { ExportDialog } from "@/components/export/ExportDialog";
import type { ExportColumn } from "@/lib/export";
import { useUserRole } from "@/hooks/useUserRole";

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState("dashboard");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const navigate = useNavigate();
  const { role, loading: roleLoading } = useUserRole();

  // Redirect lojistas to boxes page
  useEffect(() => {
    if (!roleLoading && role === 'lojista') {
      navigate('/boxes', { replace: true });
    }
  }, [role, roleLoading, navigate]);

  // Fetch summary data for export
  const { data: dashboardData } = useQuery({
    queryKey: ["dashboard-export-data"],
    queryFn: async () => {
      const [boxesRes, responsaveisRes, notificacoesRes] = await Promise.all([
        supabase.from("boxes").select("id, codigo, status, area_m2").order("codigo"),
        supabase.from("responsaveis").select("id, nome, status").eq("status", "ATIVO"),
        supabase.from("notificacoes").select("id, status").order("created_at", { ascending: false }).limit(100),
      ]);

      const boxes = boxesRes.data || [];
      const responsaveis = responsaveisRes.data || [];
      const notificacoes = notificacoesRes.data || [];

      return [{
        total_boxes: boxes.length,
        boxes_assinados: boxes.filter(b => b.status === "ASSINADO").length,
        boxes_disponiveis: boxes.filter(b => b.status === "DISPONIVEL").length,
        boxes_interditados: boxes.filter(b => b.status === "INTERDITADO").length,
        area_total_m2: boxes.reduce((sum, b) => sum + (b.area_m2 || 0), 0),
        total_responsaveis: responsaveis.length,
        notificacoes_pendentes: notificacoes.filter(n => n.status === "pendente").length,
        notificacoes_pads: notificacoes.filter(n => n.status === "pad_aberto").length,
      }];
    },
  });

  const exportColumns: ExportColumn[] = [
    { key: 'total_boxes', header: 'Total Boxes', width: 15 },
    { key: 'boxes_assinados', header: 'Assinados', width: 12 },
    { key: 'boxes_disponiveis', header: 'Disponíveis', width: 12 },
    { key: 'boxes_interditados', header: 'Interditados', width: 12 },
    { key: 'area_total_m2', header: 'Área Total (m²)', width: 15 },
    { key: 'total_responsaveis', header: 'Responsáveis Ativos', width: 18 },
    { key: 'notificacoes_pendentes', header: 'Notificações Pendentes', width: 18 },
    { key: 'notificacoes_pads', header: 'PADs Abertos', width: 15 },
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ 
      predicate: (query) => query.queryKey[0]?.toString().startsWith('dashboard') 
    });
    toast({ title: "Dashboard atualizado" });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-6 w-6 md:h-8 md:w-8 text-primary" />
                <div>
                  <h1 className="text-xl md:text-2xl font-bold">Dashboard</h1>
                  <p className="text-sm text-muted-foreground hidden md:block">
                    Visão geral do Mercado Municipal Digital
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="hidden md:inline ml-2">Atualizar</span>
                </Button>
                <ExportButton onClick={() => setShowExportDialog(true)} permissionKey="dashboard" />
              </div>
            </div>

            {/* Stats Cards */}
            <DashboardStats />

            {/* Module Cards: Almoxarifado & Observatorio */}
            <div className="grid gap-4 md:grid-cols-2">
              <AlmoxarifadoCard />
              <ObservatorioCard />
            </div>

            {/* Charts and Alerts Grid */}
            <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DashboardCharts />
              </div>
              <div className="lg:col-span-1">
                <AlertsPanel />
              </div>
            </div>
          </div>

          <ExportDialog
            open={showExportDialog}
            onOpenChange={setShowExportDialog}
            module="dashboard"
            title="Resumo Gerencial do Dashboard"
            columns={exportColumns}
            data={dashboardData || []}
            permissionKey="dashboard"
          />
        </main>
      </div>
    </div>
  );
}
