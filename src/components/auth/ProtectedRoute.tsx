import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  requiredAction?: 'view' | 'edit';
}

export const ProtectedRoute = ({ 
  children, 
  requiredPermission,
  requiredAction = 'view'
}: ProtectedRouteProps) => {
  const { session, loading: authLoading } = useAuth();
  // Adicionamos o 'role' aqui, vindo do seu hook de permissões
  const { hasPermission, role, loading: roleLoading } = useUserRole();

  if (authLoading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // --- IMPLEMENTAÇÃO DA AÇÃO 2 ---
  // Se for admin master, ignora qualquer outra restrição e libera o acesso
  if (role === 'administrador_master') {
    return <>{children}</>;
  }
  // -------------------------------

  // Check permission if required
  if (requiredPermission && !hasPermission(requiredPermission, requiredAction)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
