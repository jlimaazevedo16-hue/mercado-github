-- Tabela para permissões específicas por usuário (override das permissões de role)
CREATE TABLE public.user_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, permission_key)
);

-- Enable RLS
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Admin master can manage all user permissions"
ON public.user_permissions
FOR ALL
USING (public.is_admin_master(auth.uid()))
WITH CHECK (public.is_admin_master(auth.uid()));

CREATE POLICY "Admins can manage user permissions"
ON public.user_permissions
FOR ALL
USING (
  public.has_role(auth.uid(), 'administrador'::app_role) OR
  public.has_role(auth.uid(), 'administrador_master'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'administrador'::app_role) OR
  public.has_role(auth.uid(), 'administrador_master'::app_role)
);

-- Usuários podem ver suas próprias permissões
CREATE POLICY "Users can view own permissions"
ON public.user_permissions
FOR SELECT
USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_permissions_updated_at
BEFORE UPDATE ON public.user_permissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Função para verificar permissão do usuário (considerando override)
CREATE OR REPLACE FUNCTION public.get_user_permission(
  _user_id UUID,
  _permission_key TEXT,
  _action TEXT DEFAULT 'view'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  has_override BOOLEAN;
  override_value BOOLEAN;
  role_value BOOLEAN;
BEGIN
  -- Admin master sempre tem acesso total
  IF is_admin_master(_user_id) THEN
    RETURN TRUE;
  END IF;

  -- Buscar role do usuário
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_roles.user_id = _user_id;

  IF user_role IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Verificar se existe override para o usuário
  SELECT TRUE,
    CASE WHEN _action = 'edit' THEN can_edit ELSE can_view END
  INTO has_override, override_value
  FROM user_permissions
  WHERE user_permissions.user_id = _user_id
    AND permission_key = _permission_key;

  -- Se existe override, usar esse valor
  IF has_override THEN
    RETURN override_value;
  END IF;

  -- Caso contrário, usar permissão da role
  SELECT CASE WHEN _action = 'edit' THEN can_edit ELSE can_view END
  INTO role_value
  FROM role_permissions
  WHERE role = user_role
    AND permission_key = _permission_key;

  RETURN COALESCE(role_value, FALSE);
END;
$$;