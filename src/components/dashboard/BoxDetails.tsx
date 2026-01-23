import { X, MoreHorizontal, List, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

interface BoxDetailsProps {
  box: {
    id: string;
    boxId: string;
    bloco: string;
    tipo: string;
    segmento?: string;
    area?: number;
    status: string;
    fotoUrl?: string;
  };
  onClose: () => void;
}

export const BoxDetails = ({ box, onClose }: BoxDetailsProps) => {
  // Fetch responsável data from database
  const { data: responsavelData, isLoading: isLoadingResponsavel } = useQuery({
    queryKey: ["box-responsavel", box.boxId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select(`
          responsavel_id,
          responsaveis (
            id,
            nome,
            cpf,
            telefone,
            imagem_url
          )
        `)
        .eq("id", box.boxId)
        .maybeSingle();
      
      if (error) throw error;
      return data?.responsaveis;
    },
    enabled: !!box.boxId,
  });

  // Fetch documents count
  const { data: docsCount = 0 } = useQuery({
    queryKey: ["box-docs-count", box.boxId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("box_documents")
        .select("*", { count: "exact", head: true })
        .eq("box_id", box.boxId);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!box.boxId,
  });

  const maskCpf = (cpf: string | null) => {
    if (!cpf) return "—";
    return `***${cpf.slice(3, 6)}.${cpf.slice(6, 9)}-**`;
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="text-lg font-semibold">Box {box.id}</h2>
        <div className="flex items-center gap-1">
          <button className="p-2 hover:bg-muted rounded-md transition-colors">
            <MoreHorizontal size={18} className="text-muted-foreground" />
          </button>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-md transition-colors"
          >
            <X size={18} className="text-muted-foreground" />
          </button>
        </div>
      </div>

      <Tabs defaultValue="dados" className="flex-1 flex flex-col">
        <TabsList className="w-full justify-start px-4 pt-2 bg-transparent border-b border-border rounded-none h-auto pb-0">
          <TabsTrigger 
            value="dados" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3"
          >
            Dados
          </TabsTrigger>
          <TabsTrigger 
            value="documentos"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3"
          >
            Documentos ({docsCount})
          </TabsTrigger>
          <TabsTrigger 
            value="responsaveis"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3"
          >
            Responsáveis
          </TabsTrigger>
          <TabsTrigger 
            value="historico"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none pb-3"
          >
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="flex-1 p-4 mt-0 overflow-auto">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Dados do Box</h3>
              <div className="space-y-2 text-sm">
                <div className="flex">
                  <span className="text-muted-foreground w-24">Bloco:</span>
                  <span className="text-foreground">{box.bloco || "—"}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Setor:</span>
                  <span className="text-foreground">{box.tipo || "—"}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Segmento:</span>
                  <span className="text-foreground">{box.segmento || "—"}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Área:</span>
                  <span className="text-foreground">{box.area ? `${box.area} m²` : "—"}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground w-24">Status:</span>
                  <span className="status-badge status-active">{box.status}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Foto do Box</h3>
              {box.fotoUrl ? (
                <img 
                  src={box.fotoUrl}
                  alt="Foto do box"
                  className="w-full h-32 object-cover rounded-lg"
                />
              ) : (
                <div className="w-full h-32 bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground text-sm">Sem foto</span>
                </div>
              )}
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Responsável</h3>
              {isLoadingResponsavel ? (
                <div className="space-y-3">
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : responsavelData ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={(responsavelData as any)?.imagem_url || undefined} />
                      <AvatarFallback>
                        {(responsavelData as any)?.nome?.substring(0, 2).toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">{(responsavelData as any)?.nome}</p>
                      <p className="text-xs text-muted-foreground">CPF {maskCpf((responsavelData as any)?.cpf)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                      <List size={14} className="text-muted-foreground" />
                    </button>
                    <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                      <Pencil size={14} className="text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum responsável vinculado</p>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="flex-1 p-4 mt-0">
          <p className="text-muted-foreground">
            {docsCount > 0 
              ? `${docsCount} documento(s) cadastrado(s)` 
              : "Nenhum documento cadastrado"}
          </p>
        </TabsContent>

        <TabsContent value="responsaveis" className="flex-1 p-4 mt-0">
          {isLoadingResponsavel ? (
            <Skeleton className="h-12 w-full" />
          ) : responsavelData ? (
            <div className="space-y-3">
                <div className="flex items-center gap-3 p-2 bg-muted/50 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={(responsavelData as any)?.imagem_url || undefined} />
                  <AvatarFallback>
                    {(responsavelData as any)?.nome?.substring(0, 2).toUpperCase() || "?"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="text-sm font-medium">{(responsavelData as any)?.nome}</p>
                  <p className="text-xs text-muted-foreground">{(responsavelData as any)?.telefone || "Sem telefone"}</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Nenhum responsável vinculado</p>
          )}
        </TabsContent>

        <TabsContent value="historico" className="flex-1 p-4 mt-0">
          <p className="text-muted-foreground">Histórico de alterações</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
