import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Você é um assistente interno do sistema de gestão de mercados públicos. Seu papel é:

1. **Explicar campos e regras do sistema:**
   - Notificações: tipos (advertência, multa, suspensão, cancelamento), classificações (leve, média, grave, gravíssima), prazos de defesa e adequação
   - PAD (Processo Administrativo Disciplinar): etapas (instaurado, defesa, julgamento, recurso, decisão final), cálculo de multas
   - Certificados e documentos: tipos, validades, alertas de vencimento
   - Pendências: categorias, prioridades, status

2. **Ajudar a redigir textos:**
   - Atas de reuniões e assembleias
   - Notificações internas e oficiais
   - Respostas padrão para situações comuns
   - Justificativas e fundamentações

3. **Orientar preenchimento de dados:**
   - Explicar quais campos são obrigatórios
   - Formatos corretos (CPF, datas, valores)
   - Boas práticas de cadastro

4. **Gerar sugestões:**
   - Modelos de texto para notificações
   - Sugestões de fundamentação legal
   - Orientações sobre procedimentos

**RESTRIÇÕES IMPORTANTES:**
- Você NÃO pode criar, alterar ou deletar dados no sistema
- Você apenas SUGERE conteúdo e ORIENTA passos
- Sempre indique que o usuário deve revisar e confirmar antes de usar qualquer texto gerado
- Não execute ações, apenas explique como fazê-las

**CONTEXTO DO SISTEMA:**
- Boxes: unidades comerciais alugadas em mercados públicos
- Responsáveis: lojistas que operam os boxes
- UFMS: Unidade Fiscal do Município (base para cálculos de aluguel e multas)
- Segmentos: categorias de atividade (pescados, hortifruti, etc.)
- Setores: divisões físicas do mercado

Seja claro, objetivo e sempre forneça informações precisas sobre o funcionamento do sistema.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const { messages, tipo_consulta = "chat" } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    let userId: string | null = null;

    if (authHeader) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseKey, {
        global: { headers: { Authorization: authHeader } }
      });
      
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id || null;

      // Verify user is admin
      if (userId) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId)
          .single();

        if (!roleData || !["administrador_master", "administrador"].includes(roleData.role)) {
          return new Response(
            JSON.stringify({ error: "Acesso negado. Apenas administradores podem usar o assistente." }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
    }

    // Call Lovable AI Gateway
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Contate o administrador do sistema." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "Erro ao processar sua solicitação." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the usage (async, don't wait)
    if (userId) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
      
      const lastUserMessage = messages.filter((m: { role: string }) => m.role === "user").pop();
      
      supabaseAdmin.from("assistant_logs").insert([{
        user_id: userId,
        tipo_consulta,
        pergunta: lastUserMessage?.content || "",
        duracao_ms: Date.now() - startTime,
      }]);
    }

    // Return streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (error) {
    console.error("Assistant error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
