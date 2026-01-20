import { useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { FinancialDashboard } from "@/components/dashboard/FinancialDashboard";
import { DollarSign } from "lucide-react";

const DashboardFinanceiro = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("financeiro");

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="mb-6">
            <div className="flex items-center gap-3">
              <DollarSign className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Dashboard Financeiro</h1>
                <p className="text-muted-foreground">
                  Visão consolidada de receitas, inadimplência e projeções financeiras
                </p>
              </div>
            </div>
          </div>

          <FinancialDashboard />
        </main>
      </div>
    </div>
  );
};

export default DashboardFinanceiro;
