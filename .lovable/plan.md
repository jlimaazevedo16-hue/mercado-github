# Plano: Setup Wizard e Gestão de Múltiplos Masters

## ✅ Implementado

### Banco de Dados
- Coluna `master_users_count` adicionada à tabela `sistema_setup`
- Funções PostgreSQL criadas:
  - `is_system_installed()` - verifica se o sistema está instalado
  - `get_master_users_count()` - retorna contagem de masters
  - `increment_master_count()` - incrementa contador
  - `decrement_master_count()` - decrementa contador
- Políticas RLS para `sistema_setup`

### Edge Functions
- `initial-setup` - Configura o primeiro usuário Master
- `promote-master` - Promove usuário a Master com confirmação de senha

### Frontend
- Página `/setup` - Wizard de configuração inicial
- `useSetupStatus` hook atualizado com `isInstalled` e `masterUsersCount`
- `ProtectedRoute` bloqueia acesso quando sistema não instalado
- `PromoteMasterDialog` - Diálogo seguro de promoção a Master
- Gestão de Usuários atualizada para usar confirmação de senha

### Fluxo
1. Sistema inicia não-instalado → redireciona para `/setup`
2. Usuário preenche dados da associação + credenciais Master
3. Edge function cria usuário, profile, role e marca como instalado
4. Após instalação, `/setup` fica bloqueado permanentemente
5. Masters podem promover outros usuários via diálogo seguro

### Segurança
- Promoção a Master requer confirmação de senha do Master atual
- Todas as ações são registradas em `audit_logs`
- Último Master não pode ser removido
- Badge visual "MASTER" no header
