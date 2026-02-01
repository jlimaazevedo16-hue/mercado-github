import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2 } from 'lucide-react';
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

const formatPhone = (value: string): string => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
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

const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

const Signup = () => {
  const [activeTab, setActiveTab] = useState<'email' | 'cpf'>('email');
  
  // Email signup state
  const [email, setEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailConfirmPassword, setEmailConfirmPassword] = useState('');
  
  // CPF signup state
  const [nome, setNome] = useState('');
  const [cpf, setCpf] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cpfPassword, setCpfPassword] = useState('');
  const [cpfConfirmPassword, setCpfConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCPFChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setCpf(formatCPF(value));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 11);
    setTelefone(formatPhone(value));
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isValidEmail(email)) {
      toast({
        title: 'Erro de validação',
        description: 'Email inválido',
        variant: 'destructive',
      });
      return;
    }

    if (emailPassword !== emailConfirmPassword) {
      toast({
        title: 'Erro de validação',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (emailPassword.length < 6) {
      toast({
        title: 'Erro de validação',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      await signUp(email, emailPassword);
      toast({
        title: 'Conta criada com sucesso!',
        description: 'Verifique seu email para confirmar a conta.',
      });
      navigate('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
      toast({
        title: 'Erro ao criar conta',
        description: errorMessage === 'User already registered' 
          ? 'Este email já está cadastrado' 
          : errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCPFSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cpfNumbers = cpf.replace(/\D/g, '');
    const phoneNumbers = telefone.replace(/\D/g, '');

    if (!nome.trim()) {
      toast({
        title: 'Erro de validação',
        description: 'Nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    if (!isValidCPF(cpfNumbers)) {
      toast({
        title: 'Erro de validação',
        description: 'CPF inválido',
        variant: 'destructive',
      });
      return;
    }

    if (phoneNumbers.length < 10 || phoneNumbers.length > 11) {
      toast({
        title: 'Erro de validação',
        description: 'Telefone inválido (deve ter 10 ou 11 dígitos)',
        variant: 'destructive',
      });
      return;
    }

    if (cpfPassword !== cpfConfirmPassword) {
      toast({
        title: 'Erro de validação',
        description: 'As senhas não coincidem',
        variant: 'destructive',
      });
      return;
    }

    if (cpfPassword.length < 6) {
      toast({
        title: 'Erro de validação',
        description: 'A senha deve ter pelo menos 6 caracteres',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('cpf-signup', {
        body: {
          cpf: cpfNumbers,
          telefone: phoneNumbers,
          password: cpfPassword,
          nome: nome.trim(),
        },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao criar conta');
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      toast({
        title: 'Conta criada com sucesso!',
        description: 'Você já pode fazer login com seu CPF.',
      });
      navigate('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao criar conta';
      toast({
        title: 'Erro ao criar conta',
        description: errorMessage,
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
            <img 
              src={logoAssociacao} 
              alt="Logo da Associação" 
              className="h-20 w-20 rounded-lg object-cover"
            />
          </div>
          <CardTitle className="text-2xl">Criar Conta</CardTitle>
          <CardDescription>Cadastre-se para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'email' | 'cpf')}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email">Com Email</TabsTrigger>
              <TabsTrigger value="cpf">Com CPF</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailPassword">Senha</Label>
                  <Input
                    id="emailPassword"
                    type="password"
                    placeholder="••••••••"
                    value={emailPassword}
                    onChange={(e) => setEmailPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emailConfirmPassword">Confirmar Senha</Label>
                  <Input
                    id="emailConfirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={emailConfirmPassword}
                    onChange={(e) => setEmailConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="cpf">
              <form onSubmit={handleCPFSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="name"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF</Label>
                  <Input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCPFChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone / WhatsApp</Label>
                  <Input
                    id="telefone"
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={telefone}
                    onChange={handlePhoneChange}
                    required
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpfPassword">Senha</Label>
                  <Input
                    id="cpfPassword"
                    type="password"
                    placeholder="••••••••"
                    value={cpfPassword}
                    onChange={(e) => setCpfPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cpfConfirmPassword">Confirmar Senha</Label>
                  <Input
                    id="cpfConfirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={cpfConfirmPassword}
                    onChange={(e) => setCpfConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Criando conta...
                    </>
                  ) : (
                    'Criar Conta'
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Já tem uma conta?{' '}
            <Link to="/login" className="text-primary hover:underline">
              Fazer login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Signup;
