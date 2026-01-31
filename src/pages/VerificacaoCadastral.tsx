import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  CheckCircle, XCircle, Loader2, Clock, AlertTriangle, 
  User, Send, Building2
} from "lucide-react";
import logoAssociacao from "@/assets/logo_associacao.jpeg";

type VerificationStatus = 'loading' | 'valid' | 'success' | 'error' | 'expired' | 'used';

interface VerificationResult {
  tipo: 'confirmar' | 'corrigir';
  acao: string;
  responsavel: {
    id: string;
    nome: string;
    email: string;
    telefone: string;
  };
  message: string;
}

export default function VerificacaoCadastral() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<{ tipo: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('Link inválido');
      return;
    }

    // First, just check if token is valid without consuming it
    checkToken();
  }, [token]);

  const checkToken = async () => {
    try {
      // We need to peek at the token type first
      const { data, error } = await supabase.functions.invoke('verificacao-cadastral', {
        body: { action: 'validate', token, peek: true }
      });

      if (error || !data.success) {
        handleError(data);
        return;
      }

      // Token is valid, show confirmation page
      setTokenInfo({ tipo: data.data.tipo });
      setStatus('valid');
    } catch (err) {
      console.error('Error checking token:', err);
      setStatus('error');
      setErrorMessage('Erro ao verificar o link');
    }
  };

  const handleError = (data: any) => {
    const code = data?.code;
    switch (code) {
      case 'TOKEN_USED':
        setStatus('used');
        setErrorMessage('Este link já foi utilizado anteriormente.');
        break;
      case 'TOKEN_EXPIRED':
        setStatus('expired');
        setErrorMessage('Este link expirou. Solicite um novo e-mail de verificação.');
        break;
      default:
        setStatus('error');
        setErrorMessage(data?.error || 'Link inválido ou expirado');
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('verificacao-cadastral', {
        body: { 
          action: 'validate', 
          token,
          observacoes: observacoes || undefined
        }
      });

      if (error || !data.success) {
        handleError(data);
        return;
      }

      setResult(data.data);
      setStatus('success');
    } catch (err) {
      console.error('Error validating token:', err);
      setStatus('error');
      setErrorMessage('Erro ao processar sua solicitação');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header with logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <img 
              src={logoAssociacao} 
              alt="Logo" 
              className="h-16 w-auto object-contain"
            />
          </div>
          <h1 className="text-xl font-semibold text-foreground">
            Verificação de Dados Cadastrais
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Mercado Municipal Digital
          </p>
        </div>

        {/* Loading state */}
        {status === 'loading' && (
          <Card>
            <CardContent className="py-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground">Verificando link...</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Valid token - Confirmation page */}
        {status === 'valid' && tokenInfo && (
          <Card>
            <CardHeader className="text-center pb-2">
              <div className="flex justify-center mb-3">
                {tokenInfo.tipo === 'confirmar' ? (
                  <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                ) : (
                  <div className="h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
                    <AlertTriangle className="h-8 w-8 text-orange-600" />
                  </div>
                )}
              </div>
              <CardTitle>
                {tokenInfo.tipo === 'confirmar' 
                  ? 'Confirmar Dados Cadastrais'
                  : 'Solicitar Correção de Dados'
                }
              </CardTitle>
              <CardDescription>
                {tokenInfo.tipo === 'confirmar'
                  ? 'Ao confirmar, você atesta que seus dados cadastrais estão corretos.'
                  : 'Informe abaixo quais dados precisam ser corrigidos.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {tokenInfo.tipo === 'corrigir' && (
                <div>
                  <Label htmlFor="observacoes">
                    Quais dados precisam ser corrigidos? *
                  </Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Descreva quais informações estão incorretas e qual é o dado correto..."
                    value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    rows={4}
                    className="mt-1.5"
                  />
                </div>
              )}

              <Button 
                onClick={handleSubmit} 
                disabled={isSubmitting || (tokenInfo.tipo === 'corrigir' && !observacoes.trim())}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : tokenInfo.tipo === 'confirmar' ? (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Confirmar Meus Dados
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Success state */}
        {status === 'success' && result && (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-green-700">
                    {result.tipo === 'confirmar' ? 'Dados Confirmados!' : 'Solicitação Enviada!'}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {result.message}
                  </p>
                </div>

                {result.responsavel && (
                  <div className="w-full mt-4 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <User className="h-4 w-4" />
                      <span>{result.responsavel.nome}</span>
                    </div>
                  </div>
                )}

                <p className="text-xs text-muted-foreground mt-4">
                  Você pode fechar esta página.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error states */}
        {(status === 'error' || status === 'expired' || status === 'used') && (
          <Card>
            <CardContent className="py-8">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
                  status === 'expired' ? 'bg-orange-100' : 'bg-red-100'
                }`}>
                  {status === 'expired' ? (
                    <Clock className="h-8 w-8 text-orange-600" />
                  ) : status === 'used' ? (
                    <CheckCircle className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-600" />
                  )}
                </div>
                <div>
                  <h2 className={`text-xl font-semibold ${
                    status === 'expired' ? 'text-orange-700' : 
                    status === 'used' ? 'text-muted-foreground' : 'text-red-700'
                  }`}>
                    {status === 'expired' ? 'Link Expirado' :
                     status === 'used' ? 'Link Já Utilizado' : 'Link Inválido'}
                  </h2>
                  <p className="text-muted-foreground mt-2">
                    {errorMessage}
                  </p>
                </div>

                <Alert className="mt-4 text-left">
                  <Building2 className="h-4 w-4" />
                  <AlertTitle>Precisa de ajuda?</AlertTitle>
                  <AlertDescription>
                    Entre em contato com a administração do Mercado Municipal para solicitar um novo link de verificação.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          © {new Date().getFullYear()} Mercado Municipal Digital
        </p>
      </div>
    </div>
  );
}
