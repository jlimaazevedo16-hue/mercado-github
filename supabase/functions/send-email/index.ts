import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

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

// Email templates
const templates: Record<string, string> = {
  welcome: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Bem-vindo</title></head><body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;"><table role="presentation" style="width: 100%; border-collapse: collapse;"><tr><td align="center" style="padding: 40px 0;"><table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="padding: 40px 40px 20px; text-align: center; background-color: #1e40af; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px;">Mercado Municipal Digital</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #1e40af;">Bem-vindo(a), {{nome}}!</h2><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">Sua conta foi criada com sucesso no sistema Mercado Municipal Digital.</p><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">Agora você pode acessar todas as funcionalidades do sistema para gerenciar boxes, responsáveis e muito mais.</p><div style="text-align: center; margin: 30px 0;"><a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Acessar Sistema</a></div></td></tr><tr><td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;"><p style="margin: 0; color: #6b7280; font-size: 14px;">© {{ano}} Mercado Municipal Digital. Todos os direitos reservados.</p></td></tr></table></td></tr></table></body></html>`,

  notification: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Notificação</title></head><body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;"><table role="presentation" style="width: 100%; border-collapse: collapse;"><tr><td align="center" style="padding: 40px 0;"><table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="padding: 40px 40px 20px; text-align: center; background-color: #dc2626; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px;">⚠️ Notificação Importante</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #dc2626;">{{titulo}}</h2><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;"><strong>Box:</strong> {{box}}</p><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;"><strong>Responsável:</strong> {{responsavel}}</p><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">{{mensagem}}</p><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;"><strong>Prazo:</strong> {{prazo}}</p><div style="text-align: center; margin: 30px 0;"><a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Ver Detalhes</a></div></td></tr><tr><td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;"><p style="margin: 0; color: #6b7280; font-size: 14px;">© {{ano}} Mercado Municipal Digital. Todos os direitos reservados.</p></td></tr></table></td></tr></table></body></html>`,

  expiration_alert: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Alerta de Vencimento</title></head><body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;"><table role="presentation" style="width: 100%; border-collapse: collapse;"><tr><td align="center" style="padding: 40px 0;"><table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="padding: 40px 40px 20px; text-align: center; background-color: #f59e0b; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px;">🔔 Alerta de Vencimento</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #f59e0b;">{{tipo}} próximo do vencimento</h2><p style="margin: 0 0 15px; color: #374151; line-height: 1.6;"><strong>Documento:</strong> {{documento}}</p><p style="margin: 0 0 15px; color: #374151; line-height: 1.6;"><strong>Box/Responsável:</strong> {{referencia}}</p><p style="margin: 0 0 15px; color: #374151; line-height: 1.6;"><strong>Data de Vencimento:</strong> {{data_vencimento}}</p><p style="margin: 0 0 15px; color: #374151; line-height: 1.6;"><strong>Dias Restantes:</strong> <span style="color: #f59e0b; font-weight: bold;">{{dias_restantes}} dias</span></p><div style="text-align: center; margin: 30px 0;"><a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: #f59e0b; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Regularizar Agora</a></div></td></tr><tr><td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;"><p style="margin: 0; color: #6b7280; font-size: 14px;">© {{ano}} Mercado Municipal Digital. Todos os direitos reservados.</p></td></tr></table></td></tr></table></body></html>`,

  generic: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>{{assunto}}</title></head><body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;"><table role="presentation" style="width: 100%; border-collapse: collapse;"><tr><td align="center" style="padding: 40px 0;"><table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="padding: 40px 40px 20px; text-align: center; background-color: #1e40af; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px;">Mercado Municipal Digital</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #1e40af;">{{titulo}}</h2><div style="color: #374151; line-height: 1.6;">{{conteudo}}</div></td></tr><tr><td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;"><p style="margin: 0; color: #6b7280; font-size: 14px;">© {{ano}} Mercado Municipal Digital. Todos os direitos reservados.</p></td></tr></table></td></tr></table></body></html>`,

  password_reset: `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Redefinir Senha</title></head><body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;"><table role="presentation" style="width: 100%; border-collapse: collapse;"><tr><td align="center" style="padding: 40px 0;"><table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);"><tr><td style="padding: 40px 40px 20px; text-align: center; background-color: #1e40af; border-radius: 8px 8px 0 0;"><h1 style="margin: 0; color: #ffffff; font-size: 24px;">🔐 Redefinir Senha</h1></td></tr><tr><td style="padding: 40px;"><h2 style="margin: 0 0 20px; color: #1e40af;">Olá, {{nome}}!</h2><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">Recebemos uma solicitação para redefinir a senha da sua conta no Mercado Municipal Digital.</p><p style="margin: 0 0 20px; color: #374151; line-height: 1.6;">Clique no botão abaixo para criar uma nova senha:</p><div style="text-align: center; margin: 30px 0;"><a href="{{link}}" style="display: inline-block; padding: 14px 28px; background-color: #1e40af; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold;">Redefinir Senha</a></div><p style="margin: 0 0 10px; color: #6b7280; font-size: 14px;">Este link expira em 1 hora.</p><p style="margin: 0; color: #6b7280; font-size: 14px;">Se você não solicitou essa redefinição, ignore este e-mail.</p></td></tr><tr><td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;"><p style="margin: 0; color: #6b7280; font-size: 14px;">© {{ano}} Mercado Municipal Digital. Todos os direitos reservados.</p></td></tr></table></td></tr></table></body></html>`,
};

function processTemplate(templateName: string, variables: Record<string, string> = {}): string {
  let template = templates[templateName] || templates.generic;
  
  const defaultVars = {
    ano: new Date().getFullYear().toString(),
    ...variables,
  };
  
  Object.entries(defaultVars).forEach(([key, value]) => {
    template = template.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
  });
  
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

    const { to, subject, template, variables }: EmailRequest = await req.json();

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

    if (!templates[template]) {
      console.warn(`Template '${template}' not found, using generic template`);
    }

    const html = processTemplate(template, variables);
    const recipients = Array.isArray(to) ? to : [to];

    // Send email using Resend API directly
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Mercado Municipal Digital <noreply@resend.dev>",
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
