import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CheckCircle2, Calendar, Clock, MapPin, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LojistaFrequenciaProps {
  responsavelId: string;
}

export const LojistaFrequencia = ({ responsavelId }: LojistaFrequenciaProps) => {
  const queryClient = useQueryClient();
  const [checkInDialogOpen, setCheckInDialogOpen] = useState(false);

  // Fetch reuniões agendadas para check-in
  const { data: reunioesAgendadas = [] } = useQuery({
    queryKey: ['reunioes-agendadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reunioes')
        .select('*')
        .eq('status', 'agendada')
        .gte('data_evento', format(new Date(), 'yyyy-MM-dd'))
        .order('data_evento', { ascending: true });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch minhas presenças
  const { data: minhasPresencas = [] } = useQuery({
    queryKey: ['minhas-presencas', responsavelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reuniao_presencas')
        .select('*, reunioes(titulo, data_evento, tipo, hora_inicio, hora_fim, local, status)')
        .eq('responsavel_id', responsavelId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
  });

  // Fetch reuniões realizadas para calcular estatísticas
  const { data: reunioesRealizadas = [] } = useQuery({
    queryKey: ['reunioes-realizadas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reunioes')
        .select('id')
        .eq('status', 'realizada');
      if (error) throw error;
      return data || [];
    }
  });

  const checkInMutation = useMutation({
    mutationFn: async (reuniaoId: string) => {
      const { error } = await supabase
        .from('reuniao_presencas')
        .insert([{
          reuniao_id: reuniaoId,
          responsavel_id: responsavelId,
          presente: true,
          hora_chegada: format(new Date(), 'HH:mm')
        }]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['minhas-presencas'] });
      toast.success('Check-in realizado com sucesso!');
      setCheckInDialogOpen(false);
    },
    onError: (error) => {
      toast.error('Erro ao fazer check-in: ' + error.message);
    }
  });

  // Calcular estatísticas
  const totalReunioesRealizadas = reunioesRealizadas.length;
  const minhasPresencasRealizadas = minhasPresencas.filter(
    p => p.presente && p.reunioes?.status === 'realizada'
  ).length;
  const percentualFrequencia = totalReunioesRealizadas > 0 
    ? ((minhasPresencasRealizadas / totalReunioesRealizadas) * 100).toFixed(1)
    : '0';

  // Verificar se já fez check-in em uma reunião
  const jaFezCheckIn = (reuniaoId: string) => {
    return minhasPresencas.some(p => p.reuniao_id === reuniaoId);
  };

  const getTipoBadge = (tipo: string) => {
    return tipo === 'assembleia' 
      ? <Badge className="bg-purple-500">Assembleia</Badge>
      : <Badge className="bg-blue-500">Reunião</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'agendada':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Agendada</Badge>;
      case 'realizada':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Realizada</Badge>;
      case 'cancelada':
        return <Badge variant="outline" className="bg-red-50 text-red-700">Cancelada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Minha Frequência</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentualFrequencia}%</div>
            <p className="text-xs text-muted-foreground">
              {minhasPresencasRealizadas} de {totalReunioesRealizadas} eventos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Presenças Registradas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{minhasPresencasRealizadas}</div>
            <p className="text-xs text-muted-foreground">Em eventos realizados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Próximos Eventos</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{reunioesAgendadas.length}</div>
            <p className="text-xs text-muted-foreground">Agendados</p>
          </CardContent>
        </Card>
      </div>

      {/* Check-in Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Minha Frequência</h2>
        <Dialog open={checkInDialogOpen} onOpenChange={setCheckInDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Fazer Check-in
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Registrar Presença</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {reunioesAgendadas.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">
                  Nenhuma reunião agendada no momento
                </p>
              ) : (
                reunioesAgendadas.map((reuniao) => {
                  const checkInFeito = jaFezCheckIn(reuniao.id);
                  return (
                    <Card key={reuniao.id} className={checkInFeito ? 'opacity-50' : ''}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {getTipoBadge(reuniao.tipo)}
                              <span className="font-medium">{reuniao.titulo}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(reuniao.data_evento), 'dd/MM/yyyy', { locale: ptBR })}
                              </span>
                              {reuniao.hora_inicio && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {reuniao.hora_inicio.slice(0, 5)}
                                </span>
                              )}
                              {reuniao.local && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {reuniao.local}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            disabled={checkInFeito || checkInMutation.isPending}
                            onClick={() => checkInMutation.mutate(reuniao.id)}
                          >
                            {checkInFeito ? 'Já registrado' : 'Check-in'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Histórico de Presenças */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Histórico de Presenças</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Evento</TableHead>
                <TableHead>Hora Chegada</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-center">Presença</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {minhasPresencas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhuma presença registrada
                  </TableCell>
                </TableRow>
              ) : (
                minhasPresencas.map((presenca) => (
                  <TableRow key={presenca.id}>
                    <TableCell>
                      {presenca.reunioes?.data_evento 
                        ? format(new Date(presenca.reunioes.data_evento), 'dd/MM/yyyy', { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>
                      {presenca.reunioes?.tipo ? getTipoBadge(presenca.reunioes.tipo) : '-'}
                    </TableCell>
                    <TableCell className="font-medium">
                      {presenca.reunioes?.titulo || '-'}
                    </TableCell>
                    <TableCell>
                      {presenca.hora_chegada?.slice(0, 5) || '-'}
                    </TableCell>
                    <TableCell>
                      {presenca.reunioes?.status ? getStatusBadge(presenca.reunioes.status) : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {presenca.presente ? (
                        <Badge className="bg-green-500">Presente</Badge>
                      ) : (
                        <Badge variant="secondary">Ausente</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
