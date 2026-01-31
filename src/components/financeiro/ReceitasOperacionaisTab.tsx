import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReceitasOperacionaisLista } from "./ReceitasOperacionaisLista";
import { TiposReceitaManager } from "./TiposReceitaManager";
import { ReceitasOperacionaisLogs } from "./ReceitasOperacionaisLogs";
import { FileText, Settings2, History } from "lucide-react";

export function ReceitasOperacionaisTab() {
  const [activeTab, setActiveTab] = useState("lancamentos");

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="lancamentos" className="gap-2">
            <FileText className="h-4 w-4" />
            Lançamentos
          </TabsTrigger>
          <TabsTrigger value="tipos" className="gap-2">
            <Settings2 className="h-4 w-4" />
            Tipos de Receita
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-2">
            <History className="h-4 w-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="lancamentos" className="mt-4">
          <ReceitasOperacionaisLista />
        </TabsContent>

        <TabsContent value="tipos" className="mt-4">
          <TiposReceitaManager />
        </TabsContent>

        <TabsContent value="logs" className="mt-4">
          <ReceitasOperacionaisLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}
