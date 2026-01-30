import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type EmailTemplate = 
  | "welcome" 
  | "notification" 
  | "expiration_alert" 
  | "generic" 
  | "password_reset";

export interface SendEmailParams {
  to: string | string[];
  subject: string;
  template: EmailTemplate;
  variables?: Record<string, string>;
}

export interface EmailResult {
  success: boolean;
  data?: any;
  error?: string;
}

export const useEmail = () => {
  const sendEmail = async (params: SendEmailParams): Promise<EmailResult> => {
    try {
      const { data, error } = await supabase.functions.invoke("send-email", {
        body: params,
      });

      if (error) {
        console.error("Error invoking send-email function:", error);
        return { success: false, error: error.message };
      }

      if (!data.success) {
        return { success: false, error: data.error };
      }

      return { success: true, data: data.data };
    } catch (error: any) {
      console.error("Error sending email:", error);
      return { success: false, error: error.message };
    }
  };

  // Template-specific helper functions
  const sendWelcomeEmail = async (
    to: string,
    nome: string,
    link: string
  ): Promise<EmailResult> => {
    return sendEmail({
      to,
      subject: "Bem-vindo ao Mercado Municipal Digital",
      template: "welcome",
      variables: { nome, link },
    });
  };

  const sendNotificationEmail = async (
    to: string | string[],
    params: {
      titulo: string;
      box: string;
      responsavel: string;
      mensagem: string;
      prazo: string;
      link: string;
    }
  ): Promise<EmailResult> => {
    return sendEmail({
      to,
      subject: `Notificação: ${params.titulo}`,
      template: "notification",
      variables: params,
    });
  };

  const sendExpirationAlertEmail = async (
    to: string | string[],
    params: {
      tipo: string;
      documento: string;
      referencia: string;
      data_vencimento: string;
      dias_restantes: string;
      link: string;
    }
  ): Promise<EmailResult> => {
    return sendEmail({
      to,
      subject: `Alerta de Vencimento: ${params.documento}`,
      template: "expiration_alert",
      variables: params,
    });
  };

  const sendGenericEmail = async (
    to: string | string[],
    subject: string,
    params: {
      titulo: string;
      conteudo: string;
      assunto?: string;
    }
  ): Promise<EmailResult> => {
    return sendEmail({
      to,
      subject,
      template: "generic",
      variables: { ...params, assunto: params.assunto || subject },
    });
  };

  const sendPasswordResetEmail = async (
    to: string,
    nome: string,
    link: string
  ): Promise<EmailResult> => {
    return sendEmail({
      to,
      subject: "Redefinir Senha - Mercado Municipal Digital",
      template: "password_reset",
      variables: { nome, link },
    });
  };

  // Utility function to send with toast feedback
  const sendEmailWithToast = async (
    params: SendEmailParams,
    successMessage = "E-mail enviado com sucesso!",
    errorMessage = "Erro ao enviar e-mail"
  ): Promise<EmailResult> => {
    const result = await sendEmail(params);
    
    if (result.success) {
      toast.success(successMessage);
    } else {
      toast.error(result.error || errorMessage);
    }
    
    return result;
  };

  return {
    sendEmail,
    sendEmailWithToast,
    sendWelcomeEmail,
    sendNotificationEmail,
    sendExpirationAlertEmail,
    sendGenericEmail,
    sendPasswordResetEmail,
  };
};
