import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Função simples de criptografia usando base64 + substituição
// Em produção real, usar bibliotecas de criptografia robustas
function encryptConfig(config: Record<string, string>, secretKey: string): string {
  const jsonStr = JSON.stringify(config);
  const encoded = btoa(jsonStr);
  // Adiciona um salt baseado na secret key
  const saltedEncoded = encoded.split('').map((char, i) => {
    const shift = secretKey.charCodeAt(i % secretKey.length) % 26;
    return String.fromCharCode(char.charCodeAt(0) + shift);
  }).join('');
  return btoa(saltedEncoded);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Não autorizado');
    }

    const { integracao_id, integracao, config } = await req.json();

    if (!integracao_id || !integracao || !config) {
      throw new Error('Parâmetros obrigatórios ausentes');
    }

    console.log(`Salvando integração: ${integracao}`);

    // Criar cliente Supabase com service role para bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Chave de criptografia (em produção, usar uma chave mais robusta)
    const encryptionKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')?.slice(0, 32) || 'default-encryption-key-32chars!';

    // Separar campos sensíveis para criptografar
    const sensitiveFields = ['api_key', 'anon_key', 'service_role_key'];
    const sensitiveConfig: Record<string, string> = {};
    const publicConfig: Record<string, string> = {};

    for (const [key, value] of Object.entries(config)) {
      if (sensitiveFields.some(sf => key.toLowerCase().includes(sf.toLowerCase()))) {
        sensitiveConfig[key] = value as string;
      } else {
        publicConfig[key] = value as string;
      }
    }

    // Criptografar campos sensíveis
    const encryptedConfig = Object.keys(sensitiveConfig).length > 0 
      ? encryptConfig(sensitiveConfig, encryptionKey)
      : null;

    // Buscar config_public atual para preservar nome, descricao, icone
    const { data: currentData } = await supabase
      .from('configuracoes_integracoes')
      .select('config_public')
      .eq('id', integracao_id)
      .single();

    const currentConfigPublic = currentData?.config_public as Record<string, any> || {};

    // Atualizar a integração no banco
    const { error: updateError } = await supabase
      .from('configuracoes_integracoes')
      .update({
        status: 'configured',
        config_encrypted: encryptedConfig,
        config_public: {
          ...currentConfigPublic,
          ...publicConfig,
        },
        ultima_verificacao: new Date().toISOString(),
        mensagem_erro: null
      })
      .eq('id', integracao_id);

    if (updateError) {
      console.error('Erro ao atualizar integração:', updateError);
      throw new Error('Erro ao salvar configuração');
    }

    // Verificar se todas as integrações obrigatórias estão configuradas
    const { data: integracoes } = await supabase
      .from('configuracoes_integracoes')
      .select('status, obrigatoria')
      .eq('obrigatoria', true);

    const todasConfiguradas = integracoes?.every(i => i.status === 'configured');

    if (todasConfiguradas) {
      // Marcar setup como concluído
      await supabase
        .from('sistema_setup')
        .update({ 
          setup_concluido: true, 
          data_conclusao: new Date().toISOString() 
        })
        .eq('setup_concluido', false);
    }

    console.log(`Integração ${integracao} salva com sucesso`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Erro ao salvar integração:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
