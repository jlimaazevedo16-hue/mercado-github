import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { integracao, config } = await req.json();

    console.log(`Testando integração: ${integracao}`);

    let result = { success: false, message: 'Integração não suportada' };

    switch (integracao) {
      case 'supabase':
        result = await testSupabase(config);
        break;
      case 'resend':
        result = await testResend(config);
        break;
      case 'evolution':
        result = await testEvolution(config);
        break;
      case 'gemini':
        result = await testGemini(config);
        break;
      default:
        result = { success: false, message: `Integração "${integracao}" não suportada` };
    }

    console.log(`Resultado do teste ${integracao}:`, result);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro no teste de integração:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testSupabase(config: { url: string; anon_key: string }): Promise<{ success: boolean; message: string }> {
  if (!config.url || !config.anon_key) {
    return { success: false, message: 'URL e Anon Key são obrigatórios' };
  }

  try {
    const client = createClient(config.url, config.anon_key);
    
    // Tenta fazer uma query simples para verificar conexão
    const { error } = await client.from('_health_check_test').select('*').limit(1);
    
    // Se o erro for "relation does not exist", a conexão funcionou
    if (error && !error.message.includes('does not exist')) {
      // Outros erros podem indicar problemas de conexão
      if (error.message.includes('Invalid API key') || error.message.includes('Invalid JWT')) {
        return { success: false, message: 'Chave de API inválida' };
      }
    }
    
    return { success: true, message: 'Conexão com Supabase estabelecida com sucesso!' };
  } catch (error: any) {
    return { success: false, message: `Erro ao conectar: ${error.message}` };
  }
}

async function testResend(config: { api_key: string; from_email?: string }): Promise<{ success: boolean; message: string }> {
  if (!config.api_key) {
    return { success: false, message: 'API Key é obrigatória' };
  }

  try {
    // Verificar a API key fazendo uma chamada à API de domínios
    const response = await fetch('https://api.resend.com/domains', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
      },
    });

    if (response.status === 401) {
      return { success: false, message: 'API Key inválida' };
    }

    if (!response.ok) {
      const errorData = await response.json();
      return { success: false, message: errorData.message || 'Erro ao validar API Key' };
    }

    return { success: true, message: 'Conexão com Resend validada com sucesso!' };
  } catch (error: any) {
    return { success: false, message: `Erro ao conectar com Resend: ${error.message}` };
  }
}

async function testEvolution(config: { api_url: string; api_key: string; instance_name: string }): Promise<{ success: boolean; message: string }> {
  if (!config.api_url || !config.api_key) {
    return { success: false, message: 'URL e API Key são obrigatórios' };
  }

  try {
    const response = await fetch(`${config.api_url}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'apikey': config.api_key,
      },
    });

    if (response.status === 401 || response.status === 403) {
      return { success: false, message: 'API Key inválida ou sem permissão' };
    }

    if (!response.ok) {
      return { success: false, message: `Erro na API: ${response.status}` };
    }

    return { success: true, message: 'Conexão com Evolution API validada!' };
  } catch (error: any) {
    return { success: false, message: `Erro ao conectar: ${error.message}` };
  }
}

async function testGemini(config: { api_key: string }): Promise<{ success: boolean; message: string }> {
  if (!config.api_key) {
    return { success: false, message: 'API Key é obrigatória' };
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${config.api_key}`, {
      method: 'GET',
    });

    if (response.status === 400 || response.status === 401) {
      return { success: false, message: 'API Key inválida' };
    }

    if (!response.ok) {
      return { success: false, message: `Erro na API: ${response.status}` };
    }

    return { success: true, message: 'Conexão com Google Gemini validada!' };
  } catch (error: any) {
    return { success: false, message: `Erro ao conectar: ${error.message}` };
  }
}
