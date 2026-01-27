import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'administrador_master' | 'administrador' | 'fiscal' | 'funcionario' | 'lojista';

interface Permission {
  permission_key: string;
  can_view: boolean;
  can_edit: boolean;
}

interface UserRoleContextType {
  role: AppRole | null;
  permissions: Permission[];
  loading: boolean;
  isAdmin: boolean;
  isAdminMaster: boolean;
  hasPermission: (key: string, action?: 'view' | 'edit') => boolean;
  refetch: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRoleAndPermissions = async () => {
    // Se não houver usuário logado, resetamos os estados
    if (!user?.id) {
      setRole(null);
      setPermissions([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // 1. Busca o cargo do usuário na view consolidada
      const { data: roleData, error: roleError } = await (supabase
        .from('user_roles_view' as any)
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle() as any);

      let userRole: AppRole = 'funcionario'; // Role padrão caso não encontre nada

      if (roleError) {
        console.error('Erro ao buscar cargo:', roleError);
      } else if (roleData?.role) {
        userRole = roleData.role as AppRole;
      }
      
      setRole(userRole);

      // 2. Busca as permissões associadas a esse cargo
      const { data: permData, error: permError } = await (supabase
        .from('role_permissions_view' as any)
        .select('permission_key, can_view, can_edit')
        .eq('role', userRole) as any);

      if (permError) {
        console.error('Erro ao buscar permissões:', permError);
        setPermissions([]);
      } else {
        setPermissions(permData || []);
      }

    } catch (error) {
      console.error('Erro crítico no fetchRoleAndPermissions:', error);
      setRole('funcionario');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  // Dispara a busca sempre que o usuário mudar (login/logout)
  useEffect(() => {
    fetchRoleAndPermissions();
  }, [user?.id]);

  const hasPermission = (key: string, action: 'view' | 'edit' = 'view'): boolean => {
    // Regra de Ouro: Administrador Master ignora qualquer restrição
    if (role === 'administrador_master') return true;
    
    const perm = permissions.find(p => p.permission_key === key);
    if (!perm) return false;
    
    return action === 'view' ? perm.can_view : perm.can_edit;
  };

  return (
    <UserRoleContext.Provider 
      value={{ 
        role, 
        permissions, 
        loading, 
        isAdmin: role === 'administrador' || role === 'administrador_master',
        isAdminMaster: role === 'administrador_master',
        hasPermission,
        refetch: fetchRoleAndPermissions
      }}
    >
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (context === undefined) {
    throw new Error('useUserRole deve ser usado dentro de um UserRoleProvider');
  }
  return context;
};
