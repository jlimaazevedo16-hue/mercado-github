-- Add financeiro permissions for all roles
INSERT INTO public.role_permissions (role, permission_key, can_view, can_edit)
VALUES 
  ('administrador_master', 'financeiro', true, true),
  ('administrador', 'financeiro', true, true),
  ('fiscal', 'financeiro', true, false),
  ('funcionario', 'financeiro', true, false)
ON CONFLICT DO NOTHING;