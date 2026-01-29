import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { DashboardStats } from "@/components/dashboard-geral/DashboardStats";
import { AlertsPanel } from "@/components/dashboard-geral/AlertsPanel";
import { DashboardCharts } from "@/components/dashboard-geral/DashboardCharts";
import { LayoutDashboard, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const [activeItem, setActiveItem] = useState("dashboard");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

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
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LayoutDashboard className="h-8 w-8 text-primary" />
                <div>
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  <p className="text-muted-foreground">
                    Visão geral do Mercado Municipal Digital
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>

            {/* Stats Cards */}
            <DashboardStats />

            {/* Charts and Alerts Grid */}
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-2">
                <DashboardCharts />
              </div>
              <div className="lg:col-span-1">
                <AlertsPanel />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
