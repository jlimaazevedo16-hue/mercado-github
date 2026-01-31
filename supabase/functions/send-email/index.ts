import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface EmailRequest {
  to: string | string[];
  subject: string;
  template: string;
  variables?: Record<string, string>;
}

interface InstitutionalConfig {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  email: string;
  logoUrl: string;
  corPrimaria: string;
  corSecundaria: string;
}

const DEFAULT_CONFIG: InstitutionalConfig = {
  nome: 'Mercado Municipal Digital',
  cnpj: '',
  endereco: '',
  cidade: '',
  email: '',
  logoUrl: '',
  corPrimaria: '#1e40af',
  corSecundaria: '#f59e0b',
};

async function getInstitutionalConfig(): Promise<InstitutionalConfig> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  if (!supabaseUrl || !supabaseKey) {
    console.warn("Supabase credentials not found, using default config");
    return DEFAULT_CONFIG;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from("configuracoes_administrativas")
      .select("chave, descricao")
      .in("chave", [
        'instituicao_nome',
        'instituicao_cnpj',
        'instituicao_endereco',
        'instituicao_cidade',
        'instituicao_email',
        'instituicao_logo_url',
        'instituicao_cor_primaria',
        'instituicao_cor_secundaria',
      ]);

    if (error) {
      console.error("Error fetching config:", error);
      return DEFAULT_CONFIG;
    }

    const configMap = new Map(data?.map(item => [item.chave, item.descricao]) || []);

    return {
      nome: configMap.get('instituicao_nome') || DEFAULT_CONFIG.nome,
      cnpj: configMap.get('instituicao_cnpj') || DEFAULT_CONFIG.cnpj,
      endereco: configMap.get('instituicao_endereco') || DEFAULT_CONFIG.endereco,
      cidade: configMap.get('instituicao_cidade') || DEFAULT_CONFIG.cidade,
      email: configMap.get('instituicao_email') || DEFAULT_CONFIG.email,
      logoUrl: configMap.get('instituicao_logo_url') || DEFAULT_CONFIG.logoUrl,
      corPrimaria: configMap.get('instituicao_cor_primaria') || DEFAULT_CONFIG.corPrimaria,
      corSecundaria: configMap.get('instituicao_cor_secundaria') || DEFAULT_CONFIG.corSecundaria,
    };
  } catch (error) {
    console.error("Error in getInstitutionalConfig:", error);
    return DEFAULT_CONFIG;
  }
}

