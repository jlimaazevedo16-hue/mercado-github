import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Package, ExternalLink } from "lucide-react";

interface ResponsavelBoxesCardProps {
  responsavelId: string;
}

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'ASSINADO':
      return 'default';
    case 'DISPONIVEL':
      return 'secondary';
    case 'PROCESSO':
      return 'outline';
    case 'INTERDITADO':
    case 'CANCELADO':
    case 'DESATIVADO':
      return 'destructive';
    default:
      return 'outline';
  }
};

export const ResponsavelBoxesCard = ({ responsavelId }: ResponsavelBoxesCardProps) => {
  const navigate = useNavigate();

  const { data: boxes, isLoading } = useQuery({
    queryKey: ["responsavel-boxes", responsavelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select(`
          id,
          codigo,
          boxe,
          status,
          area_m2,
          setores(nome)
        `)
        .eq("responsavel_id", responsavelId)
        .order("codigo");

      if (error) throw error;
      return data;
    },
    enabled: !!responsavelId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4" />
            Boxes Vinculados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-4 w-4" />
          Boxes Vinculados
          {boxes && boxes.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {boxes.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {boxes && boxes.length > 0 ? (
          <div className="space-y-2">
            {boxes.map((box) => (
              <div
                key={box.id}
                className="flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium bg-primary/10 text-primary px-2 py-1 rounded">
                    {box.codigo}
                  </span>
                  <div>
                    <p className="text-sm font-medium">{box.boxe}</p>
                    <p className="text-xs text-muted-foreground">
                      {(box.setores as any)?.nome || "—"} • {box.area_m2 ? `${box.area_m2}m²` : "—"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(box.status)}>
                    {box.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(`/boxes/${box.id}`)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-4">
            Nenhum box vinculado
          </p>
        )}
      </CardContent>
    </Card>
  );
};
