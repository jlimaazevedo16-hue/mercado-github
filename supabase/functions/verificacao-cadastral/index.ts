import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface VerificationRequest {
  action: 'generate' | 'validate';
  responsavel_id?: string;
  token?: string;
  tipo?: 'confirmar' | 'corrigir';
  observacoes?: string;
  peek?: boolean; // Just check token validity without consuming it
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: VerificationRequest = await req.json();
    const { action } = body;

    // Get client info for logging
    const userAgent = req.headers.get('user-agent') || '';
    const forwardedFor = req.headers.get('x-forwarded-for');
    const ipAddress = forwardedFor ? forwardedFor.split(',')[0].trim() : 'unknown';

    if (action === 'generate') {
      // Generate secure temporary links
      const { responsavel_id } = body;
      
      if (!responsavel_id) {
        return new Response(
          JSON.stringify({ success: false, error: 'responsavel_id é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if responsavel exists
      const { data: responsavel, error: respError } = await supabase
        .from('responsaveis')
        .select('id, nome')
        .eq('id', responsavel_id)
        .single();

      if (respError || !responsavel) {
        return new Response(
          JSON.stringify({ success: false, error: 'Responsável não encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Invalidate any existing unused tokens for this responsavel
      await supabase
        .from('verificacao_tokens')
        .update({ usado: true, usado_em: new Date().toISOString() })
        .eq('responsavel_id', responsavel_id)
        .eq('usado', false);

      // Generate two tokens (confirm and correct)
      const generateToken = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      };

      const tokenConfirmar = generateToken();
      const tokenCorrigir = generateToken();
      
      // Tokens expire in 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      // Insert tokens
      const { error: insertError } = await supabase
        .from('verificacao_tokens')
        .insert([
          {
            responsavel_id,
            token: tokenConfirmar,
            tipo: 'confirmar',
            expires_at: expiresAt.toISOString(),
          },
          {
            responsavel_id,
            token: tokenCorrigir,
            tipo: 'corrigir',
            expires_at: expiresAt.toISOString(),
          }
        ]);

      if (insertError) {
        console.error('Error inserting tokens:', insertError);
        return new Response(
          JSON.stringify({ success: false, error: 'Erro ao gerar tokens' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the action
      await supabase
        .from('verificacao_historico')
        .insert({
          responsavel_id,
          acao: 'email_enviado',
          detalhes: { expires_at: expiresAt.toISOString() },
        });

      // Get the app URL from environment or use a default
      const appUrl = Deno.env.get('APP_URL') || 'https://id-preview--c1307741-633a-4d59-abe1-b4d3c06186cc.lovable.app';

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            link_confirmar: `${appUrl}/verificacao/${tokenConfirmar}`,
            link_corrigir: `${appUrl}/verificacao/${tokenCorrigir}`,
            expires_at: expiresAt.toISOString(),
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'validate') {
      // Validate token and record action
      const { token, observacoes, peek } = body;

      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Token é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Find the token
      const { data: tokenData, error: tokenError } = await supabase
        .from('verificacao_tokens')
        .select('*, responsaveis(id, nome, email, telefone)')
        .eq('token', token)
        .single();

      if (tokenError || !tokenData) {
        console.log('Token not found:', token);
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Link inválido ou expirado',
            code: 'TOKEN_NOT_FOUND'
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token is already used
      if (tokenData.usado) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Este link já foi utilizado',
            code: 'TOKEN_USED',
            used_at: tokenData.usado_em
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if token is expired
      const now = new Date();
      const expiresAt = new Date(tokenData.expires_at);
      if (now > expiresAt) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Este link expirou',
            code: 'TOKEN_EXPIRED',
            expired_at: tokenData.expires_at
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If peek mode, just return token info without consuming it
      if (peek) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              tipo: tokenData.tipo,
              responsavel: tokenData.responsaveis,
            }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Mark token as used
      await supabase
        .from('verificacao_tokens')
        .update({
          usado: true,
          usado_em: now.toISOString(),
          ip_address: ipAddress,
          user_agent: userAgent,
        })
        .eq('id', tokenData.id);

      // Determine action based on token type
      const acao = tokenData.tipo === 'confirmar' ? 'confirmado' : 'correcao_solicitada';
      const novoStatus = tokenData.tipo === 'confirmar' ? 'confirmado' : 'pendente_correcao';

      // Update responsavel verification status
      await supabase
        .from('responsaveis')
        .update({
          verificacao_status: novoStatus,
          verificacao_data: now.toISOString(),
        })
        .eq('id', tokenData.responsavel_id);

      // Log the action in history
      await supabase
        .from('verificacao_historico')
        .insert({
          responsavel_id: tokenData.responsavel_id,
          acao,
          detalhes: {
            observacoes: observacoes || null,
            token_id: tokenData.id,
          },
          ip_address: ipAddress,
          user_agent: userAgent,
        });

      // Invalidate all other tokens for this responsavel
      await supabase
        .from('verificacao_tokens')
        .update({ usado: true, usado_em: now.toISOString() })
        .eq('responsavel_id', tokenData.responsavel_id)
        .eq('usado', false);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            tipo: tokenData.tipo,
            acao,
            responsavel: tokenData.responsaveis,
            message: tokenData.tipo === 'confirmar' 
              ? 'Dados cadastrais confirmados com sucesso!'
              : 'Solicitação de correção registrada. Entraremos em contato em breve.',
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in verificacao-cadastral:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
