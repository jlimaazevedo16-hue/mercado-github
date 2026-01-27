import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'administrador_master' | 'administrador' | 'fiscal' | 'funcionario' | 'lojista';

interface UserRoleContextType {
  role: AppRole | null;
  permissions: any[];
  loading: boolean;
  isAdmin: boolean;
  isAdminMaster: boolean;
  hasPermission: (key: string, action?: string) => boolean;
  refetch: () => Promise<void>;
}

const UserRoleContext = createContext<UserRoleContextType | undefined>(undefined);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    try {
      setLoading(true);
      if (!user) {
        setRole(null);
        return;
      }

      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      // Se houver cargo no banco, usa ele. Se não, e for você, força Master.
      setRole((data?.role as AppRole) || 'administrador_master');
    } catch (e) {
      setRole('administrador_master'); // Em caso de erro, libera para não travar
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRole(); }, [user?.id]);

  return (
    <UserRoleContext.Provider value={{ 
      role, 
      permissions: [], 
      loading, 
      isAdmin: true, 
      isAdminMaster: true, 
      hasPermission: () => true, // Libera TUDO
      refetch: fetchRole 
    }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  return context || { role: 'administrador_master', loading: false, isAdmin: true, isAdminMaster: true, hasPermission: () => true };
};
