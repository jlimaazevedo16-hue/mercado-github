import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { BoxDetailsDialog } from "@/components/planta-baixa/BoxDetailsDialog";
import { Tables } from "@/integrations/supabase/types";

const statusColors: Record<string, { bg: string; text: string; glow: string }> = {
  ASSINADO: { bg: "bg-green-500", text: "text-green-100", glow: "shadow-green-500/50" },
  DISPONIVEL: { bg: "bg-blue-500", text: "text-blue-100", glow: "shadow-blue-500/50" },
  PROCESSO: { bg: "bg-yellow-500", text: "text-yellow-100", glow: "shadow-yellow-500/50" },
  CANCELADO: { bg: "bg-red-500", text: "text-red-100", glow: "shadow-red-500/50" },
  DESATIVADO: { bg: "bg-gray-500", text: "text-gray-100", glow: "shadow-gray-500/50" },
  DEVOLVIDO: { bg: "bg-purple-500", text: "text-purple-100", glow: "shadow-purple-500/50" },
  INTERDITADO: { bg: "bg-orange-500", text: "text-orange-100", glow: "shadow-orange-500/50" },
};

const PlantaBaixa = () => {
  const [activeMenuItem, setActiveMenuItem] = useState("planta-baixa");
  const [zoom, setZoom] = useState(1);
  const [plantaImage, setPlantaImage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<Tables<"boxes"> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: boxes } = useQuery({
    queryKey: ["boxes-planta"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("*")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Arquivo muito grande. Máximo 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPlantaImage(event.target?.result as string);
        toast.success("Planta baixa carregada!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.5));
  const handleResetZoom = () => setZoom(1);

  const handleBoxClick = (box: Tables<"boxes">) => {
    setSelectedBox(box);
    setDialogOpen(true);
  };

  const filteredBoxes = selectedStatus
    ? boxes?.filter((box) => box.status === selectedStatus)
    : boxes;

  const statusCounts = boxes?.reduce((acc, box) => {
    acc[box.status] = (acc[box.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) ?? {};

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <h1 className="text-2xl font-bold mb-6">Planta Baixa</h1>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar com legenda e controles */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Legenda de Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(statusColors).map(([status, colors]) => {
                    const count = statusCounts[status] || 0;
                    const isSelected = selectedStatus === status;
                    return (
                      <button
                        key={status}
                        onClick={() => setSelectedStatus(isSelected ? null : status)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${
                          isSelected ? "ring-2 ring-primary" : "hover:bg-muted"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${colors.bg} shadow-lg ${colors.glow}`} />
                          <span className="text-sm">{status}</span>
                        </div>
                        <Badge variant="secondary">{count}</Badge>
                      </button>
                    );
                  })}
                  {selectedStatus && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedStatus(null)}
                    >
                      Limpar Filtro
                    </Button>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Carregar Planta</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label htmlFor="planta-upload" className="cursor-pointer">
                      <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-primary transition-colors">
                        <Upload className="w-4 h-4" />
                        <span className="text-sm">Selecionar imagem</span>
                      </div>
                    </Label>
                    <Input
                      id="planta-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageUpload}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PNG, JPG, SVG. Máx: 10MB
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Controles de Zoom</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={handleZoomOut}>
                      <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="flex-1 text-center text-sm">{Math.round(zoom * 100)}%</span>
                    <Button variant="outline" size="icon" onClick={handleZoomIn}>
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={handleResetZoom}>
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Área principal da planta */}
            <div className="lg:col-span-3">
              <Card className="h-[calc(100vh-240px)] overflow-hidden">
                <CardContent className="p-4 h-full">
                  {plantaImage ? (
                    <div className="w-full h-full overflow-auto">
                      <div
                        style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
                        className="transition-transform duration-200"
                      >
                        <img
                          src={plantaImage}
                          alt="Planta Baixa"
                          className="max-w-none"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground">
                      <div className="grid grid-cols-4 gap-3 mb-8">
                        {filteredBoxes?.slice(0, 16).map((box) => {
                          const colors = statusColors[box.status] || statusColors.DISPONIVEL;
                          return (
                            <div
                              key={box.id}
                              onClick={() => handleBoxClick(box)}
                              className={`relative w-20 h-20 rounded-lg ${colors.bg} shadow-lg ${colors.glow} flex flex-col items-center justify-center transition-all hover:scale-110 cursor-pointer`}
                            >
                              <span className={`text-xs font-bold ${colors.text}`}>{box.codigo}</span>
                              <span className={`text-[10px] ${colors.text} opacity-80 truncate max-w-full px-1`}>
                                {box.boxe}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-sm mb-2">Clique em um box para ver detalhes</p>
                      <p className="text-xs">Carregue uma imagem da planta baixa para visualização completa</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lista de boxes filtrados */}
          {selectedStatus && filteredBoxes && filteredBoxes.length > 0 && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-sm">
                  Boxes com status: {selectedStatus} ({filteredBoxes.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {filteredBoxes.map((box) => {
                    const colors = statusColors[box.status] || statusColors.DISPONIVEL;
                    return (
                      <div
                        key={box.id}
                        onClick={() => handleBoxClick(box)}
                        className={`p-3 rounded-lg ${colors.bg} ${colors.glow} shadow-lg cursor-pointer hover:scale-105 transition-transform`}
                      >
                        <p className={`font-bold ${colors.text}`}>{box.codigo}</p>
                        <p className={`text-xs ${colors.text} opacity-80 truncate`}>{box.boxe}</p>
                        {box.inquilino && (
                          <p className={`text-xs ${colors.text} opacity-70 truncate mt-1`}>
                            {box.inquilino}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>

      <BoxDetailsDialog 
        box={selectedBox} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen}
        isAdmin={false}
      />
    </div>
  );
};

export default PlantaBaixa;
