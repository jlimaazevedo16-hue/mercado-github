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

## ⚙️ Primeira Configuração

Ao acessar o sistema pela primeira vez:
- O Setup Wizard será exibido automaticamente
- O primeiro usuário criado será o USUÁRIO MASTER
- O sistema só libera acesso após a conclusão

---

## 🔁 Atualizações

- Atualizações são feitas via GitHub
- Basta realizar `git push`
- O sistema executa upgrades automáticos sem perder dados

---

## 🔒 Segurança

- Apenas usuários MASTER acessam configurações críticas
- Auditoria completa de ações
- Dados isolados por cliente

---

## 📄 Licença

Produto proprietário.
Uso restrito conforme contrato.
