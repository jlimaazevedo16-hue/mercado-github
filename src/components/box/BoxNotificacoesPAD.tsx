import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  AlertTriangle, FileText, Calendar, ExternalLink, 
  Clock, CheckCircle, XCircle, Download
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

interface BoxNotificacoesPADProps {
  boxId: string;
  boxCodigo?: string;
}

const statusColors: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800",
  em_analise: "bg-blue-100 text-blue-800",
  regularizado: "bg-green-100 text-green-800",
  arquivado: "bg-gray-100 text-gray-800",
  autuacao: "bg-orange-100 text-orange-800",
  defesa: "bg-purple-100 text-purple-800",
  julgamento: "bg-indigo-100 text-indigo-800",
  recurso: "bg-pink-100 text-pink-800",
  decisao_final: "bg-red-100 text-red-800",
};

const classificacaoColors: Record<string, string> = {
  leve: "bg-green-100 text-green-800",
  media: "bg-yellow-100 text-yellow-800",
  grave: "bg-orange-100 text-orange-800",
  gravissima: "bg-red-100 text-red-800",
};

export const BoxNotificacoesPAD = ({ boxId, boxCodigo }: BoxNotificacoesPADProps) => {
  const navigate = useNavigate();

  const { data: notificacoes, isLoading: loadingNotif } = useQuery({
    queryKey: ["box-notificacoes", boxId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notificacoes")
        .select("*, responsaveis(nome)")
        .eq("box_id", boxId)
        .order("data_notificacao", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!boxId,
  });

  const { data: pads, isLoading: loadingPads } = useQuery({
    queryKey: ["box-pads", boxId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pads")
        .select("*, notificacoes(numero_interno, tipo, classificacao, descricao_infracao)")
        .eq("box_id", boxId)
        .order("data_autuacao", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!boxId,
  });

  const { data: padDocuments } = useQuery({
    queryKey: ["box-pad-documents", boxId],
    queryFn: async () => {
      if (!pads || pads.length === 0) return [];
      const padIds = pads.map(p => p.id);
      const { data, error } = await supabase
        .from("pad_documents")
        .select("*")
        .in("pad_id", padIds)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!pads && pads.length > 0,
  });

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Header
    doc.setFontSize(16);
    doc.text(`Relatório de Notificações e PAD`, pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Box: ${boxCodigo || boxId}`, pageWidth / 2, 28, { align: 'center' });
    doc.text(`Data: ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR })}`, pageWidth / 2, 35, { align: 'center' });

    let yPos = 50;

    // Notificações
    doc.setFontSize(14);
    doc.text('Notificações', 14, yPos);
    yPos += 10;

    if (notificacoes && notificacoes.length > 0) {
      doc.setFontSize(10);
      notificacoes.forEach((notif, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. ${notif.numero_interno || 'S/N'} - ${notif.tipo.toUpperCase()}`, 14, yPos);
        yPos += 6;
        doc.text(`   Classificação: ${notif.classificacao} | Status: ${notif.status}`, 14, yPos);
        yPos += 6;
        doc.text(`   Data: ${format(new Date(notif.data_notificacao), "dd/MM/yyyy")}`, 14, yPos);
        yPos += 6;
        doc.text(`   Infração: ${notif.descricao_infracao.substring(0, 80)}...`, 14, yPos);
        yPos += 10;
      });
    } else {
      doc.setFontSize(10);
      doc.text('Nenhuma notificação registrada.', 14, yPos);
      yPos += 10;
    }

    // PADs
    yPos += 10;
    doc.setFontSize(14);
    doc.text('Processos Administrativos (PAD)', 14, yPos);
    yPos += 10;

    if (pads && pads.length > 0) {
      doc.setFontSize(10);
      pads.forEach((pad, idx) => {
        if (yPos > 260) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(`${idx + 1}. Processo: ${pad.numero_processo}`, 14, yPos);
        yPos += 6;
        doc.text(`   Status: ${pad.status} | Multa: R$ ${pad.valor_multa?.toFixed(2) || '0,00'}`, 14, yPos);
        yPos += 6;
        doc.text(`   Autuação: ${format(new Date(pad.data_autuacao), "dd/MM/yyyy")}`, 14, yPos);
        yPos += 6;
        if (pad.decisao_final) {
          doc.text(`   Decisão: ${pad.decisao_final.substring(0, 60)}...`, 14, yPos);
          yPos += 6;
        }
        yPos += 6;
      });
    } else {
      doc.setFontSize(10);
      doc.text('Nenhum PAD registrado.', 14, yPos);
    }

    doc.save(`notificacoes_pad_${boxCodigo || boxId}_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  if (loadingNotif || loadingPads) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  const totalNotificacoes = notificacoes?.length || 0;
  const totalPADs = pads?.length || 0;
  const padsAtivos = pads?.filter(p => !['arquivado', 'decisao_final'].includes(p.status)).length || 0;
  const totalMultas = pads?.reduce((acc, p) => acc + (p.valor_multa || 0), 0) || 0;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
            <p className="text-2xl font-bold">{totalNotificacoes}</p>
            <p className="text-sm text-muted-foreground">Notificações</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-8 w-8 mx-auto text-blue-500 mb-2" />
            <p className="text-2xl font-bold">{totalPADs}</p>
            <p className="text-sm text-muted-foreground">PADs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="h-8 w-8 mx-auto text-orange-500 mb-2" />
            <p className="text-2xl font-bold">{padsAtivos}</p>
            <p className="text-sm text-muted-foreground">PADs Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-destructive">
              R$ {totalMultas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-muted-foreground">Total em Multas</p>
          </CardContent>
        </Card>
      </div>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button variant="outline" onClick={handleExportPDF}>
          <Download className="h-4 w-4 mr-2" />
          Exportar PDF
        </Button>
      </div>

      {/* Notificações Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Notificações
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notificacoes && notificacoes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Prazo Defesa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {notificacoes.map((notif) => (
                  <TableRow key={notif.id}>
                    <TableCell className="font-medium">{notif.numero_interno || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={notif.tipo === 'externa' ? 'destructive' : 'secondary'}>
                        {notif.tipo.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={classificacaoColors[notif.classificacao]}>
                        {notif.classificacao.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(notif.data_notificacao), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>
                      {notif.prazo_defesa 
                        ? format(new Date(notif.prazo_defesa), "dd/MM/yyyy")
                        : '—'
                      }
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[notif.status || 'pendente']}>
                        {notif.status || 'pendente'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate('/notificacoes')}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação registrada para este box</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* PADs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Processos Administrativos Disciplinares (PAD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pads && pads.length > 0 ? (
            <div className="space-y-4">
              {pads.map((pad) => (
                <Card key={pad.id} className="border-l-4 border-l-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-lg">{pad.numero_processo}</span>
                          <Badge className={statusColors[pad.status]}>
                            {pad.status.replace('_', ' ').toUpperCase()}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            Autuação: {format(new Date(pad.data_autuacao), "dd/MM/yyyy")}
                          </p>
                          {pad.valor_multa && pad.valor_multa > 0 && (
                            <p className="text-destructive font-medium">
                              Multa: R$ {pad.valor_multa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              {pad.percentual_multa && ` (${pad.percentual_multa}%)`}
                            </p>
                          )}
                          {pad.relator && <p>Relator: {pad.relator}</p>}
                          {pad.decisao_final && (
                            <p className="mt-2 p-2 bg-muted rounded">
                              <strong>Decisão Final:</strong> {pad.decisao_final}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => navigate('/notificacoes')}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Detalhes
                      </Button>
                    </div>

                    {/* Documents for this PAD */}
                    {padDocuments && padDocuments.filter(d => d.pad_id === pad.id).length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <p className="text-sm font-medium mb-2">Documentos anexados:</p>
                        <div className="flex flex-wrap gap-2">
                          {padDocuments.filter(d => d.pad_id === pad.id).map((doc) => (
                            <Button
                              key={doc.id}
                              variant="ghost"
                              size="sm"
                              className="h-auto py-1 px-2 text-xs"
                              onClick={() => doc.arquivo_url && window.open(doc.arquivo_url, '_blank')}
                            >
                              <FileText className="h-3 w-3 mr-1" />
                              {doc.nome}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum PAD registrado para este box</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
