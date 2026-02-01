import { useNavigate } from "react-router-dom";
import { useLojistaPendencias } from "@/hooks/useLojistaPendencias";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  FileWarning, 
  Clock, 
  Scale, 
  Bell,
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const LojistaPendenciasPanel = () => {
  const navigate = useNavigate();
  const { 
    pendencias, 
    totalNotificacoes, 
    totalDocumentosVencidos, 
    totalDocumentosVencendo,
    totalPAD,
    total,
    isLoading 
  } = useLojistaPendencias();

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <span className="ml-2 text-muted-foreground">Carregando avisos...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Se não há pendências, mostrar mensagem positiva
  if (total === 0) {
    return (
      <Card className="mb-6 border-green-200 bg-green-50/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-semibold text-green-800">Tudo em dia!</h3>
              <p className="text-sm text-green-700">
                Não há pendências ou avisos para o seu box no momento.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getUrgenciaBadge = (urgencia: string) => {
    switch (urgencia) {
      case 'alta':
        return <Badge className="bg-red-500">Urgente</Badge>;
      case 'media':
        return <Badge className="bg-amber-500">Atenção</Badge>;
      default:
        return <Badge variant="secondary">Aviso</Badge>;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'notificacao':
        return <Bell className="h-5 w-5 text-amber-600" />;
      case 'pad':
        return <Scale className="h-5 w-5 text-red-600" />;
      case 'documento_vencido':
        return <FileWarning className="h-5 w-5 text-red-600" />;
      case 'documento_vencendo':
        return <Clock className="h-5 w-5 text-amber-600" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  return (
    <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50/80 to-red-50/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-red-100 rounded-full animate-pulse">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <CardTitle className="text-lg text-red-800">
              Quadro de Avisos
            </CardTitle>
            <Badge variant="destructive" className="ml-2">
              {total} {total === 1 ? 'pendência' : 'pendências'}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Resumo por categoria */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {totalNotificacoes > 0 && (
            <div className="flex items-center gap-2 p-2 bg-amber-100/50 rounded-lg">
              <Bell className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">{totalNotificacoes} Notificações</span>
            </div>
          )}
          {totalPAD > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-100/50 rounded-lg">
              <Scale className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">{totalPAD} PAD</span>
            </div>
          )}
          {totalDocumentosVencidos > 0 && (
            <div className="flex items-center gap-2 p-2 bg-red-100/50 rounded-lg">
              <FileWarning className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium">{totalDocumentosVencidos} Vencidos</span>
            </div>
          )}
          {totalDocumentosVencendo > 0 && (
            <div className="flex items-center gap-2 p-2 bg-amber-100/50 rounded-lg">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium">{totalDocumentosVencendo} Vencendo</span>
            </div>
          )}
        </div>

        {/* Lista de pendências */}
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {pendencias.slice(0, 5).map((pendencia) => (
            <Alert 
              key={pendencia.id} 
              className={`cursor-pointer hover:shadow-md transition-shadow ${
                pendencia.urgencia === 'alta' 
                  ? 'border-red-300 bg-red-50' 
                  : pendencia.urgencia === 'media'
                  ? 'border-amber-300 bg-amber-50'
                  : 'border-muted'
              }`}
              onClick={() => pendencia.link && navigate(pendencia.link)}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  {getTipoIcon(pendencia.tipo)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTitle className="mb-0 text-sm font-semibold">
                      {pendencia.titulo}
                    </AlertTitle>
                    {getUrgenciaBadge(pendencia.urgencia)}
                  </div>
                  <AlertDescription className="text-sm text-muted-foreground">
                    {pendencia.descricao}
                    {pendencia.data && (
                      <span className="block mt-1 text-xs">
                        Data: {format(new Date(pendencia.data), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    )}
                  </AlertDescription>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground mt-1" />
              </div>
            </Alert>
          ))}
        </div>

        {/* Ver mais */}
        {pendencias.length > 5 && (
          <div className="text-center pt-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/pendencias')}
            >
              Ver todas as {pendencias.length} pendências
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
