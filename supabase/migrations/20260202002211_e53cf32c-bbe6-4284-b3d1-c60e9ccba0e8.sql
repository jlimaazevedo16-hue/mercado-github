-- Atualizar permissões do perfil FISCAL conforme especificação
-- Remover permissões que não devem ter acesso

-- Desativar acesso a: almoxarifado, configuracoes, financeiro, observatorio, whatsapp, gestao_usuarios, relatorios
UPDATE role_permissions SET can_view = false, can_edit = false 
WHERE role = 'fiscal' AND permission_key IN ('almoxarifado', 'configuracoes', 'financeiro', 'observatorio', 'whatsapp', 'gestao_usuarios', 'relatorios');

-- Boxes: pode ver, não pode editar
UPDATE role_permissions SET can_view = true, can_edit = false 
WHERE role = 'fiscal' AND permission_key = 'boxes';

-- Dashboard: pode ver, não pode editar
UPDATE role_permissions SET can_view = true, can_edit = false 
WHERE role = 'fiscal' AND permission_key = 'dashboard';

-- Documentos: pode ver e editar (anexar)
UPDATE role_permissions SET can_view = true, can_edit = true 
WHERE role = 'fiscal' AND permission_key = 'documentos';

-- Responsaveis: pode ver, não pode editar dados sensíveis (será controlado no frontend)
UPDATE role_permissions SET can_view = true, can_edit = false 
WHERE role = 'fiscal' AND permission_key = 'responsaveis';

-- Notificacoes: pode ver e criar/editar
UPDATE role_permissions SET can_view = true, can_edit = true 
WHERE role = 'fiscal' AND permission_key = 'notificacoes';

-- Pendencias: pode ver e editar status
UPDATE role_permissions SET can_view = true, can_edit = true 
WHERE role = 'fiscal' AND permission_key = 'pendencias';

-- PADs: pode ver e criar, mas não pode julgar/arquivar (controle frontend)
UPDATE role_permissions SET can_view = true, can_edit = true 
WHERE role = 'fiscal' AND permission_key = 'pads';

-- Frequencia/Reunioes: pode ver, não pode criar/editar
UPDATE role_permissions SET can_view = true, can_edit = false 
WHERE role = 'fiscal' AND permission_key = 'frequencia';

-- Planta Baixa: pode ver
UPDATE role_permissions SET can_view = true, can_edit = false 
WHERE role = 'fiscal' AND permission_key = 'planta_baixa';