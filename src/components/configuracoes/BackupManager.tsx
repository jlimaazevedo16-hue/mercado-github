import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Database, 
  Download, 
  RefreshCw, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  HardDrive,
  Shield,
  Loader2
} from "lucide-react";

interface Backup {
  id: string;
  nome: string;
  descricao: string | null;
  arquivo_url: string | null;
  tamanho_bytes: number | null;
  tabelas_incluidas: string[] | null;
  total_registros: number | null;
  status: string | null;
  created_at: string;
  completed_at: string | null;
}

export function BackupManager() {
  const { isAdminMaster } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState<string | null>(null);
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (isAdminMaster) {
      fetchBackups();
    }
  }, [isAdminMaster]);

  const fetchBackups = async () => {
    try {
      const { data, error } = await supabase
        .from('system_backups')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os backups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createBackup = async () => {
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Não autenticado');

      const response = await supabase.functions.invoke('system-backup', {
        body: { action: 'create' },
      });

      if (response.error) throw response.error;

      toast({
        title: "Backup criado",
        description: `${response.data.total_registros} registros salvos com sucesso`,
      });

      fetchBackups();
    } catch (error: unknown) {
      console.error('Error creating backup:', error);
      toast({
        title: "Erro ao criar backup",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRestoreClick = (backup: Backup) => {
    setSelectedBackup(backup);
    setShowRestoreDialog(true);
  };

  const restoreBackup = async () => {
    if (!selectedBackup) return;
    
    setRestoring(selectedBackup.id);
    setShowRestoreDialog(false);
    
    try {
      const response = await supabase.functions.invoke('system-backup', {
        body: { action: 'restore', backupId: selectedBackup.id },
      });

      if (response.error) throw response.error;

      toast({
        title: "Backup restaurado",
        description: `${response.data.restored_records} registros restaurados com sucesso`,
      });
    } catch (error: unknown) {
      console.error('Error restoring backup:', error);
      toast({
        title: "Erro ao restaurar backup",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setRestoring(null);
      setSelectedBackup(null);
    }
  };

  const handleDeleteClick = (backup: Backup) => {
    setSelectedBackup(backup);
    setShowDeleteDialog(true);
  };

  const deleteBackup = async () => {
    if (!selectedBackup) return;
    
    setDeleting(true);
    
    try {
      // Delete from storage
      await supabase.storage
        .from('system-backups')
        .remove([`${selectedBackup.nome}.json`]);

      // Delete record
      const { error } = await supabase
        .from('system_backups')
        .delete()
        .eq('id', selectedBackup.id);

      if (error) throw error;

      toast({
        title: "Backup excluído",
        description: "O backup foi removido permanentemente",
      });

      fetchBackups();
    } catch (error) {
      console.error('Error deleting backup:', error);
      toast({
        title: "Erro ao excluir backup",
        description: "Não foi possível excluir o backup",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setSelectedBackup(null);
    }
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return '-';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'concluido':
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" /> Concluído</Badge>;
      case 'em_progresso':
        return <Badge className="bg-blue-500"><Clock className="h-3 w-3 mr-1" /> Em progresso</Badge>;
      case 'erro':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Erro</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!isAdminMaster) {
    return (
      <Card>
        <CardContent className="py-10 text-center">
          <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Acesso Restrito</h3>
          <p className="text-muted-foreground">
            Apenas o Administrador Master pode acessar o gerenciamento de backups.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Gerenciamento de Backups
              </CardTitle>
              <CardDescription>
                Crie e restaure backups completos do sistema
              </CardDescription>
            </div>
            <Button onClick={createBackup} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <HardDrive className="h-4 w-4 mr-2" />
                  Criar Backup
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-10">
              <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum backup encontrado</h3>
              <p className="text-muted-foreground mb-4">
                Crie seu primeiro backup para proteger seus dados
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.nome}</TableCell>
                      <TableCell>{getStatusBadge(backup.status)}</TableCell>
                      <TableCell>{backup.total_registros?.toLocaleString() || '-'}</TableCell>
                      <TableCell>{formatBytes(backup.tamanho_bytes)}</TableCell>
                      <TableCell>
                        {format(new Date(backup.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {backup.arquivo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(backup.arquivo_url!, '_blank')}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRestoreClick(backup)}
                            disabled={backup.status !== 'concluido' || restoring === backup.id}
                          >
                            {restoring === backup.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(backup)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mobile Card View */}
      <div className="sm:hidden space-y-4">
        {backups.map((backup) => (
          <Card key={backup.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-medium text-sm">{backup.nome}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(backup.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </p>
                </div>
                {getStatusBadge(backup.status)}
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-muted-foreground">Registros:</span>
                  <span className="ml-1">{backup.total_registros?.toLocaleString() || '-'}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Tamanho:</span>
                  <span className="ml-1">{formatBytes(backup.tamanho_bytes)}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {backup.arquivo_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => window.open(backup.arquivo_url!, '_blank')}
                  >
                    <Download className="h-4 w-4 mr-1" /> Baixar
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleRestoreClick(backup)}
                  disabled={backup.status !== 'concluido' || restoring === backup.id}
                >
                  {restoring === backup.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-1" /> Restaurar
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Restore Confirmation Dialog */}
      <Dialog open={showRestoreDialog} onOpenChange={setShowRestoreDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Confirmar Restauração
            </DialogTitle>
            <DialogDescription>
              <strong className="text-destructive">ATENÇÃO:</strong> Esta ação irá substituir todos os dados atuais pelos dados do backup selecionado. Esta operação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="bg-muted p-4 rounded-lg">
              <p><strong>Backup:</strong> {selectedBackup.nome}</p>
              <p><strong>Data:</strong> {format(new Date(selectedBackup.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
              <p><strong>Registros:</strong> {selectedBackup.total_registros?.toLocaleString()}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRestoreDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={restoreBackup}>
              Sim, Restaurar Backup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Backup</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este backup permanentemente?
            </DialogDescription>
          </DialogHeader>
          {selectedBackup && (
            <div className="bg-muted p-4 rounded-lg">
              <p><strong>Backup:</strong> {selectedBackup.nome}</p>
              <p><strong>Data:</strong> {format(new Date(selectedBackup.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={deleteBackup} disabled={deleting}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Excluir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
