import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useUserRole } from "@/hooks/useUserRole";
import { UserPermissionsDialog } from "@/components/gestao-usuarios/UserPermissionsDialog";
import { PromoteMasterDialog } from "@/components/gestao-usuarios/PromoteMasterDialog";
import { UserPlus, Shield, Users, History, Search, Settings2, Lock, AlertTriangle, Crown } from "lucide-react";

type AppRole = 'administrador' | 'administrador_master' | 'fiscal' | 'funcionario' | 'lojista';

interface Profile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  ativo: boolean;
  created_at: string;
  user_roles: { role: AppRole }[];
}

interface Permission {
  id: string;
  role: AppRole;
  permission_key: string;
  can_view: boolean;
  can_edit: boolean;
}

interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  table_name: string | null;
  record_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
  profiles?: { nome: string; email: string } | null;
}

const ROLE_LABELS: Record<AppRole, string> = {
  administrador_master: 'Administrador Master',
  administrador: 'Administrador',
  fiscal: 'Fiscal',
  funcionario: 'Funcionário',
  lojista: 'Lojista'
};

const PERMISSION_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  boxes: 'Boxes',
  planta_baixa: 'Planta Baixa',
  responsaveis: 'Responsáveis',
  documentos: 'Documentos',
  almoxarifado: 'Almoxarifado',
  observatorio: 'Observatório',
  notificacoes: 'Notificações',
  pads: 'PAD',
  pendencias: 'Pendências',
  frequencia: 'Frequência',
  whatsapp: 'WhatsApp',
  financeiro: 'Financeiro',
  configuracoes: 'Configurações',
  gestao_usuarios: 'Gestão de Usuários',
  relatorios: 'Relatórios'
};

