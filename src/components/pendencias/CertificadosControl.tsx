import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  FileCheck, AlertTriangle, CheckCircle, Clock, Search, 
  FileWarning, Calendar, Building2
} from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';

interface Certificado {
  id: string;
  nome: string;
  tipo: string;
  data_validade: string;
  status: 'valido' | 'vencendo' | 'vencido';
  diasRestantes: number;
  box_id: string;
  box_codigo: string;
  box_inquilino: string;
}

const statusConfig = {
  valido: { label: 'Válido', icon: CheckCircle, className: 'bg-green-500 text-white' },
  vencendo: { label: 'Vencendo', icon: Clock, className: 'bg-yellow-500 text-white' },
  vencido: { label: 'Vencido', icon: AlertTriangle, className: 'bg-destructive text-destructive-foreground' },
};

export const CertificadosControl = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tipoFilter, setTipoFilter] = useState<string>('all');

  const { data: certificados, isLoading } = useQuery({
    queryKey: ['certificados-control'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('box_documents')
        .select(`
          id, nome, tipo, data_validade,
          boxes!box_documents_box_id_fkey (id, codigo, boxe, inquilino)
        `)
        .not('data_validade', 'is', null)
        .order('data_validade', { ascending: true });

      if (error) throw error;

      return data?.map((doc: any): Certificado => {
        const today = new Date();
        const validade = new Date(doc.data_validade);
        const diasRestantes = differenceInDays(validade, today);
        
        let status: 'valido' | 'vencendo' | 'vencido';
        if (diasRestantes < 0) status = 'vencido';
        else if (diasRestantes <= 30) status = 'vencendo';
        else status = 'valido';

        return {
          id: doc.id,
          nome: doc.nome,
          tipo: doc.tipo || 'Outro',
          data_validade: doc.data_validade,
          status,
          diasRestantes,
          box_id: doc.boxes?.id || '',
          box_codigo: doc.boxes?.codigo || '',
          box_inquilino: doc.boxes?.inquilino || '',
        };
      }) || [];
    },
  });

  // Get unique tipos for filter
  const tipos = [...new Set(certificados?.map(c => c.tipo) || [])];

  const filteredCertificados = certificados?.filter((c) => {
    const matchesSearch = !searchTerm || 
      c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.box_codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.box_inquilino.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    const matchesTipo = tipoFilter === 'all' || c.tipo === tipoFilter;

    return matchesSearch && matchesStatus && matchesTipo;
  });

  // Stats
  const stats = {
    total: certificados?.length || 0,
    validos: certificados?.filter(c => c.status === 'valido').length || 0,
    vencendo: certificados?.filter(c => c.status === 'vencendo').length || 0,
    vencidos: certificados?.filter(c => c.status === 'vencido').length || 0,
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando certificados...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <FileCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Válidos</p>
                <p className="text-2xl font-bold text-green-500">{stats.validos}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencendo</p>
                <p className="text-2xl font-bold text-yellow-500">{stats.vencendo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <FileWarning className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Vencidos</p>
                <p className="text-2xl font-bold text-destructive">{stats.vencidos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            Controle de Certificados e Licenças
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, box ou inquilino..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="valido">Válidos</SelectItem>
                <SelectItem value="vencendo">Vencendo</SelectItem>
                <SelectItem value="vencido">Vencidos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tipoFilter} onValueChange={setTipoFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {tipos.map((tipo) => (
                  <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Box</TableHead>
                <TableHead>Inquilino</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCertificados?.map((cert) => {
                const StatusIcon = statusConfig[cert.status].icon;
                return (
                  <TableRow key={cert.id}>
                    <TableCell className="font-medium">{cert.nome}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cert.tipo}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {cert.box_codigo}
                      </div>
                    </TableCell>
                    <TableCell>{cert.box_inquilino || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(cert.data_validade), 'dd/MM/yyyy', { locale: ptBR })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[cert.status].className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        {statusConfig[cert.status].label}
                        {cert.status !== 'valido' && (
                          <span className="ml-1">
                            ({cert.diasRestantes < 0 ? `${Math.abs(cert.diasRestantes)}d atrás` : `${cert.diasRestantes}d`})
                          </span>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/boxes/${cert.box_id}`)}
                      >
                        Ver Box
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredCertificados || filteredCertificados.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum certificado encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
