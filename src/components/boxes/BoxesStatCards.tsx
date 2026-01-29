import { Package, CheckCircle, Clock, AlertTriangle, XCircle, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BoxStats {
  total: number;
  assinados: number;
  disponiveis: number;
  emProcesso: number;
  interditados: number;
  responsaveisAtivos: number;
  areaTotal: number;
}

interface BoxesStatCardsProps {
  stats: BoxStats;
}

export const BoxesStatCards = ({ stats }: BoxesStatCardsProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{stats.total}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assinados</p>
              <p className="text-xl font-bold text-green-600">{stats.assinados}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Disponíveis</p>
              <p className="text-xl font-bold text-blue-600">{stats.disponiveis}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Em Processo</p>
              <p className="text-xl font-bold text-yellow-600">{stats.emProcesso}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Interditados</p>
              <p className="text-xl font-bold text-red-600">{stats.interditados}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Users className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Responsáveis</p>
              <p className="text-xl font-bold text-purple-600">{stats.responsaveisAtivos}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Package className="h-5 w-5 text-teal-600" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Área Total</p>
              <p className="text-xl font-bold text-teal-600">{stats.areaTotal.toFixed(0)}m²</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
