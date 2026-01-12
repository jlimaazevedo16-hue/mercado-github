import { X, MoreHorizontal, List, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BoxDetailsProps {
  box: {
    id: string;
    bloco: string;
    tipo: string;
    segmento?: string;
    area?: string;
    status: string;
  };
  onClose: () => void;
}

interface Responsavel {
  nome: string;
  cpf: string;
  avatar?: string;
}

const responsaveis: Responsavel[] = [
  { nome: "Ana Souza", cpf: "***1.24.557-89", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face" },
  { nome: "João Lima", cpf: "***1.997.654-32", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face" },
];

export const BoxDetails = ({ box, onClose }: BoxDetailsProps) => {
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
            Documentos
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
                  <span className="text-foreground">{box.bloco}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Tipo:</span>
                  <span className="text-foreground">{box.tipo}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Segmento:</span>
                  <span className="text-foreground">{box.segmento || "Floricultura"}</span>
                </div>
                <div className="flex">
                  <span className="text-muted-foreground w-24">Área:</span>
                  <span className="text-foreground">{box.area || "20 m²"}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-muted-foreground w-24">Status:</span>
                  <span className="status-badge status-active">{box.status}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Foto do Box</h3>
              <img 
                src="https://images.unsplash.com/photo-1487530811176-3780de880c2d?w=400&h=200&fit=crop"
                alt="Foto do box"
                className="w-full h-32 object-cover rounded-lg"
              />
            </div>

            <div>
              <h3 className="font-semibold text-foreground mb-3">Responsáveis</h3>
              <div className="space-y-3">
                {responsaveis.map((resp, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={resp.avatar} />
                        <AvatarFallback>{resp.nome.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground">{resp.nome} <span className="text-muted-foreground">*** 267-89</span></p>
                        <p className="text-xs text-muted-foreground">CPF {resp.cpf}</p>
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
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="documentos" className="flex-1 p-4 mt-0">
          <p className="text-muted-foreground">Documentos do box</p>
        </TabsContent>

        <TabsContent value="responsaveis" className="flex-1 p-4 mt-0">
          <p className="text-muted-foreground">Lista de responsáveis</p>
        </TabsContent>

        <TabsContent value="historico" className="flex-1 p-4 mt-0">
          <p className="text-muted-foreground">Histórico de alterações</p>
        </TabsContent>
      </Tabs>
    </div>
  );
};
