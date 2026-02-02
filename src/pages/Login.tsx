import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logoAssociacao from '@/assets/logo_associacao.jpeg';

// Utility functions for CPF validation and formatting
const formatCPF = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

const isValidCPF = (cpf: string): boolean => {
  const numbers = cpf.replace(/\D/g, '');
  if (numbers.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(numbers)) return false;
  
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[9])) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(numbers[10])) return false;
  
  return true;
};

const isEmail = (value: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
};

const isCPF = (value: string): boolean => {
  const numbers = value.replace(/\D/g, '');
  return numbers.length === 11;
};

const Login = () => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleIdentifierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // Check if user is typing numbers (likely CPF)
    const numbersOnly = value.replace(/\D/g, '');
    if (numbersOnly.length > 0 && !value.includes('@')) {
      // Format as CPF
      setIdentifier(formatCPF(numbersOnly.slice(0, 11)));
    } else {
      setIdentifier(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let emailToUse = identifier;

      // Check if identifier is a CPF
      if (isCPF(identifier) && !isEmail(identifier)) {
        const cpfNumbers = identifier.replace(/\D/g, '');
        
        if (!isValidCPF(cpfNumbers)) {
          toast({
            title: 'CPF inválido',
            description: 'Por favor, verifique o CPF digitado.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        // Login via CPF precisa consultar o backend; o cliente (não autenticado) não consegue ler perfis.
        const { data: loginData, error: cpfLoginError } = await supabase.functions.invoke('cpf-login', {
          body: { cpf: cpfNumbers, password },
        });

        if (cpfLoginError) {
          throw new Error(cpfLoginError.message || 'Erro ao fazer login');
        }

        const session = (loginData as any)?.session;
        if (!session?.access_token || !session?.refresh_token) {
          throw new Error('CPF ou senha incorretos');
        }

        const { error: setSessionError } = await supabase.auth.setSession({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
        });
        if (setSessionError) throw setSessionError;

        navigate('/');
        return;
        
        /*
        const { data: profile, error: lookupError } = await supabase
          .from('profiles')
          .select('email, cpf')
          .not('cpf', 'is', null)
          .maybeSingle();
        
        // Find profile where CPF matches (normalized comparison)
        let matchedProfile = null;
        if (!lookupError) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('email, cpf')
            .not('cpf', 'is', null);
          
          matchedProfile = profiles?.find(p => {
            const storedCPFNumbers = p.cpf?.replace(/\D/g, '');
            return storedCPFNumbers === cpfNumbers;
          });
        }
        if (lookupError) {
          console.error('Erro ao buscar CPF:', lookupError);
          throw new Error('Erro ao buscar usuário');
        }

        if (!matchedProfile) {
          toast({
            title: 'CPF não encontrado',
            description: 'Não existe usuário cadastrado com este CPF.',
            variant: 'destructive',
          });
          setIsLoading(false);
          return;
        }

        emailToUse = matchedProfile.email;
        */
      } else if (!isEmail(identifier)) {
        toast({
          title: 'Formato inválido',
          description: 'Digite um email válido ou CPF (apenas números).',
          variant: 'destructive',
        });
        setIsLoading(false);
        return;
      }

      await signIn(emailToUse, password);
      navigate('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao fazer login';
      toast({
        title: 'Erro de autenticação',
        description: errorMessage === 'Invalid login credentials' 
          ? 'Email/CPF ou senha incorretos' 
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Mercado Municipal Digital</CardTitle>
          <CardDescription>Entre com seu email ou CPF para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="identifier">Email ou CPF</Label>
              <Input
                id="identifier"
                type="text"
                placeholder="seu@email.com ou 000.000.000-00"
                value={identifier}
                onChange={handleIdentifierChange}
                required
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm text-muted-foreground">
            Não tem uma conta?{' '}
            <Link to="/signup" className="text-primary hover:underline">
              Cadastre-se
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
