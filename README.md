# Mercado Municipal Digital

Sistema de gestão para associações, mercados municipais e centros comerciais públicos.

---

## 🧩 Visão Geral

O Mercado Municipal Digital é um sistema web pensado como produto replicável, permitindo:
- Gestão de boxes
- Gestão de lojistas e responsáveis
- Controle financeiro
- Notificações
- Documentos
- Auditoria
- Integrações (E-mail, WhatsApp, IA)

Cada instalação utiliza seu próprio banco de dados Supabase.

---

## 🚀 Requisitos

- VPS (Linux)
- Docker
- EasyPanel (ou similar)
- Conta Supabase
- Conta GitHub

---

## 📦 Estrutura do Projeto

```
/src → Código frontend
/supabase → Edge Functions e configurações
/docs → Documentação
.env.example → Exemplo de variáveis
```

---

## 🔐 Variáveis de Ambiente

Criar um arquivo `.env` com:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 🛠️ Instalação (Produção)

### 1️⃣ Subir o projeto no GitHub
- Criar repositório
- Enviar todo o código

---

### 2️⃣ Criar VPS
- Instalar Docker
- Instalar EasyPanel

---

### 3️⃣ Deploy no EasyPanel
- Conectar repositório GitHub
- Configurar variáveis de ambiente
- Definir porta padrão
- Executar deploy

---

### 4️⃣ Supabase
- Criar novo projeto Supabase
- Copiar URL e ANON KEY
- Informar no Setup Wizard inicial

---

## 🔌 Configuração de Portas

### Portas Recomendadas

| Serviço | Porta |
|---------|-------|
| Frontend (HTTP) | 3000 |
| Frontend (HTTPS) | 443 |
| Supabase | Externo |
| EasyPanel | 3001 |
| Evolution API | 8080 |

### Boas Práticas

- ✅ Sempre usar HTTPS em produção
- ✅ Usar reverse proxy (Nginx/Traefik)
- ✅ Uma porta por serviço
- ✅ Variáveis separadas por ambiente

---

## ⚙️ Primeira Configuração

Ao acessar o sistema pela primeira vez:
- O Setup Wizard será exibido automaticamente
- O primeiro usuário criado será o USUÁRIO MASTER
- O sistema só libera acesso após a conclusão

---

## 🔁 Política de Upgrade

### Princípios

- 📌 **Dados do cliente são imutáveis** - nunca são perdidos
- 📌 **Código pode evoluir** - atualizações contínuas
- 📌 **Banco nunca é resetado** - migrações incrementais

### Estratégia Técnica

| Aspecto | Abordagem |
|---------|-----------|
| Versionamento | Controle de versão do schema |
| Migrations | Incrementais e reversíveis |
| Compatibilidade | Backward compatibility obrigatória |
| Rollout | Feature flags quando necessário |

### Proteções de Segurança

- 🛡️ Bloqueio de comandos `DROP` destrutivos
- 🛡️ Logs completos de upgrade
- 🛡️ Rollback manual sempre possível

### Quem Pode Atualizar

Apenas usuários com role **MASTER** podem:
- Executar atualizações do sistema
- Acessar configurações críticas
- Gerenciar integrações
- Alterar parâmetros UFMS

---

## 🔒 Segurança

- Apenas usuários MASTER acessam configurações críticas
- Auditoria completa de ações
- Dados isolados por cliente
- RLS (Row Level Security) em todas as tabelas

---

## 📊 Hierarquia de Usuários

| Role | Permissões |
|------|------------|
| `administrador_master` | Acesso total, gestão de masters, configurações |
| `administrador` | Gestão operacional completa |
| `fiscal` | Notificações, PADs, fiscalização |
| `funcionario` | Operações básicas |
| `lojista` | Acesso restrito ao próprio box |

---

## 📄 Licença

Produto proprietário.
Uso restrito conforme contrato.
