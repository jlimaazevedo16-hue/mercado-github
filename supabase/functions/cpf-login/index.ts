import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatCPF(numbersOnly: string): string {
  const n = numbersOnly.replace(/\D/g, "").slice(0, 11);
  if (n.length !== 11) return n;
  return `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9, 11)}`;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Método não permitido" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { cpf, password } = await req.json();

    const cpfNumbers = String(cpf ?? "").replace(/\D/g, "");
    const pwd = String(password ?? "");

    if (cpfNumbers.length !== 11 || !pwd) {
      return new Response(JSON.stringify({ error: "Parâmetros inválidos" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1) Resolver CPF -> email (sem depender de leitura pública de perfis)
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const formattedCPF = formatCPF(cpfNumbers);

    let email: string | null = null;

    // Tentativa rápida: formatos exatos
    const { data: exactProfile } = await admin
      .from("profiles")
      .select("email, cpf")
      .or(`cpf.eq.${formattedCPF},cpf.eq.${cpfNumbers}`)
      .maybeSingle();

    email = exactProfile?.email ?? null;

    // Fallback: comparar só números (tolerante a formatações diferentes)
    if (!email) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("email, cpf")
        .not("cpf", "is", null);

      const found = profiles?.find((p) => (p.cpf ?? "").replace(/\D/g, "") === cpfNumbers);
      email = found?.email ?? null;
    }

    if (!email) {
      // Mensagem genérica para não permitir enumeração por CPF
      return new Response(JSON.stringify({ error: "CPF ou senha incorretos" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Autenticar usando email + senha e devolver sessão para o cliente
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({
      email,
      password: pwd,
    });

    if (signInError || !signInData.session) {
      return new Response(JSON.stringify({ error: "CPF ou senha incorretos" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ session: signInData.session }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_err) {
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
