import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calendar, Users, FileText, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Reuniao {
  id: string;
  tipo: string;
  titulo: string;
  data_evento: string;
  hora_inicio: string | null;
  hora_fim: string | null;
  local: string | null;
  pauta: string | null;
  ata: string | null;
  status: string;
}

export const ReunioesList = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedReuniao, setSelectedReuniao] = useState<Reuniao | null>(null);
  const [formData, setFormData] = useState({
    tipo: 'reuniao',
    titulo: '',
    data_evento: format(new Date(), 'yyyy-MM-dd'),
    hora_inicio: '09:00',
    hora_fim: '11:00',
    local: '',
    pauta: ''
  });

  const { data: reunioes = [], isLoading } = useQuery({
    queryKey: ['reunioes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reunioes')
        .select('*')
        .order('data_evento', { ascending: false });
      if (error) throw error;
      return data as Reuniao[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('reunioes').insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunioes'] });
      toast.success('Reunião criada com sucesso!');
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Erro ao criar reunião: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('reunioes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunioes'] });
      toast.success('Reunião excluída!');
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from('reunioes').update({ status }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reunioes'] });
      toast.success('Status atualizado!');
    }
  });

  const resetForm = () => {
    setFormData({
      tipo: 'reuniao',
      titulo: '',
      data_evento: format(new Date(), 'yyyy-MM-dd'),
      hora_inicio: '09:00',
      hora_fim: '11:00',
      local: '',
      pauta: ''
    });
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

  const getTipoBadge = (tipo: string) => {
    return tipo === 'assembleia' 
      ? <Badge className="bg-purple-500">Assembleia</Badge>
      : <Badge className="bg-blue-500">Reunião</Badge>;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Reuniões e Assembleias</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Reunião
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Agendar Nova Reunião/Assembleia</DialogTitle>
            </DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={formData.tipo} onValueChange={(v) => setFormData({ ...formData, tipo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="reuniao">Reunião</SelectItem>
                      <SelectItem value="assembleia">Assembleia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Data</Label>
                  <Input 
                    type="date" 
                    value={formData.data_evento}
                    onChange={(e) => setFormData({ ...formData, data_evento: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Título</Label>
                <Input 
                  value={formData.titulo}
                  onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                  placeholder="Ex: Reunião Ordinária - Janeiro/2026"
                  required
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Hora Início</Label>
                  <Input 
                    type="time" 
                    value={formData.hora_inicio}
                    onChange={(e) => setFormData({ ...formData, hora_inicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora Fim</Label>
                  <Input 
                    type="time" 
                    value={formData.hora_fim}
                    onChange={(e) => setFormData({ ...formData, hora_fim: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Local</Label>
                  <Input 
                    value={formData.local}
                    onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                    placeholder="Auditório"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Pauta</Label>
                <Textarea 
                  value={formData.pauta}
                  onChange={(e) => setFormData({ ...formData, pauta: e.target.value })}
                  placeholder="Pontos a serem discutidos..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Horário</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">Carregando...</TableCell>
                </TableRow>
              ) : reunioes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhuma reunião agendada
                  </TableCell>
                </TableRow>
              ) : (
                reunioes.map((reuniao) => (
                  <TableRow key={reuniao.id}>
                    <TableCell>
                      {format(new Date(reuniao.data_evento), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{getTipoBadge(reuniao.tipo)}</TableCell>
                    <TableCell className="font-medium">{reuniao.titulo}</TableCell>
                    <TableCell>
                      {reuniao.hora_inicio && reuniao.hora_fim 
                        ? `${reuniao.hora_inicio.slice(0,5)} - ${reuniao.hora_fim.slice(0,5)}`
                        : '-'}
                    </TableCell>
                    <TableCell>{reuniao.local || '-'}</TableCell>
                    <TableCell>{getStatusBadge(reuniao.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSelectedReuniao(reuniao)}
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        {reuniao.status === 'agendada' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateStatusMutation.mutate({ id: reuniao.id, status: 'realizada' })}
                          >
                            Marcar Realizada
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="icon"
                          className="text-destructive"
                          onClick={() => deleteMutation.mutate(reuniao.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Presence Control Dialog */}
      {selectedReuniao && (
        <PresencaControl 
          reuniao={selectedReuniao} 
          onClose={() => setSelectedReuniao(null)} 
        />
      )}
    </div>
  );
};

// Presence Control Component
const PresencaControl = ({ reuniao, onClose }: { reuniao: Reuniao; onClose: () => void }) => {
  const queryClient = useQueryClient();

  const { data: responsaveis = [] } = useQuery({
    queryKey: ['responsaveis-presenca'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsaveis')
        .select('id, nome, status')
        .eq('status', 'ATIVO')
        .order('nome');
      if (error) throw error;
      return data || [];
    }
  });

  const { data: presencas = [], refetch: refetchPresencas } = useQuery({
    queryKey: ['presencas', reuniao.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('reuniao_presencas')
        .select('*, responsaveis(nome)')
        .eq('reuniao_id', reuniao.id);
      if (error) throw error;
      return data || [];
    }
  });

  const togglePresenca = async (responsavelId: string) => {
    const existingPresenca = presencas.find(p => p.responsavel_id === responsavelId);
    
    if (existingPresenca) {
      await supabase
        .from('reuniao_presencas')
        .update({ presente: !existingPresenca.presente, hora_chegada: !existingPresenca.presente ? format(new Date(), 'HH:mm') : null })
        .eq('id', existingPresenca.id);
    } else {
      await supabase
        .from('reuniao_presencas')
        .insert([{ reuniao_id: reuniao.id, responsavel_id: responsavelId, presente: true, hora_chegada: format(new Date(), 'HH:mm') }]);
    }
    
    refetchPresencas();
  };

  const presentes = presencas.filter(p => p.presente).length;
  const percentual = responsaveis.length > 0 ? ((presentes / responsaveis.length) * 100).toFixed(1) : 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Controle de Presença - {reuniao.titulo}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            <Card className="flex-1">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{presentes}/{responsaveis.length}</div>
                <p className="text-sm text-muted-foreground">Presentes</p>
              </CardContent>
            </Card>
            <Card className="flex-1">
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{percentual}%</div>
                <p className="text-sm text-muted-foreground">Frequência</p>
              </CardContent>
            </Card>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="text-center">Presente</TableHead>
                <TableHead>Hora Chegada</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {responsaveis.map((resp) => {
                const presenca = presencas.find(p => p.responsavel_id === resp.id);
                return (
                  <TableRow key={resp.id}>
                    <TableCell className="font-medium">{resp.nome}</TableCell>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={presenca?.presente || false}
                        onChange={() => togglePresenca(resp.id)}
                        className="h-5 w-5 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      {presenca?.hora_chegada?.slice(0, 5) || '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
};
