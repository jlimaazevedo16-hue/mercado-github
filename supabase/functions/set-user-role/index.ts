import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const { user_id, role } = await req.json();

    if (!user_id || !role) {
      return new Response(
        JSON.stringify({ error: "Parâmetros inválidos" }),
        { status: 400 }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 🔐 Identidade de quem chamou
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
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
      return new Response(JSON.stringify({ error: "Usuário inválido" }), {
        status: 401,
      });
    }

    // 🔍 Verificar se é administrador_master
    const { data: roleCheck } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();

    if (roleCheck?.role !== "administrador_master") {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
      });
    }

    // ✅ Atualizar role do usuário alvo
    const { error: updateError } = await supabaseAdmin
      .from("user_roles")
      .update({ role })
      .eq("user_id", user_id);

    if (updateError) throw updateError;

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
      { status: 200 }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500 }
    );
  }
});
