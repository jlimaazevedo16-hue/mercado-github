-- Create email templates table
CREATE TABLE public.email_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  categoria VARCHAR(50) NOT NULL DEFAULT 'geral',
  assunto VARCHAR(255) NOT NULL,
  conteudo TEXT NOT NULL,
  variaveis TEXT[] DEFAULT ARRAY[]::TEXT[],
  ativo BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Policies for email templates
CREATE POLICY "Admins can view email templates"
ON public.email_templates
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Admins can insert email templates"
ON public.email_templates
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Admins can update email templates"
ON public.email_templates
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

CREATE POLICY "Admins can delete email templates"
ON public.email_templates
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('administrador_master', 'administrador')
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_email_templates_updated_at
BEFORE UPDATE ON public.email_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default templates
INSERT INTO public.email_templates (nome, slug, categoria, assunto, conteudo, variaveis) VALUES
(
  'Boas-vindas',
  'welcome',
  'institucional',
  'Bem-vindo ao {{instituicao}}',
  '<h2>Olá, {{nome}}!</h2>
<p>Seja bem-vindo(a) ao sistema <strong>{{instituicao}}</strong>.</p>
<p>Sua conta foi criada com sucesso e você já pode acessar todas as funcionalidades disponíveis.</p>
<p>Acesse agora clicando no botão abaixo:</p>
<p style="text-align: center; margin: 30px 0;">
  <a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: {{cor_primaria}}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Sistema</a>
</p>
<p>Atenciosamente,<br>Equipe {{instituicao}}</p>',
  ARRAY['nome', 'instituicao', 'link', 'cor_primaria']
),
(
  'Notificação de Box',
  'notificacao_box',
  'fiscalizacao',
  'Notificação: {{titulo}} - Box {{box}}',
  '<h2>⚠️ {{titulo}}</h2>
<p><strong>Box:</strong> {{box}}</p>
<p><strong>Responsável:</strong> {{responsavel}}</p>
<p><strong>Data:</strong> {{data}}</p>
<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
<p>{{mensagem}}</p>
<p><strong>Prazo para regularização:</strong> {{prazo}}</p>
<p style="text-align: center; margin: 30px 0;">
  <a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Detalhes</a>
</p>',
  ARRAY['titulo', 'box', 'responsavel', 'data', 'mensagem', 'prazo', 'link']
),
(
  'Alerta de Vencimento',
  'alerta_vencimento',
  'alerta',
  'Alerta: {{documento}} vence em {{dias_restantes}} dias',
  '<h2>🔔 Alerta de Vencimento</h2>
<p>O documento <strong>{{documento}}</strong> está próximo do vencimento.</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Documento:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb;">{{documento}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Box/Responsável:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb;">{{referencia}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Vencimento:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb;">{{data_vencimento}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Dias Restantes:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb; color: #f59e0b; font-weight: bold;">{{dias_restantes}} dias</td>
  </tr>
</table>
<p style="text-align: center; margin: 30px 0;">
  <a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Regularizar Agora</a>
</p>',
  ARRAY['documento', 'referencia', 'data_vencimento', 'dias_restantes', 'link']
),
(
  'Cobrança Financeira',
  'cobranca',
  'financeiro',
  'Cobrança: {{tipo}} - {{mes_referencia}}',
  '<h2>💰 Cobrança - {{tipo}}</h2>
<p>Prezado(a) <strong>{{responsavel}}</strong>,</p>
<p>Segue a cobrança referente ao mês de <strong>{{mes_referencia}}</strong>:</p>
<table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Box:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb;">{{box}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Tipo:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb;">{{tipo}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Valor:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold; color: #16a34a;">R$ {{valor}}</td>
  </tr>
  <tr>
    <td style="padding: 10px; border: 1px solid #e5e7eb;"><strong>Vencimento:</strong></td>
    <td style="padding: 10px; border: 1px solid #e5e7eb;">{{vencimento}}</td>
  </tr>
</table>
<p style="text-align: center; margin: 30px 0;">
  <a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: {{cor_primaria}}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Detalhes</a>
</p>',
  ARRAY['responsavel', 'box', 'tipo', 'mes_referencia', 'valor', 'vencimento', 'link', 'cor_primaria']
),
(
  'Redefinição de Senha',
  'password_reset',
  'sistema',
  'Redefinir Senha - {{instituicao}}',
  '<h2>🔐 Redefinir Senha</h2>
<p>Olá, <strong>{{nome}}</strong>!</p>
<p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
<p>Clique no botão abaixo para criar uma nova senha:</p>
<p style="text-align: center; margin: 30px 0;">
  <a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: {{cor_primaria}}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Redefinir Senha</a>
</p>
<p style="color: #6b7280; font-size: 14px;">Este link expira em 1 hora.</p>
<p style="color: #6b7280; font-size: 14px;">Se você não solicitou essa redefinição, ignore este e-mail.</p>',
  ARRAY['nome', 'instituicao', 'link', 'cor_primaria']
),
(
  'Comunicado Geral',
  'comunicado',
  'institucional',
  '{{assunto}}',
  '<h2>{{titulo}}</h2>
<div>{{conteudo}}</div>
<p style="margin-top: 30px;">Atenciosamente,<br>Equipe {{instituicao}}</p>',
  ARRAY['assunto', 'titulo', 'conteudo', 'instituicao']
);