import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface UserProfile {
  id: string;
  user_id: string;
  nome: string;
  sobrenome: string | null;
  email: string;
  telefone: string | null;
  data_nascimento: string | null;
  foto_url: string | null;
  ativo: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface UpdateProfileData {
  nome?: string;
  sobrenome?: string | null;
  telefone?: string | null;
  data_nascimento?: string | null;
  foto_url?: string | null;
}

export function useUserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: profile, isLoading, error, refetch } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as UserProfile | null;
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: UpdateProfileData) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `profile-photos/${fileName}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("profile-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(filePath);

      // Update profile with new photo URL
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({ foto_url: urlData.publicUrl })
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) throw updateError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast({
        title: "Foto atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar foto",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: async ({ newPassword }: { currentPassword: string; newPassword: string }) => {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao alterar senha",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const requestPasswordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Email enviado",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar email",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const displayName = profile?.nome 
    ? `${profile.nome}${profile.sobrenome ? ` ${profile.sobrenome}` : ''}`
    : user?.email?.split('@')[0] || 'Usuário';

  const initials = profile?.nome 
    ? `${profile.nome.charAt(0)}${profile.sobrenome?.charAt(0) || ''}`.toUpperCase()
    : user?.email?.charAt(0).toUpperCase() || 'U';

  return {
    profile,
    isLoading,
    error,
    refetch,
    displayName,
    initials,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    uploadPhoto: uploadPhotoMutation.mutate,
    isUploadingPhoto: uploadPhotoMutation.isPending,
    changePassword: changePasswordMutation.mutate,
    isChangingPassword: changePasswordMutation.isPending,
    requestPasswordReset: requestPasswordResetMutation.mutate,
    isRequestingReset: requestPasswordResetMutation.isPending,
  };
}
