import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "generate_qr" | "check_status" | "disconnect" | "send_message" | "process_queue";
  instance_id?: string;
  api_url?: string;
  api_key?: string;
  instance_name?: string;
  phone?: string;
  message?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: RequestBody = await req.json();
    const { action, instance_id, api_url, api_key, instance_name, phone, message } = body;

    switch (action) {
      case "generate_qr": {
        if (!api_url || !api_key || !instance_name) {
          throw new Error("Dados da instância incompletos");
        }

        // Create instance on Evolution API
        const createResponse = await fetch(`${api_url}/instance/create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": api_key,
          },
          body: JSON.stringify({
            instanceName: instance_name,
            qrcode: true,
            integration: "WHATSAPP-BAILEYS",
          }),
        });

        if (!createResponse.ok) {
          // Instance might already exist, try to connect
          const connectResponse = await fetch(`${api_url}/instance/connect/${instance_name}`, {
            method: "GET",
            headers: {
              "apikey": api_key,
            },
          });

          if (connectResponse.ok) {
            const connectData = await connectResponse.json();
            return new Response(
              JSON.stringify({ 
                qrcode: connectData.base64 || connectData.qrcode?.base64,
                status: "waiting_qr" 
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error("Falha ao criar/conectar instância");
        }

        const createData = await createResponse.json();
        return new Response(
          JSON.stringify({ 
            qrcode: createData.qrcode?.base64 || createData.base64,
            status: "waiting_qr" 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "check_status": {
        if (!api_url || !api_key || !instance_name) {
          throw new Error("Dados da instância incompletos");
        }

        const statusResponse = await fetch(`${api_url}/instance/connectionState/${instance_name}`, {
          method: "GET",
          headers: {
            "apikey": api_key,
          },
        });

        if (!statusResponse.ok) {
          return new Response(
            JSON.stringify({ status: "disconnected" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const statusData = await statusResponse.json();
        const state = statusData.instance?.state || statusData.state;
        
        let status = "disconnected";
        if (state === "open" || state === "connected") {
          status = "connected";
        } else if (state === "connecting") {
          status = "waiting_qr";
        }

        return new Response(
          JSON.stringify({ status }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "disconnect": {
        if (!api_url || !api_key || !instance_name) {
          throw new Error("Dados da instância incompletos");
        }

        await fetch(`${api_url}/instance/logout/${instance_name}`, {
          method: "DELETE",
          headers: {
            "apikey": api_key,
          },
        });

        return new Response(
          JSON.stringify({ success: true, status: "disconnected" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "send_message": {
        if (!api_url || !api_key || !instance_name || !phone || !message) {
          throw new Error("Dados para envio incompletos");
        }

        // Format phone number (remove non-digits, ensure country code)
        let formattedPhone = phone.replace(/\D/g, "");
        if (!formattedPhone.startsWith("55")) {
          formattedPhone = "55" + formattedPhone;
        }

        const sendResponse = await fetch(`${api_url}/message/sendText/${instance_name}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": api_key,
          },
          body: JSON.stringify({
            number: formattedPhone,
            text: message,
          }),
        });

        const sendData = await sendResponse.json();

        if (!sendResponse.ok) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: sendData.message || "Erro ao enviar mensagem",
              response: sendData 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        return new Response(
          JSON.stringify({ success: true, response: sendData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "process_queue": {
        // Get config
        const { data: config } = await supabase
          .from("whatsapp_config")
          .select("*")
          .limit(1)
          .single();

        const intervaloMin = config?.intervalo_min_segundos || 5;
        const intervaloMax = config?.intervalo_max_segundos || 10;
        const maxLote = config?.max_mensagens_lote || 30;

        // Get pending messages
        const { data: pendingMessages, error: queueError } = await supabase
          .from("whatsapp_queue")
          .select(`
            *,
            whatsapp_instances (api_url, api_key, instance_name, status)
          `)
          .eq("status", "pendente")
          .or(`agendado_para.is.null,agendado_para.lte.${new Date().toISOString()}`)
          .order("created_at", { ascending: true })
          .limit(maxLote);

        if (queueError) throw queueError;
        if (!pendingMessages || pendingMessages.length === 0) {
          return new Response(
            JSON.stringify({ processed: 0, message: "Nenhuma mensagem pendente" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        let processed = 0;
        let errors = 0;

        for (const msg of pendingMessages) {
          const instance = msg.whatsapp_instances;
          if (!instance || instance.status !== "connected") {
            // Update as error
            await supabase
              .from("whatsapp_queue")
              .update({ 
                status: "erro", 
                erro_mensagem: "Instância não conectada",
                tentativas: msg.tentativas + 1
              })
              .eq("id", msg.id);
            errors++;
            continue;
          }

          // Update status to processing
          await supabase
            .from("whatsapp_queue")
            .update({ status: "processando" })
            .eq("id", msg.id);

          try {
            // Send message
            const sendResponse = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": instance.api_key,
              },
              body: JSON.stringify({
                number: msg.destinatario_telefone.replace(/\D/g, ""),
                text: msg.conteudo,
              }),
            });

            const sendData = await sendResponse.json();

            if (sendResponse.ok) {
              // Update queue as sent
              await supabase
                .from("whatsapp_queue")
                .update({ status: "enviado" })
                .eq("id", msg.id);

              // Create log
              await supabase.from("whatsapp_logs").insert({
                queue_id: msg.id,
                instance_id: msg.instance_id,
                template_id: msg.template_id,
                destinatario_telefone: msg.destinatario_telefone,
                destinatario_nome: msg.destinatario_nome,
                conteudo: msg.conteudo,
                status: "enviado",
                resposta_api: sendData,
                enviado_por: msg.created_by,
              });

              processed++;
            } else {
              throw new Error(sendData.message || "Erro na API");
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
            
            await supabase
              .from("whatsapp_queue")
              .update({ 
                status: "erro", 
                erro_mensagem: errorMessage,
                tentativas: msg.tentativas + 1
              })
              .eq("id", msg.id);

            // Create error log
            await supabase.from("whatsapp_logs").insert({
              queue_id: msg.id,
              instance_id: msg.instance_id,
              template_id: msg.template_id,
              destinatario_telefone: msg.destinatario_telefone,
              destinatario_nome: msg.destinatario_nome,
              conteudo: msg.conteudo,
              status: "erro",
              resposta_api: { error: errorMessage },
              enviado_por: msg.created_by,
            });

            errors++;
          }

          // Wait random interval between messages
          const delay = Math.floor(Math.random() * (intervaloMax - intervaloMin + 1)) + intervaloMin;
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        return new Response(
          JSON.stringify({ processed, errors, total: pendingMessages.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error("Ação não reconhecida");
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("WhatsApp Evolution Error:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
