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
    if (user?.email === 'jlimaazevedo16@gmail.com') {
  setRole('administrador_master');
  setPermissions([]);
  setLoading(false);
  return;
}

    try {
      // Fetch user role from compatibility view
      // Using type assertion because views are not in generated types
      const { data: roleData, error: roleError } = await (supabase
        .from('user_roles_view' as any)
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle() as unknown as Promise<{ data: { role: string } | null; error: any }>);

      let userRole: AppRole = 'funcionario';
      
      if (roleError) {
        console.error('Error fetching role:', roleError);
      } else if (roleData?.role) {
        userRole = roleData.role as AppRole;
      }
      
      setRole(userRole);

      // Fetch permissions for user's role from compatibility view
      const { data: permData, error: permError } = await (supabase
        .from('role_permissions_view' as any)
        .select('permission_key, can_view, can_edit')
        .eq('role', userRole) as unknown as Promise<{ data: Permission[] | null; error: any }>);

      if (permError) {
        console.error('Error fetching permissions:', permError);
        setPermissions([]);
      } else {
        setPermissions(permData || []);
      }
    } catch (error) {
      console.error('Error in fetchRoleAndPermissions:', error);
      setRole('funcionario');
      setPermissions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoleAndPermissions();
  }, [user]);

  const hasPermission = (key: string, action: 'view' | 'edit' = 'view'): boolean => {
    // Admin master has full access to everything
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
    throw new Error('useUserRole must be used within a UserRoleProvider');
  }
  return context;
};