export default function GestaoUsuarios() {
  const [activeItem, setActiveItem] = useState("gestao-usuarios");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isPermissionsDialogOpen, setIsPermissionsDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<{
    id: string;
    user_id: string;
    nome: string;
    email: string;
    role: string;
  } | null>(null);
  const [promoteMasterDialogOpen, setPromoteMasterDialogOpen] = useState(false);
  const [userToPromote, setUserToPromote] = useState<{ user_id: string; nome: string; email: string } | null>(null);
  const [newUserData, setNewUserData] = useState({ nome: '', email: '', password: '', role: 'funcionario' as AppRole });
  
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const { isAdminMaster } = useUserRole();
  const queryClient = useQueryClient();

  // Fetch users with their roles
  const { data: users = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['users-management'],
    queryFn: async () => {
      // Fetch profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (profilesError) throw profilesError;

      // Fetch roles for all users from user_roles table
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
      }

      // Combine data
      const usersWithRoles = (profilesData || []).map(profile => ({
        ...profile,
        user_roles: (rolesData || []).filter(r => r.user_id === profile.user_id)
      }));

      return usersWithRoles as Profile[];
    }
  });

  // Fetch permissions
  const { data: permissions = [], isLoading: loadingPermissions } = useQuery({
    queryKey: ['role-permissions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('role_permissions')
        .select('*')
        .order('role');
      
      if (error) throw error;
      return (data || []) as Permission[];
    }
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['audit-logs'],
    queryFn: async () => {
      const { data: logsData, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (logsError) throw logsError;

      // Fetch profiles for logs
      const userIds = [...new Set((logsData || []).map(l => l.user_id).filter(Boolean))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, nome, email')
        .in('user_id', userIds);

      // Combine data
      const logsWithProfiles = (logsData || []).map(log => ({
        ...log,
        profiles: profilesData?.find(p => p.user_id === log.user_id) || null
      }));

      return logsWithProfiles as AuditLog[];
    }
  });

  // Update user role mutation - uses edge function for proper permissions
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: AppRole }) => {
      // Use edge function to update role with service role key
      const { data, error } = await supabase.functions.invoke('set-user-role', {
        body: { user_id: userId, role: newRole }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      return data;
    },
    onSuccess: async (_, variables) => {
      // Force immediate refetch to update UI
      await queryClient.refetchQueries({ queryKey: ['users-management'] });
      logAction({
        action: 'UPDATE_USER_ROLE',
        tableName: 'user_roles',
        recordId: variables.userId,
        newValues: { role: variables.newRole }
      });
      toast({ title: 'Perfil atualizado com sucesso' });
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast({ title: 'Erro ao atualizar perfil', description: String(error), variant: 'destructive' });
    }
  });

  // Update user status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ userId, ativo }: { userId: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ativo })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      logAction({
        action: variables.ativo ? 'ACTIVATE_USER' : 'DEACTIVATE_USER',
        tableName: 'profiles',
        recordId: variables.userId,
        newValues: { ativo: variables.ativo }
      });
      toast({ title: variables.ativo ? 'Usuário ativado' : 'Usuário desativado' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar status', description: String(error), variant: 'destructive' });
    }
  });

  // Update permission mutation
  const updatePermissionMutation = useMutation({
    mutationFn: async ({ id, field, value }: { id: string; field: 'can_view' | 'can_edit'; value: boolean }) => {
      const { error } = await supabase
        .from('role_permissions')
        .update({ [field]: value })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['role-permissions'] });
      logAction({
        action: 'UPDATE_PERMISSION',
        tableName: 'role_permissions'
      });
      toast({ title: 'Permissão atualizada' });
    },
    onError: (error) => {
      toast({ title: 'Erro ao atualizar permissão', description: String(error), variant: 'destructive' });
    }
  });

  // Create user - this would typically be done via an Edge Function for security
  const handleCreateUser = async () => {
    try {
      // For now, we'll create the user via Supabase auth
      // In production, this should be an admin-only Edge Function
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUserData.email,
        password: newUserData.password,
        options: {
          data: { nome: newUserData.nome }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        // Update or insert the role (using upsert to handle race conditions with trigger)
        await supabase
          .from('user_roles')
          .upsert({ user_id: authData.user.id, role: newUserData.role }, { onConflict: 'user_id' });

        // Update the profile name
        await supabase
          .from('profiles')
          .update({ nome: newUserData.nome })
          .eq('user_id', authData.user.id);

        logAction({
          action: 'CREATE_USER',
          tableName: 'profiles',
          recordId: authData.user.id,
          newValues: { nome: newUserData.nome, email: newUserData.email, role: newUserData.role }
        });
      }

      queryClient.invalidateQueries({ queryKey: ['users-management'] });
      setIsCreateDialogOpen(false);
      setNewUserData({ nome: '', email: '', password: '', role: 'funcionario' });
      toast({ title: 'Usuário criado com sucesso' });
    } catch (error) {
      toast({ title: 'Erro ao criar usuário', description: String(error), variant: 'destructive' });
    }
  };

  const filteredUsers = users.filter(u => 
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadgeVariant = (role: AppRole) => {
    switch (role) {
      case 'administrador': return 'destructive';
      case 'fiscal': return 'default';
      case 'funcionario': return 'secondary';
    }
  };

  const groupedPermissions = (['administrador', 'fiscal', 'funcionario'] as AppRole[]).map(role => ({
    role,
    permissions: permissions.filter(p => p.role === role)
  }));

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar activeItem={activeItem} onItemClick={setActiveItem} />
      
      <div className="flex-1 flex flex-col">
        <Header />
        
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Gestão de Usuários</h1>
                <p className="text-muted-foreground">Gerencie usuários, perfis e permissões do sistema</p>
              </div>
            </div>

            <Tabs defaultValue="usuarios" className="space-y-4">
              <TabsList>
                <TabsTrigger value="usuarios" className="gap-2">
                  <Users className="h-4 w-4" />
                  Usuários
                </TabsTrigger>
                <TabsTrigger value="permissoes" className="gap-2">
                  <Shield className="h-4 w-4" />
                  Permissões
                </TabsTrigger>
                <TabsTrigger value="auditoria" className="gap-2">
                  <History className="h-4 w-4" />
                  Auditoria
                </TabsTrigger>
              </TabsList>

              {/* Users Tab */}
              <TabsContent value="usuarios" className="space-y-4">
                <Card>
                  <CardHeader>
                <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Usuários do Sistema</CardTitle>
                        <CardDescription>Lista de todos os usuários cadastrados</CardDescription>
                      </div>
                      {isAdminMaster && (
                        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="gap-2">
                              <UserPlus className="h-4 w-4" />
                              Novo Usuário
                            </Button>
                          </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Criar Novo Usuário</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Nome</Label>
                              <Input 
                                value={newUserData.nome}
                                onChange={(e) => setNewUserData({ ...newUserData, nome: e.target.value })}
                                placeholder="Nome completo"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Email</Label>
                              <Input 
                                type="email"
                                value={newUserData.email}
                                onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                                placeholder="email@exemplo.com"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Senha</Label>
                              <Input 
                                type="password"
                                value={newUserData.password}
                                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                                placeholder="Senha de acesso"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Perfil</Label>
                              <Select 
                                value={newUserData.role}
                                onValueChange={(value: AppRole) => setNewUserData({ ...newUserData, role: value })}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="administrador_master">
                                    <div className="flex items-center gap-2">
                                      <Shield className="h-3 w-3 text-amber-500" />
                                      Administrador Master
                                    </div>
                                  </SelectItem>
                                  <SelectItem value="administrador">Administrador</SelectItem>
                                  <SelectItem value="fiscal">Fiscal</SelectItem>
                                  <SelectItem value="funcionario">Funcionário</SelectItem>
                                  <SelectItem value="lojista">Lojista</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                              Cancelar
                            </Button>
                            <Button onClick={handleCreateUser}>
                              Criar Usuário
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          placeholder="Buscar por nome ou email..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    
                    {loadingUsers ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Perfil</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Criado em</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredUsers.map((user) => (
                            <TableRow key={user.id}>
                              <TableCell className="font-medium">{user.nome}</TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                {user.user_roles?.[0]?.role === 'administrador_master' ? (
                                  <Badge className="bg-amber-500 text-white">
                                    <Shield className="h-3 w-3 mr-1" />
                                    Admin Master
                                  </Badge>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={user.user_roles?.[0]?.role || 'funcionario'}
                                      onValueChange={(value: AppRole) => {
                                        // If promoting to master, open confirmation dialog
                                        if (value === 'administrador_master') {
                                          setUserToPromote({
                                            user_id: user.user_id,
                                            nome: user.nome,
                                            email: user.email,
                                          });
                                          setPromoteMasterDialogOpen(true);
                                        } else {
                                          updateRoleMutation.mutate({ userId: user.user_id, newRole: value });
                                        }
                                      }}
                                      disabled={!isAdminMaster}
                                    >
                                      <SelectTrigger className="w-[140px]">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="administrador_master">
                                          <div className="flex items-center gap-2">
                                            <Crown className="h-3 w-3 text-amber-500" />
                                            Admin Master
                                          </div>
                                        </SelectItem>
                                        <SelectItem value="administrador">Administrador</SelectItem>
                                        <SelectItem value="fiscal">Fiscal</SelectItem>
                                        <SelectItem value="funcionario">Funcionário</SelectItem>
                                        <SelectItem value="lojista">Lojista</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Switch
                                    checked={user.ativo}
                                    onCheckedChange={(checked) => 
                                      updateStatusMutation.mutate({ userId: user.user_id, ativo: checked })
                                    }
                                    disabled={!isAdminMaster || user.user_roles?.[0]?.role === 'administrador_master'}
                                  />
                                  <span className={user.ativo ? 'text-green-600' : 'text-muted-foreground'}>
                                    {user.ativo ? 'Ativo' : 'Inativo'}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {new Date(user.created_at).toLocaleDateString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-1">
                                  {user.user_roles?.[0]?.role !== 'administrador_master' && isAdminMaster && (
                                    <Button 
                                      variant="ghost" 
                                      size="icon"
                                      title="Permissões granulares"
                                      onClick={() => {
                                        const userRole = user.user_roles?.[0]?.role || 'funcionario';
                                        setSelectedUserForPermissions({
                                          id: user.id,
                                          user_id: user.user_id,
                                          nome: user.nome,
                                          email: user.email,
                                          role: userRole
                                        });
                                        setIsPermissionsDialogOpen(true);
                                      }}
                                    >
                                      <Settings2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                  {user.user_roles?.[0]?.role === 'administrador_master' && (
                                    <span title="Permissões protegidas">
                                      <Lock className="h-4 w-4 text-muted-foreground" />
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="permissoes" className="space-y-4">
                {!isAdminMaster && (
                  <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
                    <Lock className="h-4 w-4 text-amber-600" />
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                      Apenas o <strong>Administrador Master</strong> pode alterar permissões de perfis.
                    </AlertDescription>
                  </Alert>
                )}
                
                {groupedPermissions.map(({ role, permissions: rolePerms }) => (
                  <Card key={role}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Badge variant={getRoleBadgeVariant(role)}>
                          {ROLE_LABELS[role]}
                        </Badge>
                        Permissões
                      </CardTitle>
                      <CardDescription>
                        {role === 'administrador' 
                          ? 'Administradores têm acesso total ao sistema (exceto gestão de usuários)'
                          : `Configure as permissões de acesso para o perfil ${ROLE_LABELS[role]}`
                        }
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Módulo</TableHead>
                            <TableHead className="text-center">Visualizar</TableHead>
                            <TableHead className="text-center">Editar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {rolePerms.map((perm) => (
                            <TableRow key={perm.id}>
                              <TableCell className="font-medium">
                                {PERMISSION_LABELS[perm.permission_key] || perm.permission_key}
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={perm.can_view}
                                  onCheckedChange={(checked) => 
                                    updatePermissionMutation.mutate({ 
                                      id: perm.id, 
                                      field: 'can_view', 
                                      value: checked 
                                    })
                                  }
                                  disabled={!isAdminMaster || role === 'administrador'}
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                <Switch
                                  checked={perm.can_edit}
                                  onCheckedChange={(checked) => 
                                    updatePermissionMutation.mutate({ 
                                      id: perm.id, 
                                      field: 'can_edit', 
                                      value: checked 
                                    })
                                  }
                                  disabled={!isAdminMaster || role === 'administrador'}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              {/* Audit Log Tab */}
              <TabsContent value="auditoria" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Log de Auditoria</CardTitle>
                    <CardDescription>
                      Histórico de todas as ações realizadas no sistema
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loadingLogs ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data/Hora</TableHead>
                            <TableHead>Usuário</TableHead>
                            <TableHead>Ação</TableHead>
                            <TableHead>Tabela</TableHead>
                            <TableHead>Detalhes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {auditLogs.map((log) => (
                            <TableRow key={log.id}>
                              <TableCell>
                                {new Date(log.created_at).toLocaleString('pt-BR')}
                              </TableCell>
                              <TableCell>
                                {log.profiles?.nome || log.profiles?.email || 'Sistema'}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{log.action}</Badge>
                              </TableCell>
                              <TableCell>{log.table_name || '-'}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {log.new_values ? JSON.stringify(log.new_values) : '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* User Permissions Dialog */}
            <UserPermissionsDialog
              open={isPermissionsDialogOpen}
              onOpenChange={setIsPermissionsDialogOpen}
              user={selectedUserForPermissions}
            />

            {/* Promote Master Dialog */}
            <PromoteMasterDialog
              open={promoteMasterDialogOpen}
              onOpenChange={setPromoteMasterDialogOpen}
              targetUser={userToPromote}
              onSuccess={() => {
                queryClient.invalidateQueries({ queryKey: ['users-management'] });
              }}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
