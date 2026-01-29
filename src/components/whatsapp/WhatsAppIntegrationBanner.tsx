import { AlertTriangle, Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const WhatsAppIntegrationBanner = () => {
  return (
    <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20 mb-6">
      <AlertTriangle className="h-5 w-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200 font-semibold">
        Modo de Simulação Ativo
      </AlertTitle>
      <AlertDescription className="text-amber-700 dark:text-amber-300">
        <p className="mb-2">
          A integração com WhatsApp (Evolution API) ainda não está configurada. 
          Todas as mensagens serão processadas em <strong>modo simulado</strong>.
        </p>
        <ul className="list-disc list-inside text-sm space-y-1">
          <li>Nenhuma mensagem será enviada de verdade</li>
          <li>Os logs e filas funcionarão normalmente para treinamento</li>
          <li>Configure uma instância real para ativar envios</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
};
