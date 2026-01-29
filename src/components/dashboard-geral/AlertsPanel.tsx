import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  AlertTriangle, 
  FileWarning, 
  Clock, 
  ChevronRight,
  Bell,
  FileX
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, isPast, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Alert {
  id: string;
  type: "pendencia" | "certificado" | "notificacao";
  severity: "critical" | "warning" | "info";
  title: string;
  description: string;
  date?: string;
  link?: string;
}

export function AlertsPanel() {
  const navigate = useNavigate();

  // Fetch PADs with pending status
  const { data: pendingPads = [] } = useQuery({
    queryKey: ["dashboard-pending-pads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pads")
        .select(`
          id,
          numero_processo,
          status,
          data_autuacao,
          boxes ( codigo, boxe ),
          responsaveis ( nome )
        `)
        .not("status", "eq", "arquivado")
        .order("data_autuacao", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch expiring/expired documents
  const { data: expiringDocs } = useQuery({
    queryKey: ["dashboard-expiring-docs"],
    queryFn: async () => {
      const thirtyDaysFromNow = addDays(new Date(), 30).toISOString().split('T')[0];
      
      const { data: boxDocs, error: boxError } = await supabase
        .from("box_documents")
        .select(`
          id,
          nome,
          tipo,
          data_validade,
          boxes ( codigo, boxe )
        `)
        .not("data_validade", "is", null)
        .lte("data_validade", thirtyDaysFromNow)
        .order("data_validade", { ascending: true })
        .limit(10);
      
      if (boxError) throw boxError;

      const { data: respDocs, error: respError } = await supabase
        .from("responsavel_documents")
        .select(`
          id,
          nome,
          tipo,
          data_validade,
          responsaveis ( nome )
        `)
        .not("data_validade", "is", null)
        .lte("data_validade", thirtyDaysFromNow)
        .order("data_validade", { ascending: true })
        .limit(10);
      
      if (respError) throw respError;

      return { boxDocs: boxDocs || [], respDocs: respDocs || [] };
    },
  });

  // Fetch pending notifications
  const { data: pendingNotifications = [] } = useQuery({
    queryKey: ["dashboard-pending-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select(`
          id,
          numero_interno,
          tipo,
          classificacao,
          data_notificacao,
          prazo_adequacao,
          boxes ( codigo, boxe ),
          responsaveis ( nome )
        `)
        .not("status", "eq", "resolvido")
        .order("data_notificacao", { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data || [];
    },
  });

  // Build alerts list
  const alerts: Alert[] = [];

  // Add PAD alerts
  pendingPads.forEach(pad => {
    alerts.push({
      id: `pad-${pad.id}`,
      type: "pendencia",
      severity: pad.status === "autuacao" ? "critical" : "warning",
      title: `PAD ${pad.numero_processo}`,
      description: `${(pad.boxes as any)?.codigo || 'Box'} - ${(pad.responsaveis as any)?.nome || 'Sem responsável'}`,
      date: pad.data_autuacao,
      link: `/notificacoes`,
    });
  });

  // Add expiring document alerts
  expiringDocs?.boxDocs?.forEach(doc => {
    const isExpired = doc.data_validade && isPast(new Date(doc.data_validade));
    const daysUntil = doc.data_validade ? differenceInDays(new Date(doc.data_validade), new Date()) : 0;
    
    alerts.push({
      id: `box-doc-${doc.id}`,
      type: "certificado",
      severity: isExpired ? "critical" : daysUntil <= 7 ? "warning" : "info",
      title: doc.nome,
      description: `${(doc.boxes as any)?.codigo || 'Box'} - ${isExpired ? 'Vencido' : `Vence em ${daysUntil} dias`}`,
      date: doc.data_validade || undefined,
      link: `/boxes`,
    });
  });

  expiringDocs?.respDocs?.forEach(doc => {
    const isExpired = doc.data_validade && isPast(new Date(doc.data_validade));
    const daysUntil = doc.data_validade ? differenceInDays(new Date(doc.data_validade), new Date()) : 0;
    
    alerts.push({
      id: `resp-doc-${doc.id}`,
      type: "certificado",
      severity: isExpired ? "critical" : daysUntil <= 7 ? "warning" : "info",
      title: doc.nome,
      description: `${(doc.responsaveis as any)?.nome || 'Responsável'} - ${isExpired ? 'Vencido' : `Vence em ${daysUntil} dias`}`,
      date: doc.data_validade || undefined,
      link: `/responsaveis`,
    });
  });

  // Add notification alerts
  pendingNotifications.forEach(notif => {
    alerts.push({
      id: `notif-${notif.id}`,
      type: "notificacao",
      severity: notif.classificacao === "gravissima" || notif.classificacao === "grave" ? "critical" : "warning",
      title: `Notificação ${notif.numero_interno || ''}`,
      description: `${(notif.boxes as any)?.codigo || 'Box'} - ${notif.classificacao}`,
      date: notif.data_notificacao,
      link: `/notificacoes`,
    });
  });

  // Sort by severity
  const sortedAlerts = alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, info: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  }).slice(0, 10);

  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const warningCount = alerts.filter(a => a.severity === "warning").length;

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "pendencia": return <FileWarning className="h-4 w-4" />;
      case "certificado": return <FileX className="h-4 w-4" />;
      case "notificacao": return <Bell className="h-4 w-4" />;
      default: return <AlertTriangle className="h-4 w-4" />;
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "warning": return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default: return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Alertas Críticos
          </CardTitle>
          <div className="flex gap-2">
            {criticalCount > 0 && (
              <Badge variant="destructive">{criticalCount} críticos</Badge>
            )}
            {warningCount > 0 && (
              <Badge variant="secondary">{warningCount} avisos</Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {sortedAlerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Nenhum alerta pendente</p>
            <p className="text-sm">Tudo está em ordem!</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-3">
              {sortedAlerts.map(alert => (
                <div 
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors cursor-pointer"
                  onClick={() => alert.link && navigate(alert.link)}
                >
                  <div className={`p-2 rounded-full ${getSeverityStyles(alert.severity)}`}>
                    {getAlertIcon(alert.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{alert.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
                    {alert.date && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(alert.date), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="mt-4 pt-4 border-t">
          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => navigate("/pendencias")}
          >
            Ver Todas as Pendências
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
