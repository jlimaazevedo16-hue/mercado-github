import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { AlertCircle, Eye, Pencil, RotateCcw } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface UserPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    user_id: string;
    nome: string;
    email: string;
    role: string;
  } | null;
}

interface PermissionState {
  permission_key: string;
  can_view: boolean;
  can_edit: boolean;
  isOverride: boolean;
  roleDefault: {
    can_view: boolean;
    can_edit: boolean;
  };
}

const PERMISSION_LABELS: Record<string, { label: string; category: string }> = {
  dashboard: { label: 'Dashboard', category: 'Geral' },
  boxes: { label: 'Boxes', category: 'Gestão' },
  planta_baixa: { label: 'Planta Baixa', category: 'Gestão' },
  responsaveis: { label: 'Responsáveis', category: 'Gestão' },
  documentos: { label: 'Documentos', category: 'Gestão' },
  almoxarifado: { label: 'Almoxarifado', category: 'Operacional' },
  observatorio: { label: 'Observatório', category: 'Operacional' },
  notificacoes: { label: 'Notificações', category: 'Fiscalização' },
  pads: { label: 'PAD', category: 'Fiscalização' },
  pendencias: { label: 'Pendências', category: 'Fiscalização' },
  frequencia: { label: 'Frequência', category: 'Administrativo' },
  whatsapp: { label: 'WhatsApp', category: 'Comunicação' },
  whatsapp_automacao: { label: 'WhatsApp Automação', category: 'Comunicação' },
  whatsapp_recebidas: { label: 'WhatsApp Recebidas', category: 'Comunicação' },
  whatsapp_relatorios: { label: 'WhatsApp Relatórios', category: 'Comunicação' },
  whatsapp_webhooks: { label: 'WhatsApp Webhooks', category: 'Comunicação' },
  financeiro: { label: 'Financeiro', category: 'Financeiro' },
  configuracoes: { label: 'Configurações', category: 'Sistema' },
  gestao_usuarios: { label: 'Gestão de Usuários', category: 'Sistema' },
  relatorios: { label: 'Relatórios', category: 'Geral' },
};

// Módulos que fiscal/funcionário NUNCA podem acessar
const RESTRICTED_MODULES = ['gestao_usuarios'];

