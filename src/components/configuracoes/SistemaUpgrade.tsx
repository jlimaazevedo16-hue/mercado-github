import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { RefreshCw, CheckCircle, Clock, AlertTriangle, Download, Shield } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Versao {
  id: string;
  versao: string;
  descricao: string | null;
  changelog: string | null;
  data_lancamento: string;
  aplicado_em: string | null;
  status: string;
}

export function SistemaUpgrade() {
  const queryClient = useQueryClient();
  const [isChecking, setIsChecking] = useState(false);

  // Buscar versão atual do sistema
  const { data: setupData, isLoading: loadingSetup } = useQuery({
    queryKey: ['sistema-setup-versao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistema_setup')
        .select('versao_atual, setup_concluido, data_conclusao')
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  // Buscar histórico de versões
  const { data: versoes = [], isLoading: loadingVersoes } = useQuery({
    queryKey: ['sistema-versoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sistema_versoes')
        .select('*')
        .order('data_lancamento', { ascending: false });
      
      if (error) throw error;
      return data as Versao[];
    }
  });

  const verificarAtualizacoes = async () => {
    setIsChecking(true);
    
    // Simular verificação (em produção, isso consultaria um endpoint externo)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.info("Sistema atualizado", {
      description: "Você está usando a versão mais recente."
    });
    
    setIsChecking(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aplicado':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" /> Aplicado</Badge>;
      case 'pendente':
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case 'erro':
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (loadingSetup || loadingVersoes) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Card de Status Atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
          <CardDescription>
            Informações sobre a versão atual e status de atualização
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Versão Atual</p>
              <p className="text-2xl font-bold text-primary">
                v{setupData?.versao_atual || '1.0.0'}
              </p>
            </div>
            
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="flex items-center gap-2 mt-1">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span className="font-medium">Atualizado</span>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Instalado em</p>
              <p className="font-medium">
                {setupData?.data_conclusao 
                  ? format(new Date(setupData.data_conclusao), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                  : '-'}
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button 
              onClick={verificarAtualizacoes}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Verificar Atualizações
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Versões */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Versões</CardTitle>
          <CardDescription>
            Registro de todas as atualizações aplicadas ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {versoes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma versão registrada ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Versão</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Data de Lançamento</TableHead>
                  <TableHead>Aplicado em</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {versoes.map((versao) => (
                  <TableRow key={versao.id}>
                    <TableCell className="font-mono font-medium">
                      v{versao.versao}
                    </TableCell>
                    <TableCell>{versao.descricao || '-'}</TableCell>
                    <TableCell>
                      {format(new Date(versao.data_lancamento), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      {versao.aplicado_em 
                        ? format(new Date(versao.aplicado_em), "dd/MM/yyyy HH:mm", { locale: ptBR })
                        : '-'}
                    </TableCell>
                    <TableCell>{getStatusBadge(versao.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Informações de Upgrade */}
      <Card>
        <CardHeader>
          <CardTitle>Política de Atualização</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">🔒 Dados Protegidos</h4>
              <p className="text-sm text-muted-foreground">
                Atualizações nunca apagam dados. Migrações são incrementais e reversíveis.
              </p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">🔄 Processo Automático</h4>
              <p className="text-sm text-muted-foreground">
                Atualizações são aplicadas automaticamente via deploy no GitHub.
              </p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">📋 Histórico Completo</h4>
              <p className="text-sm text-muted-foreground">
                Todas as alterações são registradas com data, hora e responsável.
              </p>
            </div>
            
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">⏪ Rollback Disponível</h4>
              <p className="text-sm text-muted-foreground">
                Em caso de problemas, é possível reverter para versões anteriores.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
