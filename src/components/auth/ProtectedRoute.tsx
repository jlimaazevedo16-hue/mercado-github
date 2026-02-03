import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { useSetupStatus } from '@/hooks/useSetupStatus';

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
  const { isInstalled, loading: setupLoading } = useSetupStatus();

  if (authLoading || roleLoading || setupLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If system is not installed, redirect to setup (unless already there)
  if (!isInstalled && location.pathname !== '/setup') {
    return <Navigate to="/setup" replace />;
  }

  // If system IS installed, block access to setup page
  if (isInstalled && location.pathname === '/setup') {
    return <Navigate to="/" replace />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Se for admin master, tem acesso total
  if (role === 'administrador_master') {
    return <>{children}</>;
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
