import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  action: "generate_qr" | "check_status" | "disconnect" | "send_message" | "process_queue" | "test_connection" | "retry_message";
  instance_id?: string;
  api_url?: string;
  api_key?: string;
  instance_name?: string;
  phone?: string;
  message?: string;
  queue_id?: string;
}

interface WhatsAppConfig {
  intervalo_min_segundos: number;
  intervalo_max_segundos: number;
  max_mensagens_lote: number;
  espera_entre_lotes_minutos: number;
  hora_inicio_envio: string;
  hora_fim_envio: string;
  max_tentativas: number;
}

// Helper: Check if current time is within allowed hours
function isWithinAllowedHours(horaInicio: string, horaFim: string): boolean {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5); // "HH:MM"
  
  const inicio = horaInicio?.slice(0, 5) || "08:00";
  const fim = horaFim?.slice(0, 5) || "18:00";
  
  return currentTime >= inicio && currentTime <= fim;
}

// Helper: Format phone number for Brazil
function formatPhoneNumber(phone: string): string {
  let formatted = phone.replace(/\D/g, "");
  if (!formatted.startsWith("55")) {
    formatted = "55" + formatted;
  }
  return formatted;
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
    const { action, instance_id, api_url, api_key, instance_name, phone, message, queue_id } = body;

    console.log(`WhatsApp Evolution: Action ${action} requested`);

    switch (action) {
      case "test_connection": {
        if (!api_url || !api_key) {
          throw new Error("URL e API Key são obrigatórios");
        }

        try {
          const response = await fetch(`${api_url}/instance/fetchInstances`, {
            method: "GET",
            headers: {
              "apikey": api_key,
            },
          });

          if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
          }

          return new Response(
            JSON.stringify({ success: true, message: "Conexão estabelecida com sucesso" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : "Falha na conexão";
          return new Response(
            JSON.stringify({ success: false, error: errorMsg }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }
      }

      case "generate_qr": {
        if (!api_url || !api_key || !instance_name) {
          throw new Error("Dados da instância incompletos");
        }

        console.log(`Generating QR for instance: ${instance_name}`);

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
          console.log("Instance may exist, trying to connect...");
          const connectResponse = await fetch(`${api_url}/instance/connect/${instance_name}`, {
            method: "GET",
            headers: {
              "apikey": api_key,
            },
          });

          if (connectResponse.ok) {
            const connectData = await connectResponse.json();
            const qrcode = connectData.base64 || connectData.qrcode?.base64;
            return new Response(
              JSON.stringify({ 
                qrcode,
                status: "waiting_qr" 
              }),
              { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          throw new Error("Falha ao criar/conectar instância");
        }

        const createData = await createResponse.json();
        console.log("Instance created successfully");
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
        let phoneNumber = null;

        if (state === "open" || state === "connected") {
          status = "connected";
          // Try to get phone number
          try {
            const infoResponse = await fetch(`${api_url}/instance/fetchInstances`, {
              method: "GET",
              headers: { "apikey": api_key },
            });
            if (infoResponse.ok) {
              const instances = await infoResponse.json();
              const instance = instances.find((i: any) => i.name === instance_name);
              phoneNumber = instance?.ownerJid?.split("@")[0] || null;
            }
          } catch (e) {
            console.log("Could not fetch phone number");
          }
        } else if (state === "connecting") {
          status = "waiting_qr";
        }

        return new Response(
          JSON.stringify({ status, phoneNumber }),
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

        const formattedPhone = formatPhoneNumber(phone);
        console.log(`Sending message to ${formattedPhone}`);

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
          console.error("Send message error:", sendData);
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: sendData.message || "Erro ao enviar mensagem",
              response: sendData 
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
          );
        }

        console.log("Message sent successfully");
        return new Response(
          JSON.stringify({ success: true, response: sendData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "retry_message": {
        if (!queue_id) {
          throw new Error("ID da mensagem não fornecido");
        }

        // Get the message from queue
        const { data: queueItem, error: fetchError } = await supabase
          .from("whatsapp_queue")
          .select(`
            *,
            whatsapp_instances (api_url, api_key, instance_name, status)
          `)
          .eq("id", queue_id)
          .single();

        if (fetchError || !queueItem) {
          throw new Error("Mensagem não encontrada na fila");
        }

        // Reset status to pending for reprocessing
        await supabase
          .from("whatsapp_queue")
          .update({ 
            status: "pendente", 
            erro_mensagem: null 
          })
          .eq("id", queue_id);

        return new Response(
          JSON.stringify({ success: true, message: "Mensagem reenfileirada para reprocessamento" }),
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

        const configData: WhatsAppConfig = {
          intervalo_min_segundos: config?.intervalo_min_segundos || 5,
          intervalo_max_segundos: config?.intervalo_max_segundos || 10,
          max_mensagens_lote: config?.max_mensagens_lote || 30,
          espera_entre_lotes_minutos: config?.espera_entre_lotes_minutos || 5,
          hora_inicio_envio: config?.hora_inicio_envio || "08:00:00",
          hora_fim_envio: config?.hora_fim_envio || "18:00:00",
          max_tentativas: config?.max_tentativas || 3,
        };

        // Check allowed hours
        if (!isWithinAllowedHours(configData.hora_inicio_envio, configData.hora_fim_envio)) {
          console.log("Outside allowed hours, skipping processing");
          return new Response(
            JSON.stringify({ 
              processed: 0, 
              message: `Fora do horário permitido (${configData.hora_inicio_envio} - ${configData.hora_fim_envio})`,
              skipped: true
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Get pending messages (not exceeding max attempts)
        const { data: pendingMessages, error: queueError } = await supabase
          .from("whatsapp_queue")
          .select(`
            *,
            whatsapp_instances (id, api_url, api_key, instance_name, status)
          `)
          .eq("status", "pendente")
          .lt("tentativas", configData.max_tentativas)
          .or(`agendado_para.is.null,agendado_para.lte.${new Date().toISOString()}`)
          .order("created_at", { ascending: true })
          .limit(configData.max_mensagens_lote);

        if (queueError) {
          console.error("Queue fetch error:", queueError);
          throw queueError;
        }

        if (!pendingMessages || pendingMessages.length === 0) {
          return new Response(
            JSON.stringify({ processed: 0, message: "Nenhuma mensagem pendente" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        console.log(`Processing ${pendingMessages.length} messages`);

        let processed = 0;
        let errors = 0;

        for (const msg of pendingMessages) {
          const instance = msg.whatsapp_instances;
          
          // Check if instance is connected
          if (!instance || instance.status !== "connected") {
            console.log(`Instance not connected for message ${msg.id}`);
            await supabase
              .from("whatsapp_queue")
              .update({ 
                status: "erro", 
                erro_mensagem: "Instância não conectada",
                tentativas: msg.tentativas + 1
              })
              .eq("id", msg.id);

            await supabase.from("whatsapp_logs").insert({
              queue_id: msg.id,
              instance_id: msg.instance_id,
              template_id: msg.template_id,
              destinatario_telefone: msg.destinatario_telefone,
              destinatario_nome: msg.destinatario_nome,
              conteudo: msg.conteudo,
              status: "erro",
              resposta_api: { error: "Instância não conectada" },
              enviado_por: msg.created_by,
            });

            errors++;
            continue;
          }

          // Update status to processing
          await supabase
            .from("whatsapp_queue")
            .update({ status: "processando" })
            .eq("id", msg.id);

          try {
            // Format phone number
            const formattedPhone = formatPhoneNumber(msg.destinatario_telefone);

            // Send message via Evolution API
            const sendResponse = await fetch(`${instance.api_url}/message/sendText/${instance.instance_name}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "apikey": instance.api_key,
              },
              body: JSON.stringify({
                number: formattedPhone,
                text: msg.conteudo,
              }),
            });

            const sendData = await sendResponse.json();

            if (sendResponse.ok) {
              console.log(`Message ${msg.id} sent successfully`);
              
              // Update queue as sent
              await supabase
                .from("whatsapp_queue")
                .update({ 
                  status: "enviado",
                  tentativas: msg.tentativas + 1
                })
                .eq("id", msg.id);

              // Create success log
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
              throw new Error(sendData.message || sendData.error || "Erro na API Evolution");
            }
          } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Erro desconhecido";
            console.error(`Error sending message ${msg.id}:`, errorMessage);
            
            const newAttempts = msg.tentativas + 1;
            const finalStatus = newAttempts >= configData.max_tentativas ? "erro" : "pendente";

            await supabase
              .from("whatsapp_queue")
              .update({ 
                status: finalStatus, 
                erro_mensagem: errorMessage,
                tentativas: newAttempts
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
              resposta_api: { error: errorMessage, attempt: newAttempts },
              enviado_por: msg.created_by,
            });

            errors++;
          }

          // Wait random interval between messages (anti-ban)
          const delay = Math.floor(Math.random() * (configData.intervalo_max_segundos - configData.intervalo_min_segundos + 1)) + configData.intervalo_min_segundos;
          console.log(`Waiting ${delay}s before next message`);
          await new Promise((resolve) => setTimeout(resolve, delay * 1000));
        }

        console.log(`Queue processing complete: ${processed} sent, ${errors} errors`);
        return new Response(
          JSON.stringify({ 
            processed, 
            errors, 
            total: pendingMessages.length,
            message: `Processadas ${processed} mensagens, ${errors} erros`
          }),
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
