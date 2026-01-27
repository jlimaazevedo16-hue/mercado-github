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

      let userRole: AppRole = 'funcionario';

      if (roleError) {
        console.error('Erro ao buscar cargo:', roleError);
      } else if (roleData?.role) {
        userRole = roleData.role as AppRole;
      }
      
      // --- LINHAS DE DEBUG (PASSO 1) ---
      console.log("=== DEBUG DE ACESSO ===");
      console.log("Seu ID no Supabase:", user?.id);
      console.log("Cargo que o sistema leu do banco:", userRole);
      // ---------------------------------

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
      setRole('
