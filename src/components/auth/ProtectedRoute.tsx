import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSetupStatus } from '@/hooks/useSetupStatus';
import { SetupRequired } from '@/components/setup/SetupRequired';

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
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const { hasPermission, role, loading: roleLoading } = useUserRole();
  const { setupConcluido, loading: setupLoading } = useSetupStatus();

  if (authLoading || roleLoading || setupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se for admin master, ignora verificação de setup para acessar configurações
  if (role === 'administrador_master') {
    return <>{children}</>;
  }

  // Verificar se o setup foi concluído (exceto para a página de configurações)
  const isConfigPage = location.pathname.startsWith('/configuracoes');
  if (!setupConcluido && !isConfigPage) {
    return <SetupRequired />;
  }

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
