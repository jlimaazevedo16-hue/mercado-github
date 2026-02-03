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
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Get the JWT from authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the calling user
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is a master admin
    const { data: callerRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", callerUser.id)
      .single();

    if (callerRole?.role !== "administrador_master") {
      return new Response(
        JSON.stringify({ error: "Apenas Administradores Master podem promover outros usuários" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { targetUserId, password } = await req.json();

    if (!targetUserId || !password) {
      return new Response(
        JSON.stringify({ error: "ID do usuário e senha são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller's password
    const { error: signInError } = await supabaseAdmin.auth.signInWithPassword({
      email: callerUser.email!,
      password: password,
    });

    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Senha incorreta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user exists
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("nome, email")
      .eq("user_id", targetUserId)
      .single();

    if (!targetProfile) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current role of target user
    const { data: currentRole } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", targetUserId)
      .single();

    // Update or insert the role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: targetUserId,
        role: "administrador_master",
      }, { onConflict: 'user_id' });

    if (roleError) {
      return new Response(
        JSON.stringify({ error: `Erro ao promover usuário: ${roleError.message}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Increment master count
    await supabaseAdmin.rpc("increment_master_count");

    // Log the action
    await supabaseAdmin
      .from("audit_logs")
      .insert({
        user_id: callerUser.id,
        action: "PROMOTE_MASTER",
        table_name: "user_roles",
        record_id: targetUserId,
        old_values: { role: currentRole?.role || "none" },
        new_values: { 
          role: "administrador_master",
          promoted_by: callerUser.email,
          promoted_user: targetProfile.email,
        },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `${targetProfile.nome} foi promovido a Administrador Master`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("Promote master error:", err);
    const errorMessage = err instanceof Error ? err.message : "Erro interno do servidor";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
