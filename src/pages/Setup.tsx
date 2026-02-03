import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Building2, Mail, Lock, CheckCircle, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import logoAssociacao from "@/assets/logo_associacao.jpeg";

export default function Setup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [formData, setFormData] = useState({
    nomeAssociacao: "",
    cnpj: "",
    email: "",
    senha: "",
    confirmaSenha: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nomeAssociacao.trim()) {
      newErrors.nomeAssociacao = "Nome da associação é obrigatório";
    }

    if (!formData.cnpj.trim()) {
      newErrors.cnpj = "CNPJ é obrigatório";
    } else if (!/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/.test(formData.cnpj) && !/^\d{14}$/.test(formData.cnpj.replace(/\D/g, ''))) {
      newErrors.cnpj = "CNPJ inválido";
    }

    if (!formData.email.trim()) {
      newErrors.email = "E-mail é obrigatório";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "E-mail inválido";
    }

    if (!formData.senha) {
      newErrors.senha = "Senha é obrigatória";
    } else if (formData.senha.length < 6) {
      newErrors.senha = "Senha deve ter pelo menos 6 caracteres";
    }

    if (formData.senha !== formData.confirmaSenha) {
      newErrors.confirmaSenha = "Senhas não conferem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatCNPJ = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);

    try {
      // Call setup edge function
      const { data, error } = await supabase.functions.invoke('initial-setup', {
        body: {
          nomeAssociacao: formData.nomeAssociacao,
          cnpj: formData.cnpj.replace(/\D/g, ''),
          email: formData.email,
          senha: formData.senha,
        }
      });

      if (error) throw error;

      if (data?.error) {
        throw new Error(data.error);
      }

      setStep('success');
      toast.success("Configuração inicial concluída!");

      // Auto-login with the new credentials
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.senha,
      });

      if (loginError) {
        console.error("Auto-login failed:", loginError);
        toast.info("Faça login com suas credenciais para continuar.");
      }

      // Redirect after a moment
      setTimeout(() => {
        navigate('/');
      }, 2000);

    } catch (error: any) {
      console.error("Setup error:", error);
      toast.error(error.message || "Erro ao configurar o sistema");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 text-center">
            <div className="mx-auto w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sistema Configurado!</h2>
            <p className="text-muted-foreground mb-6">
              A configuração inicial foi concluída com sucesso. 
              Você será redirecionado para o dashboard.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Redirecionando...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-primary/10 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto w-20 h-20 bg-white dark:bg-muted rounded-full flex items-center justify-center mb-4 shadow-lg overflow-hidden">
            <img src={logoAssociacao} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-3xl font-bold">Configuração Inicial</h1>
          <p className="text-muted-foreground mt-2">
            Configure o sistema para o primeiro uso
          </p>
        </div>

        {/* Setup Alert */}
        <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <Shield className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700 dark:text-amber-300">
            <strong>Modo de Instalação:</strong> Este assistente criará o primeiro usuário 
            Administrador Master do sistema.
          </AlertDescription>
        </Alert>

        {/* Form Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Dados da Instituição
            </CardTitle>
            <CardDescription>
              Preencha os dados da associação e do administrador principal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Institution Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nomeAssociacao">Nome da Associação *</Label>
                  <Input
                    id="nomeAssociacao"
                    placeholder="Ex: Associação dos Comerciantes do Mercado Municipal"
                    value={formData.nomeAssociacao}
                    onChange={(e) => setFormData({ ...formData, nomeAssociacao: e.target.value })}
                    className={errors.nomeAssociacao ? "border-destructive" : ""}
                  />
                  {errors.nomeAssociacao && (
                    <p className="text-sm text-destructive mt-1">{errors.nomeAssociacao}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cnpj">CNPJ *</Label>
                  <Input
                    id="cnpj"
                    placeholder="00.000.000/0000-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: formatCNPJ(e.target.value) })}
                    className={errors.cnpj ? "border-destructive" : ""}
                  />
                  {errors.cnpj && (
                    <p className="text-sm text-destructive mt-1">{errors.cnpj}</p>
                  )}
                </div>
              </div>

              {/* Separator */}
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Administrador Master
                  </span>
                </div>
              </div>

              {/* Admin Fields */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    E-mail do Administrador *
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@suaassociacao.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className={errors.email ? "border-destructive" : ""}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive mt-1">{errors.email}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="senha" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Senha *
                  </Label>
                  <Input
                    id="senha"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={formData.senha}
                    onChange={(e) => setFormData({ ...formData, senha: e.target.value })}
                    className={errors.senha ? "border-destructive" : ""}
                  />
                  {errors.senha && (
                    <p className="text-sm text-destructive mt-1">{errors.senha}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="confirmaSenha">Confirmar Senha *</Label>
                  <Input
                    id="confirmaSenha"
                    type="password"
                    placeholder="Repita a senha"
                    value={formData.confirmaSenha}
                    onChange={(e) => setFormData({ ...formData, confirmaSenha: e.target.value })}
                    className={errors.confirmaSenha ? "border-destructive" : ""}
                  />
                  {errors.confirmaSenha && (
                    <p className="text-sm text-destructive mt-1">{errors.confirmaSenha}</p>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Configurando...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Concluir Configuração
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Após a configuração, apenas usuários Master poderão acessar 
          configurações avançadas e promover outros administradores.
        </p>
      </div>
    </div>
  );
}
