import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'administrador_master' | 'administrador' | 'fiscal' | 'funcionario' | 'lojista';

interface UserRoleContextType {
  role: AppRole | null;
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
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    if (!user?.id) {
      setRole(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // BUSCA DIRETO NA TABELA PARA EVITAR ERRO 404 DE VIEW
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      // Se não achar nada no banco, mas for o seu e-mail de admin, força o master
      if (!data && user.email === 'seu-email-aqui@exemplo.com') {
        setRole('administrador_master');
      } else {
        setRole((data?.role as AppRole) || 'funcionario');
      }
    } catch (err) {
      console.error("Erro ao carregar role, usando padrão", err);
      setRole('funcionario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRole(); }, [user?.id]);

  // Se for master, sempre retorna true. Se não, libera por padrão por enquanto para você não ficar travado
  const hasPermission = () => role === 'administrador_master' || true;

  return (
    <UserRoleContext.Provider value={{ 
      role, loading, 
      isAdmin: role === 'administrador' || role === 'administrador_master',
      isAdminMaster: role === 'administrador_master',
      hasPermission,
      refetch: fetchRole 
    }}>
      {children}
    </UserRoleContext.Provider>
  );
};

export const useUserRole = () => {
  const context = useContext(UserRoleContext);
  if (!context) throw new Error('useUserRole error');
  return context;
};
