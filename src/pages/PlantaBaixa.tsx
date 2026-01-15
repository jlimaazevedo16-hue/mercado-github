import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, ZoomIn, ZoomOut, RotateCcw, Save, Edit3 } from "lucide-react";
import { toast } from "sonner";
import { BoxDetailsDialog } from "@/components/planta-baixa/BoxDetailsDialog";
import { DraggableBox } from "@/components/planta-baixa/DraggableBox";
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
  const queryClient = useQueryClient();
  const [activeMenuItem, setActiveMenuItem] = useState("planta-baixa");
  const [zoom, setZoom] = useState(1);
  const [plantaImage, setPlantaImage] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [selectedBox, setSelectedBox] = useState<Tables<"boxes"> | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<Record<string, { x: number; y: number }>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const { data: boxes } = useQuery({
    queryKey: ["boxes-planta"],
    queryFn: async () => {
      const { data, error } = await supabase.from("boxes").select("*").order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const savePositionsMutation = useMutation({
    mutationFn: async (changes: Record<string, { x: number; y: number }>) => {
      const updates = Object.entries(changes).map(([id, pos]) =>
        supabase.from("boxes").update({ pos_x: pos.x, pos_y: pos.y }).eq("id", id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["boxes-planta"] });
      setPendingChanges({});
      toast.success("Posições salvas!");
    },
    onError: () => toast.error("Erro ao salvar. Verifique se está autenticado."),
  });

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { toast.error("Máximo 10MB."); return; }
      const reader = new FileReader();
      reader.onload = (event) => { setPlantaImage(event.target?.result as string); toast.success("Planta carregada!"); };
      reader.readAsDataURL(file);
    }
  };

  const handlePositionChange = (boxId: string, x: number, y: number) => {
    setPendingChanges((prev) => ({ ...prev, [boxId]: { x, y } }));
  };

  const handleBoxClick = (box: Tables<"boxes">) => { setSelectedBox(box); setDialogOpen(true); };

  const filteredBoxes = selectedStatus ? boxes?.filter((box) => box.status === selectedStatus) : boxes;
  const statusCounts = boxes?.reduce((acc, box) => { acc[box.status] = (acc[box.status] || 0) + 1; return acc; }, {} as Record<string, number>) ?? {};
  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Planta Baixa</h1>
            <div className="flex gap-2">
              <Button variant={isEditMode ? "default" : "outline"} onClick={() => setIsEditMode(!isEditMode)}>
                <Edit3 className="h-4 w-4 mr-2" />{isEditMode ? "Modo Edição" : "Editar Posições"}
              </Button>
              {hasPendingChanges && (
                <Button onClick={() => savePositionsMutation.mutate(pendingChanges)}>
                  <Save className="h-4 w-4 mr-2" />Salvar Posições
                </Button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="space-y-4">
              <Card><CardHeader><CardTitle className="text-sm">Legenda</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {Object.entries(statusColors).map(([status, colors]) => (
                    <button key={status} onClick={() => setSelectedStatus(selectedStatus === status ? null : status)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg transition-all ${selectedStatus === status ? "ring-2 ring-primary" : "hover:bg-muted"}`}>
                      <div className="flex items-center gap-2"><div className={`w-4 h-4 rounded-full ${colors.bg}`} /><span className="text-sm">{status}</span></div>
                      <Badge variant="secondary">{statusCounts[status] || 0}</Badge>
                    </button>
                  ))}
                </CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-sm">Carregar Planta</CardTitle></CardHeader>
                <CardContent><Label htmlFor="planta-upload" className="cursor-pointer">
                  <div className="flex items-center gap-2 p-3 border-2 border-dashed rounded-lg hover:border-primary"><Upload className="w-4 h-4" /><span className="text-sm">Selecionar</span></div>
                </Label><Input id="planta-upload" type="file" accept="image/*" className="hidden" onChange={handleImageUpload} /></CardContent>
              </Card>
              <Card><CardHeader><CardTitle className="text-sm">Zoom</CardTitle></CardHeader>
                <CardContent><div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}><ZoomOut className="w-4 h-4" /></Button>
                  <span className="flex-1 text-center text-sm">{Math.round(zoom * 100)}%</span>
                  <Button variant="outline" size="icon" onClick={() => setZoom(Math.min(3, zoom + 0.25))}><ZoomIn className="w-4 h-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => setZoom(1)}><RotateCcw className="w-4 h-4" /></Button>
                </div></CardContent>
              </Card>
            </div>
            <div className="lg:col-span-3">
              <Card className="h-[calc(100vh-240px)] overflow-hidden">
                <CardContent className="p-4 h-full">
                  <div ref={containerRef} className="w-full h-full overflow-auto relative">
                    <div style={{ transform: `scale(${zoom})`, transformOrigin: "top left", position: "relative", minHeight: "600px", minWidth: "800px" }} className="transition-transform duration-200">
                      {plantaImage && <img src={plantaImage} alt="Planta" className="max-w-none absolute inset-0" />}
                      {filteredBoxes?.map((box) => (
                        <DraggableBox key={box.id} box={{ ...box, pos_x: pendingChanges[box.id]?.x ?? box.pos_x, pos_y: pendingChanges[box.id]?.y ?? box.pos_y }}
                          statusColors={statusColors} isEditMode={isEditMode} containerRef={containerRef}
                          onPositionChange={handlePositionChange} onClick={handleBoxClick} zoom={zoom} />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
      <BoxDetailsDialog box={selectedBox} open={dialogOpen} onOpenChange={setDialogOpen} isAdmin={false} />
    </div>
  );
};

export default PlantaBaixa;