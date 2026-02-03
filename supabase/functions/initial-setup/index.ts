import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Check if system is already installed
    const { data: setupData, error: setupCheckError } = await supabaseAdmin
      .from("sistema_setup")
      .select("id, setup_concluido, master_users_count")
      .limit(1)
      .maybeSingle();

    if (setupCheckError) {
      console.error("Error checking setup status:", setupCheckError);
    }

    // If already installed, reject
    if (setupData?.setup_concluido) {
      return new Response(
        JSON.stringify({ error: "Sistema já foi configurado. Acesso negado." }),
        { 
          status: 403, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const { nomeAssociacao, cnpj, email, senha } = await req.json();

    // Validate required fields
    if (!nomeAssociacao || !cnpj || !email || !senha) {
      return new Response(
        JSON.stringify({ error: "Todos os campos são obrigatórios" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Validate password length
    if (senha.length < 6) {
      return new Response(
        JSON.stringify({ error: "Senha deve ter pelo menos 6 caracteres" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // Auto-confirm for initial setup
      user_metadata: {
        nome: "Administrador Master",
        is_master: true,
      },
    });

    if (authError) {
      console.error("Auth creation error:", authError);
      return new Response(
        JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    const userId = authData.user.id;

    // 2. Create/update profile (trigger might have created it)
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        user_id: userId,
        nome: "Administrador Master",
        email: email,
      }, { onConflict: 'user_id' });

    if (profileError) {
      console.error("Profile creation error:", profileError);
      // Don't fail, profile might already exist from trigger
    }

    // 3. Assign master role (upsert to handle existing record from trigger)
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "administrador_master",
      }, { onConflict: 'user_id' });

    if (roleError) {
      console.error("Role assignment error:", roleError);
      return new Response(
        JSON.stringify({ error: `Erro ao atribuir perfil: ${roleError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // 4. Save institution config
    const { error: configError } = await supabaseAdmin
      .from("configuracoes_integracoes")
      .upsert({
        integracao: "instituicao",
        status: "ativo",
        config_public: {
          nome: nomeAssociacao,
          cnpj: cnpj,
          email_principal: email,
        },
        obrigatoria: true,
        ordem: 0,
      }, { onConflict: 'integracao' });

    if (configError) {
      console.error("Config save error:", configError);
      // Don't fail, this is optional
    }

    // 5. Update sistema_setup to mark as installed
    const { error: updateSetupError } = await supabaseAdmin
      .from("sistema_setup")
      .update({
        setup_concluido: true,
        data_conclusao: new Date().toISOString(),
        concluido_por: userId,
        master_users_count: 1,
      })
      .eq("id", setupData?.id || "f70c06fb-885a-429c-b6e5-567c282b5c2d"); // Use existing ID or fallback

    // If no row to update, insert new one
    if (updateSetupError || !setupData) {
      await supabaseAdmin
        .from("sistema_setup")
        .insert({
          setup_concluido: true,
          data_conclusao: new Date().toISOString(),
          concluido_por: userId,
          master_users_count: 1,
          versao_schema: "1.0.0",
        });
    }

    // 6. Log the action
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: userId,
        action: "INITIAL_SETUP",
        table_name: "sistema_setup",
        new_values: {
          nomeAssociacao,
          email,
          setup_concluido: true,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Sistema configurado com sucesso",
        userId: userId,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (err) {
    console.error("Setup error:", err);
    const errorMessage = err instanceof Error ? err.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
