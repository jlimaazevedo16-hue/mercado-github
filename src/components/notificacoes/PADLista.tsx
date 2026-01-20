import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Eye, Search, Scale, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PADListaProps {
  onViewDetails: (padId: string) => void;
}

type PadStatus = 'autuacao' | 'defesa' | 'julgamento' | 'recurso' | 'decisao_final' | 'arquivado';

interface PAD {
  id: string;
  numero_processo: string;
  status: PadStatus;
  data_autuacao: string;
  data_decisao_final: string | null;
  valor_multa: number | null;
  percentual_multa: number | null;
  relator: string | null;
  boxes?: { codigo: string; boxe: string } | null;
  responsaveis?: { nome: string } | null;
  notificacoes?: { artigo_violado: string; classificacao: string } | null;
}

const statusLabels: Record<PadStatus, string> = {
  autuacao: 'Autuação',
  defesa: 'Defesa',
  julgamento: 'Julgamento',
  recurso: 'Recurso',
  decisao_final: 'Decisão Final',
  arquivado: 'Arquivado',
};

const statusColors: Record<PadStatus, string> = {
  autuacao: 'bg-blue-100 text-blue-800',
  defesa: 'bg-yellow-100 text-yellow-800',
  julgamento: 'bg-orange-100 text-orange-800',
  recurso: 'bg-purple-100 text-purple-800',
  decisao_final: 'bg-green-100 text-green-800',
  arquivado: 'bg-gray-100 text-gray-800',
};

export const PADLista = ({ onViewDetails }: PADListaProps) => {
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const { data: pads, isLoading } = useQuery({
    queryKey: ['pads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('pads')
        .select(`
          *,
          boxes (codigo, boxe),
          responsaveis (nome),
          notificacoes (artigo_violado, classificacao)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as PAD[];
    },
  });

  const filteredPads = pads?.filter((pad) => {
    const matchesSearch =
      pad.numero_processo.toLowerCase().includes(search.toLowerCase()) ||
      pad.boxes?.codigo.toLowerCase().includes(search.toLowerCase()) ||
      pad.responsaveis?.nome.toLowerCase().includes(search.toLowerCase()) ||
      pad.relator?.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = filterStatus === 'all' || pad.status === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const totalMultas = pads?.reduce((acc, pad) => acc + (pad.valor_multa || 0), 0) || 0;
  const padsPendentes = pads?.filter((p) => p.status !== 'arquivado').length || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <Scale className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de PADs</p>
                <p className="text-2xl font-bold">{pads?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-full">
                <FileText className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold">{padsPendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Scale className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total em Multas</p>
                <p className="text-2xl font-bold">
                  R$ {totalMultas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Processos Administrativos (PAD)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, box, responsável ou relator..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="autuacao">Autuação</SelectItem>
                <SelectItem value="defesa">Defesa</SelectItem>
                <SelectItem value="julgamento">Julgamento</SelectItem>
                <SelectItem value="recurso">Recurso</SelectItem>
                <SelectItem value="decisao_final">Decisão Final</SelectItem>
                <SelectItem value="arquivado">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº Processo</TableHead>
                  <TableHead>Box / Responsável</TableHead>
                  <TableHead>Artigo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Autuação</TableHead>
                  <TableHead>Valor Multa</TableHead>
                  <TableHead>Relator</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPads?.map((pad) => (
                  <TableRow key={pad.id}>
                    <TableCell className="font-medium">{pad.numero_processo}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{pad.boxes?.codigo || '-'}</div>
                        <div className="text-sm text-muted-foreground">
                          {pad.responsaveis?.nome || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {pad.notificacoes?.artigo_violado || '-'}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[pad.status]}>
                        {statusLabels[pad.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(pad.data_autuacao), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {pad.valor_multa
                        ? `R$ ${pad.valor_multa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                        : '-'}
                    </TableCell>
                    <TableCell>{pad.relator || '-'}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewDetails(pad.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPads?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum processo encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