export function UserPermissionsDialog({ open, onOpenChange, user }: UserPermissionsDialogProps) {
  const [permissions, setPermissions] = useState<PermissionState[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();

  type AppRole = 'administrador' | 'administrador_master' | 'fiscal' | 'funcionario' | 'lojista';

  // Fetch role permissions (defaults)
  const { data: rolePermissions = [] } = useQuery({
    queryKey: ['role-permissions', user?.role],
    queryFn: async () => {
      if (!user?.role) return [];
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission_key, can_view, can_edit')
        .eq('role', user.role as AppRole);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.role
  });

  // Fetch user-specific permissions (overrides)
  const { data: userPermissions = [], isLoading } = useQuery({
    queryKey: ['user-permissions', user?.user_id],
    queryFn: async () => {
      if (!user?.user_id) return [];
      const { data, error } = await supabase
        .from('user_permissions')
        .select('*')
        .eq('user_id', user.user_id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.user_id
  });

  // Build permissions state when data loads
  useEffect(() => {
    if (!rolePermissions.length) return;

    const permState: PermissionState[] = rolePermissions.map(rp => {
      const userOverride = userPermissions.find(up => up.permission_key === rp.permission_key);
      return {
        permission_key: rp.permission_key,
        can_view: userOverride ? userOverride.can_view : rp.can_view,
        can_edit: userOverride ? userOverride.can_edit : rp.can_edit,
        isOverride: !!userOverride,
        roleDefault: {
          can_view: rp.can_view,
          can_edit: rp.can_edit
        }
      };
    });

    setPermissions(permState);
    setHasChanges(false);
  }, [rolePermissions, userPermissions]);

  // Save mutations
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.user_id) return;

      const oldValues = userPermissions.reduce((acc, up) => {
        acc[up.permission_key] = { can_view: up.can_view, can_edit: up.can_edit };
        return acc;
      }, {} as Record<string, { can_view: boolean; can_edit: boolean }>);

      const newValues: Record<string, { can_view: boolean; can_edit: boolean }> = {};

      // For each permission, check if it differs from role default
      for (const perm of permissions) {
        const isDifferentFromRole = 
          perm.can_view !== perm.roleDefault.can_view || 
          perm.can_edit !== perm.roleDefault.can_edit;

        if (isDifferentFromRole) {
          newValues[perm.permission_key] = { can_view: perm.can_view, can_edit: perm.can_edit };
          
          // Upsert the override
          const { error } = await supabase
            .from('user_permissions')
            .upsert({
              user_id: user.user_id,
              permission_key: perm.permission_key,
              can_view: perm.can_view,
              can_edit: perm.can_edit,
              updated_at: new Date().toISOString()
            }, { 
              onConflict: 'user_id,permission_key' 
            });
          
          if (error) throw error;
        } else {
          // If it's back to default, remove the override
          const { error } = await supabase
            .from('user_permissions')
            .delete()
            .eq('user_id', user.user_id)
            .eq('permission_key', perm.permission_key);
          
          if (error) throw error;
        }
      }

      // Log the action
      await logAction({
        action: 'UPDATE_USER_PERMISSIONS',
        tableName: 'user_permissions',
        recordId: user.user_id,
        oldValues,
        newValues
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      toast({ title: 'Permissões atualizadas com sucesso' });
      setHasChanges(false);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({ 
        title: 'Erro ao salvar permissões', 
        description: String(error), 
        variant: 'destructive' 
      });
    }
  });

  const handlePermissionChange = (key: string, field: 'can_view' | 'can_edit', value: boolean) => {
    setPermissions(prev => prev.map(p => {
      if (p.permission_key !== key) return p;
      
      // If disabling view, also disable edit
      if (field === 'can_view' && !value) {
        return { ...p, can_view: false, can_edit: false };
      }
      
      return { ...p, [field]: value };
    }));
    setHasChanges(true);
  };

  const handleResetToDefault = (key: string) => {
    setPermissions(prev => prev.map(p => {
      if (p.permission_key !== key) return p;
      return {
        ...p,
        can_view: p.roleDefault.can_view,
        can_edit: p.roleDefault.can_edit
      };
    }));
    setHasChanges(true);
  };

  const handleResetAll = () => {
    setPermissions(prev => prev.map(p => ({
      ...p,
      can_view: p.roleDefault.can_view,
      can_edit: p.roleDefault.can_edit
    })));
    setHasChanges(true);
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, perm) => {
    const info = PERMISSION_LABELS[perm.permission_key] || { label: perm.permission_key, category: 'Outros' };
    if (!acc[info.category]) acc[info.category] = [];
    acc[info.category].push({ ...perm, label: info.label });
    return acc;
  }, {} as Record<string, (PermissionState & { label: string })[]>);

  const isRestricted = (key: string) => RESTRICTED_MODULES.includes(key);
  const canModify = user?.role === 'fiscal' || user?.role === 'funcionario';

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Permissões de {user.nome}
            <Badge variant="secondary">{user.role}</Badge>
          </DialogTitle>
          <DialogDescription>
            Configure permissões específicas para este usuário. Alterações sobrescrevem as permissões do perfil.
          </DialogDescription>
        </DialogHeader>

        {!canModify ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Administradores têm acesso total ao sistema. Permissões granulares estão disponíveis apenas para perfis Fiscal e Funcionário.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="flex justify-end gap-2 mb-2">
              <Button variant="outline" size="sm" onClick={handleResetAll}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar Padrões
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4">
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                Object.entries(groupedPermissions).map(([category, perms]) => (
                  <div key={category} className="border rounded-lg">
                    <div className="bg-muted px-4 py-2 font-medium border-b">{category}</div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Módulo</TableHead>
                          <TableHead className="text-center w-24">
                            <div className="flex items-center justify-center gap-1">
                              <Eye className="h-4 w-4" />
                              Ver
                            </div>
                          </TableHead>
                          <TableHead className="text-center w-24">
                            <div className="flex items-center justify-center gap-1">
                              <Pencil className="h-4 w-4" />
                              Editar
                            </div>
                          </TableHead>
                          <TableHead className="w-20"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {perms.map((perm) => {
                          const isDifferent = 
                            perm.can_view !== perm.roleDefault.can_view || 
                            perm.can_edit !== perm.roleDefault.can_edit;
                          const restricted = isRestricted(perm.permission_key);

                          return (
                            <TableRow key={perm.permission_key} className={isDifferent ? 'bg-accent/30' : ''}>
                              <TableCell className="font-medium">
                                {perm.label}
                                {restricted && (
                                  <Badge variant="destructive" className="ml-2 text-xs">
                                    Restrito
                                  </Badge>
                                )}
                                {isDifferent && !restricted && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    Personalizado
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={perm.can_view}
                                  onCheckedChange={(v) => handlePermissionChange(perm.permission_key, 'can_view', v)}
                                  disabled={restricted}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={perm.can_edit}
                                  onCheckedChange={(v) => handlePermissionChange(perm.permission_key, 'can_edit', v)}
                                  disabled={restricted || !perm.can_view}
                                />
                              </TableCell>
                              <TableCell>
                                {isDifferent && !restricted && (
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleResetToDefault(perm.permission_key)}
                                    title="Restaurar padrão"
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                ))
              )}
            </div>
          </>
        )}

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          {canModify && (
            <Button 
              onClick={() => saveMutation.mutate()} 
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Salvando...' : 'Salvar Permissões'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
