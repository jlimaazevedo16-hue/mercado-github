import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface ExportButtonProps {
  onClick: () => void;
  disabled?: boolean;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  permissionKey?: string;
  className?: string;
}

export function ExportButton({
  onClick,
  disabled,
  size = 'sm',
  variant = 'outline',
  permissionKey,
  className,
}: ExportButtonProps) {
  const { hasPermission, role } = useUserRole();

  // Check permission
  const canExport = role === 'administrador_master' || 
    (permissionKey ? hasPermission(permissionKey, 'view') : true);

  if (!canExport) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline ml-2">Exportar</span>
    </Button>
  );
}
