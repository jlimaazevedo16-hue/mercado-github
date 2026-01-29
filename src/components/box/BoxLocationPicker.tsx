import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPin, Upload, ZoomIn, ZoomOut, RotateCcw, Target } from "lucide-react";
import { toast } from "sonner";

interface BoxLocationPickerProps {
  posX: number | null;
  posY: number | null;
  onPositionChange: (x: number, y: number) => void;
  isEditing: boolean;
}

export const BoxLocationPicker = ({
  posX,
  posY,
  onPositionChange,
  isEditing,
}: BoxLocationPickerProps) => {
  const [zoom, setZoom] = useState(1);
  const [plantaImage, setPlantaImage] = useState<string | null>(null);
  const [isPlacing, setIsPlacing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Máximo 10MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        setPlantaImage(event.target?.result as string);
        toast.success("Planta carregada!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isEditing || !isPlacing) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / zoom;
    const y = (e.clientY - rect.top) / zoom;

    onPositionChange(Math.round(x), Math.round(y));
    setIsPlacing(false);
    toast.success("Posição definida!");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <MapPin className="h-5 w-5" />
          Localização na Planta Baixa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap gap-2 items-center">
          <Label htmlFor="planta-upload-box" className="cursor-pointer">
            <div className="flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted transition-colors">
              <Upload className="w-4 h-4" />
              <span className="text-sm">Carregar Planta</span>
            </div>
          </Label>
          <Input
            id="planta-upload-box"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center text-sm">{Math.round(zoom * 100)}%</span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(Math.min(3, zoom + 0.25))}
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setZoom(1)}
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>

          {isEditing && (
            <Button
              variant={isPlacing ? "default" : "outline"}
              onClick={() => setIsPlacing(!isPlacing)}
              className="ml-auto"
            >
              <Target className="w-4 h-4 mr-2" />
              {isPlacing ? "Clique no mapa..." : "Definir Posição"}
            </Button>
          )}
        </div>

        {/* Position Display */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground">Posição X:</Label>
            <span className="font-mono">{posX ?? "N/A"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground">Posição Y:</Label>
            <span className="font-mono">{posY ?? "N/A"}</span>
          </div>
        </div>

        {/* Map Preview */}
        <div
          ref={containerRef}
          className={`relative w-full h-64 border rounded-lg overflow-auto bg-muted/50 ${
            isPlacing ? "cursor-crosshair" : ""
          }`}
          onClick={handleMapClick}
        >
          <div
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top left",
              position: "relative",
              minHeight: "100%",
              minWidth: "100%",
            }}
            className="transition-transform duration-200"
          >
            {plantaImage ? (
              <img
                src={plantaImage}
                alt="Planta Baixa"
                className="max-w-none"
                draggable={false}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Carregue uma imagem da planta baixa</p>
                  <p className="text-xs">para definir a localização do box</p>
                </div>
              </div>
            )}

            {/* Current Position Marker */}
            {posX !== null && posY !== null && (
              <div
                className="absolute w-8 h-8 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{ left: posX, top: posY }}
              >
                <div className="w-6 h-6 bg-primary rounded-full shadow-lg border-2 border-white flex items-center justify-center animate-pulse">
                  <MapPin className="w-4 h-4 text-primary-foreground" />
                </div>
              </div>
            )}
          </div>
        </div>

        {isPlacing && (
          <p className="text-sm text-muted-foreground text-center">
            Clique no mapa para definir a posição do box
          </p>
        )}
      </CardContent>
    </Card>
  );
};
