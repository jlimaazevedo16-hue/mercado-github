import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";

/**
 * Hook para buscar o responsável vinculado ao usuário lojista logado.
 * O vínculo é feito por CPF, email ou telefone.
 */
export const useLojistaResponsavel = () => {
  const { user } = useAuth();
  const { role, loading: roleLoading } = useUserRole();

  const { data: responsavel, isLoading: responsavelLoading } = useQuery({
    queryKey: ["lojista-responsavel", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Buscar profile do usuário logado
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("cpf, email, telefone")
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError || !profile) return null;

      // Normalizar CPF (remover pontuação)
      const cpfNormalizado = profile.cpf?.replace(/\D/g, "") || "";

      // Buscar responsável que corresponda ao CPF, email ou telefone
      let query = supabase.from("responsaveis").select("id, nome, cpf, email, telefone");
      
      // Construir filtro: cpf OU email OU telefone
      const orConditions: string[] = [];
      if (cpfNormalizado) {
        orConditions.push(`cpf.ilike.%${cpfNormalizado.slice(0, 3)}.${cpfNormalizado.slice(3, 6)}.${cpfNormalizado.slice(6, 9)}-${cpfNormalizado.slice(9)}%`);
        // Também buscar sem formatação
        orConditions.push(`cpf.eq.${cpfNormalizado}`);
      }
      if (profile.email && !profile.email.includes("@cpf.local")) {
        orConditions.push(`email.ilike.${profile.email}`);
      }
      if (profile.telefone) {
        orConditions.push(`telefone.eq.${profile.telefone}`);
      }

      if (orConditions.length === 0) return null;

      // Buscar por cada condição separadamente para maior compatibilidade
      const results = [];
      
      // Buscar por CPF formatado
      if (cpfNormalizado) {
        const cpfFormatado = `${cpfNormalizado.slice(0, 3)}.${cpfNormalizado.slice(3, 6)}.${cpfNormalizado.slice(6, 9)}-${cpfNormalizado.slice(9)}`;
        const { data: byCpf } = await supabase
          .from("responsaveis")
          .select("id, nome, cpf, email, telefone")
          .eq("cpf", cpfFormatado)
          .maybeSingle();
        if (byCpf) return byCpf;
      }

      // Buscar por email
      if (profile.email && !profile.email.includes("@cpf.local")) {
        const { data: byEmail } = await supabase
          .from("responsaveis")
          .select("id, nome, cpf, email, telefone")
          .ilike("email", profile.email)
          .maybeSingle();
        if (byEmail) return byEmail;
      }

      // Buscar por telefone
      if (profile.telefone) {
        const { data: byTelefone } = await supabase
          .from("responsaveis")
          .select("id, nome, cpf, email, telefone")
          .eq("telefone", profile.telefone)
          .maybeSingle();
        if (byTelefone) return byTelefone;
      }

      return null;
    },
    enabled: !!user?.id && role === "lojista",
  });

  return {
    responsavel,
    isLojista: role === "lojista",
    loading: roleLoading || responsavelLoading,
    responsavelId: responsavel?.id || null,
  };
};
