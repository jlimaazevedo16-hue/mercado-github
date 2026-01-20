-- Add pendencias permission for all roles
INSERT INTO role_permissions (role, permission_key, can_view, can_edit)
VALUES 
  ('administrador', 'pendencias', true, true),
  ('fiscal', 'pendencias', true, true),
  ('funcionario', 'pendencias', true, false)
ON CONFLICT (role, permission_key) DO UPDATE SET can_view = EXCLUDED.can_view, can_edit = EXCLUDED.can_edit;