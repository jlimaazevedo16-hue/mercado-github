import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Settings, Shield } from 'lucide-react';

export const SetupRequired = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-lg w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-amber-600 dark:text-amber-400" />
          </div>
          <CardTitle className="text-2xl">Sistema Não Configurado</CardTitle>
          <CardDescription className="text-base">
            Este sistema precisa ser configurado antes do primeiro uso. 
            Entre em contato com o administrador ou acesse as configurações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span className="font-medium">Integrações Pendentes:</span>
            </div>
            <ul className="text-sm text-muted-foreground ml-6 space-y-1">
              <li>• Banco de Dados (Supabase)</li>
              <li>• Serviço de E-mail (Resend)</li>
              <li>• Outras integrações opcionais</li>
            </ul>
          </div>
          
          <Button 
            className="w-full gap-2" 
            size="lg"
            onClick={() => navigate('/configuracoes?tab=integracoes')}
          >
            <Settings className="h-4 w-4" />
            Ir para Configurações
          </Button>
          
          <p className="text-xs text-center text-muted-foreground">
            Apenas administradores podem realizar a configuração inicial.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