function buildEmailTemplate(templateName: string, variables: Record<string, string>, config: InstitutionalConfig): string {
  const { nome, cnpj, endereco, cidade, email, logoUrl, corPrimaria, corSecundaria } = config;
  
  // Logo HTML - only include if URL exists
  const logoHtml = logoUrl 
    ? `<img src="${logoUrl}" alt="${nome}" style="max-width:140px; margin-bottom:12px;" />`
    : '';

  // Build footer address
  const enderecoCompleto = endereco && cidade 
    ? `${endereco}<br/>Centro – ${cidade}` 
    : endereco || cidade || '';

  // Base institutional template
  const buildInstitutionalTemplate = (titulo: string, conteudo: string, destaque: string, botaoTexto: string, botaoLink: string, headerColor: string = '#0d3b66') => {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${nome}</title>
</head>
<body style="margin:0; padding:0; background-color:#f2f4f8; font-family:Arial, Helvetica, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f4f8; padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:${headerColor}; padding:24px; text-align:center;">
              ${logoHtml}
              <h1 style="color:#ffffff; margin:0; font-size:20px; font-weight:600;">
                ${nome}
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; color:#1f2933;">
              <h2 style="color:${headerColor}; font-size:18px; margin-top:0;">
                ${titulo}
              </h2>
              <div style="font-size:14px; line-height:1.6;">
                ${conteudo}
              </div>
              ${destaque ? `
              <div style="background:#eaf2fb; border-left:4px solid ${corSecundaria}; padding:16px; margin:24px 0;">
                <p style="margin:0; font-size:14px;">
                  ${destaque}
                </p>
              </div>
              ` : ''}
              ${botaoTexto && botaoLink ? `
              <div style="text-align:center; margin:32px 0;">
                <a href="${botaoLink}" style="background:${corSecundaria}; color:#ffffff; text-decoration:none; padding:14px 28px; border-radius:6px; font-size:14px; font-weight:600; display:inline-block;">
                  ${botaoTexto}
                </a>
              </div>
              ` : ''}
              <p style="font-size:13px; color:#4b5563;">
                Em caso de dúvidas, estamos à disposição.
              </p>
              <p style="font-size:13px; margin-bottom:0;">
                Atenciosamente,<br/>
                <strong>Diretoria da ${nome}</strong>
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#0d3b66; color:#ffffff; padding:20px; text-align:center; font-size:12px;">
              ${cnpj ? `<p style="margin:0;">CNPJ: ${cnpj}</p>` : ''}
              ${enderecoCompleto ? `<p style="margin:4px 0;">${enderecoCompleto}</p>` : ''}
              ${email ? `<p style="margin:8px 0 0;">📧 ${email}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  const templates: Record<string, string> = {
    welcome: buildInstitutionalTemplate(
      'Bem-vindo(a), {{nome}}!',
      `<p>Sua conta foi criada com sucesso no sistema ${nome}.</p>
       <p>Agora você pode acessar todas as funcionalidades do sistema para gerenciar boxes, responsáveis e muito mais.</p>`,
      '',
      'Acessar Sistema',
      '{{link}}'
    ),

    notification: buildInstitutionalTemplate(
      '{{titulo}}',
      `<p><strong>Box:</strong> {{box}}</p>
       <p><strong>Responsável:</strong> {{responsavel}}</p>
       <div>{{mensagem}}</div>
       <p><strong>Prazo:</strong> {{prazo}}</p>`,
      '',
      'Ver Detalhes',
      '{{link}}',
      '#dc2626'
    ),

    expiration_alert: buildInstitutionalTemplate(
      '🔔 {{tipo}} próximo do vencimento',
      `<p><strong>Documento:</strong> {{documento}}</p>
       <p><strong>Box/Responsável:</strong> {{referencia}}</p>
       <p><strong>Data de Vencimento:</strong> {{data_vencimento}}</p>`,
      '<strong>Dias Restantes:</strong> {{dias_restantes}}',
      'Regularizar Agora',
      '{{link}}'
    ),

    generic: buildInstitutionalTemplate(
      '{{titulo}}',
      '{{conteudo}}',
      '{{destaque}}',
      '{{botao_texto}}',
      '{{botao_link}}'
    ),

    password_reset: buildInstitutionalTemplate(
      '🔐 Redefinir Senha',
      `<p>Olá <strong>{{nome}}</strong>,</p>
       <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
       <p>Clique no botão abaixo para criar uma nova senha:</p>`,
      'Este link expira em 1 hora. Se você não solicitou essa redefinição, ignore este e-mail.',
      'Redefinir Senha',
      '{{link}}'
    ),
  };

  let template = templates[templateName] || templates.generic;
  
  // Replace all variables
  Object.entries(variables).forEach(([key, value]) => {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });
  
  // Clean up unused placeholders
  template = template.replace(/\{\{[^}]+\}\}/g, '');
  
  return template;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    
    if (!resendApiKey) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Serviço de e-mail não configurado. Configure a API key do Resend nas configurações." 
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    const { to, subject, template, variables = {} }: EmailRequest = await req.json();

    if (!to || !subject || !template) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Campos obrigatórios: to, subject, template" 
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Fetch institutional config from database
    const config = await getInstitutionalConfig();
    console.log("Institutional config loaded:", { nome: config.nome, email: config.email });

    // Build email HTML with institutional branding
    const html = buildEmailTemplate(template, variables, config);
    const recipients = Array.isArray(to) ? to : [to];

    // Determine sender email - use verified domain or default
    const fromEmail = config.email && config.email.includes('@') && !config.email.includes('resend.dev')
      ? `${config.nome} <noreply@resend.dev>` // Use resend.dev until domain is verified
      : `${config.nome} <noreply@resend.dev>`;

    // Send email using Resend API
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: recipients,
        subject,
        html,
      }),
    });

    const emailResponse = await response.json();

    if (!response.ok) {
      console.error("Resend API error:", emailResponse);
      return new Response(
        JSON.stringify({ success: false, error: emailResponse.message || "Erro ao enviar e-mail" }),
        {
          status: response.status,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, data: emailResponse }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending email:", errorMessage);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
