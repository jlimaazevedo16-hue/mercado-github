import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, role } = await req.json();
    console.log("Received request:", { user_id, role });

    if (!user_id || !role) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔐 Identidade de quem chamou
    const authHeader = req.headers.get("Authorization");
    console.log("Auth header present:", !!authHeader);
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      console.log("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Usuário inválido" }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log("Authenticated user:", user.id);
    // 🔍 Verificar se é administrador_master
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    console.log("Role check result:", roleCheck);

    if (roleCheck?.role !== "administrador_master") {
      return new Response(JSON.stringify({ error: "Acesso negado - apenas administrador_master" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    // ✅ Atualizar role do usuário alvo
    const { error: updateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role })
      .eq("user_id", user_id);

    if (updateError) {
      console.log("Update error:", updateError);
      throw updateError;
    }
    console.log("Role updated successfully for user:", user_id);

    // 🧾 Auditoria
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: "UPDATE_USER_ROLE",
      table_name: "user_roles",
      record_id: user_id,
      new_values: { role },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error("Error in set-user-role:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
