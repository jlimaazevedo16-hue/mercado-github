import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    pushName?: string;
    message?: {
      conversation?: string;
      extendedTextMessage?: { text?: string };
      imageMessage?: any;
      audioMessage?: any;
      documentMessage?: any;
      videoMessage?: any;
    };
    messageType?: string;
    messageTimestamp?: number;
    status?: string;
  };
  destination?: string;
  date_time?: string;
  sender?: string;
  apikey?: string;
}

// Helper to extract phone from JID
function extractPhone(jid: string): string {
  return jid?.split("@")[0] || "";
}

// Helper to extract message content
function extractMessageContent(message: any): { texto: string; tipo: string } {
  if (message?.conversation) {
    return { texto: message.conversation, tipo: "texto" };
  }
  if (message?.extendedTextMessage?.text) {
    return { texto: message.extendedTextMessage.text, tipo: "texto" };
  }
  if (message?.imageMessage) {
    return { texto: "[Imagem recebida]", tipo: "imagem" };
  }
  if (message?.audioMessage) {
    return { texto: "[Áudio recebido]", tipo: "audio" };
  }
  if (message?.videoMessage) {
    return { texto: "[Vídeo recebido]", tipo: "video" };
  }
  if (message?.documentMessage) {
    return { texto: "[Documento recebido]", tipo: "documento" };
  }
  return { texto: "[Mensagem não suportada]", tipo: "outro" };
}

// Check if current time is within allowed hours
function isWithinAllowedHours(horaInicio: string, horaFim: string): boolean {
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const inicio = horaInicio?.slice(0, 5) || "08:00";
  const fim = horaFim?.slice(0, 5) || "18:00";
  return currentTime >= inicio && currentTime <= fim;
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

    const payload: EvolutionWebhookPayload = await req.json();
    const { event, instance, data } = payload;

    console.log(`Webhook received: ${event} from instance ${instance}`);

    // Get instance from database
    const { data: instanceData } = await supabase
      .from("whatsapp_instances")
      .select("id, api_url, api_key")
      .eq("instance_name", instance)
      .single();

    // Log raw webhook payload
    await supabase.from("whatsapp_webhooks").insert({
      instance_id: instanceData?.id || null,
      evento: event,
      payload: payload,
      processado: false,
    });

    // Process based on event type
    switch (event) {
      case "messages.upsert": {
        // New message received
        if (!data.key?.fromMe && data.message) {
          const phone = extractPhone(data.key?.remoteJid || "");
          const { texto, tipo } = extractMessageContent(data.message);
          const pushName = data.pushName || "";

          // Try to find responsavel by phone
          const { data: responsavel } = await supabase
            .from("responsaveis")
            .select("id, nome")
            .or(`telefone.ilike.%${phone.slice(-9)}%,telefone_secundario.ilike.%${phone.slice(-9)}%`)
            .limit(1)
            .maybeSingle();

          // Try to find box by responsavel
          let boxId = null;
          if (responsavel?.id) {
            const { data: box } = await supabase
              .from("boxes")
              .select("id")
              .eq("responsavel_id", responsavel.id)
              .limit(1)
              .maybeSingle();
            boxId = box?.id;
          }

          // Save received message
          await supabase.from("whatsapp_recebidas").insert({
            instance_id: instanceData?.id,
            telefone_origem: phone,
            nome_contato: pushName || responsavel?.nome || null,
            mensagem: texto,
            tipo: tipo,
            message_id: data.key?.id,
            box_id: boxId,
            responsavel_id: responsavel?.id || null,
          });

          console.log(`Message saved from ${phone}: ${texto.substring(0, 50)}...`);

          // Check for automation triggers
          if (tipo === "texto" && instanceData?.id) {
            const { data: automacoes } = await supabase
              .from("whatsapp_automacoes")
              .select("*, whatsapp_templates(*)")
              .eq("ativo", true);

            for (const automacao of automacoes || []) {
              let shouldRespond = false;

              // Check trigger
              if (automacao.gatilho_tipo === "palavra_chave") {
                const keywords = automacao.gatilho_valor.toLowerCase().split(",").map((k: string) => k.trim());
                shouldRespond = keywords.some((kw: string) => texto.toLowerCase().includes(kw));
              } else if (automacao.gatilho_tipo === "tipo_mensagem") {
                shouldRespond = tipo === automacao.gatilho_valor;
              }

              if (!shouldRespond) continue;

              // Check if should respect hours
              if (automacao.respeitar_horario) {
                const { data: config } = await supabase
                  .from("whatsapp_config")
                  .select("hora_inicio_envio, hora_fim_envio")
                  .limit(1)
                  .single();

                if (config && !isWithinAllowedHours(config.hora_inicio_envio, config.hora_fim_envio)) {
                  console.log("Outside allowed hours, skipping automation");
                  continue;
                }
              }

              // Check one-time per conversation
              if (automacao.uma_vez_por_conversa) {
                const { data: conversa } = await supabase
                  .from("whatsapp_conversas")
                  .select("*")
                  .eq("instance_id", instanceData.id)
                  .eq("telefone", phone)
                  .eq("automacao_id", automacao.id)
                  .maybeSingle();

                if (conversa?.ultima_resposta_automatica) {
                  // Check if last response was within 24 hours
                  const lastResponse = new Date(conversa.ultima_resposta_automatica);
                  const now = new Date();
                  const hoursDiff = (now.getTime() - lastResponse.getTime()) / (1000 * 60 * 60);
                  if (hoursDiff < 24) {
                    console.log("Already responded to this conversation within 24h");
                    continue;
                  }
                }
              }

              // Get response content
              let responseContent = automacao.resposta_customizada;
              if (automacao.template_id && automacao.whatsapp_templates) {
                responseContent = automacao.whatsapp_templates.conteudo;
              }

              if (!responseContent) continue;

              // Queue automatic response
              await supabase.from("whatsapp_queue").insert({
                instance_id: instanceData.id,
                destinatario_telefone: phone,
                destinatario_nome: pushName || responsavel?.nome,
                conteudo: responseContent,
                template_id: automacao.template_id,
                status: "pendente",
                responsavel_id: responsavel?.id,
                box_id: boxId,
              });

              // Update conversation tracking
              await supabase.from("whatsapp_conversas").upsert({
                instance_id: instanceData.id,
                telefone: phone,
                ultima_mensagem_recebida: new Date().toISOString(),
                ultima_resposta_automatica: new Date().toISOString(),
                automacao_id: automacao.id,
              }, {
                onConflict: "instance_id,telefone",
              });

              console.log(`Automation triggered: ${automacao.nome}`);
              break; // Only one automation per message
            }
          }
        }
        break;
      }

      case "messages.update":
      case "message.ack": {
        // Message status update (sent, delivered, read)
        const messageId = data.key?.id;
        const status = data.status || (data as any).ack;

        if (messageId) {
          let statusEntrega = "enviado";
          let updateData: Record<string, any> = {};

          // Evolution API status codes: 1=sent, 2=delivered, 3=read
          if (status === "DELIVERY_ACK" || status === 2) {
            statusEntrega = "entregue";
            updateData = { status_entrega: statusEntrega, entregue_em: new Date().toISOString() };
          } else if (status === "READ" || status === 3) {
            statusEntrega = "lido";
            updateData = { status_entrega: statusEntrega, lido_em: new Date().toISOString() };
          } else if (status === "PLAYED") {
            statusEntrega = "reproduzido";
            updateData = { status_entrega: statusEntrega, lido_em: new Date().toISOString() };
          }

          if (Object.keys(updateData).length > 0) {
            await supabase
              .from("whatsapp_logs")
              .update(updateData)
              .eq("message_id", messageId);

            console.log(`Message ${messageId} status updated to ${statusEntrega}`);
          }
        }
        break;
      }

      case "connection.update": {
        // Instance connection status change
        const state = (data as any).state || (data as any).status;
        
        if (instanceData?.id) {
          let newStatus = "disconnected";
          if (state === "open" || state === "connected") {
            newStatus = "connected";
          } else if (state === "connecting") {
            newStatus = "waiting_qr";
          }

          await supabase
            .from("whatsapp_instances")
            .update({ status: newStatus })
            .eq("id", instanceData.id);

          console.log(`Instance ${instance} status updated to ${newStatus}`);
        }
        break;
      }

      case "qrcode.updated": {
        // QR code updated
        const qrcode = (data as any).qrcode?.base64 || (data as any).base64;
        
        if (instanceData?.id && qrcode) {
          await supabase
            .from("whatsapp_instances")
            .update({ qr_code: qrcode, status: "waiting_qr" })
            .eq("id", instanceData.id);

          console.log(`Instance ${instance} QR code updated`);
        }
        break;
      }

      case "send.message": {
        // Message sent confirmation - save message_id for tracking
        const messageId = data.key?.id;
        const remoteJid = data.key?.remoteJid;

        if (messageId && remoteJid) {
          const phone = extractPhone(remoteJid);
          
          // Update the most recent log entry for this phone
          await supabase
            .from("whatsapp_logs")
            .update({ message_id: messageId })
            .eq("destinatario_telefone", phone)
            .is("message_id", null)
            .order("created_at", { ascending: false })
            .limit(1);

          console.log(`Message ID ${messageId} linked to phone ${phone}`);
        }
        break;
      }
    }

    // Mark webhook as processed
    await supabase
      .from("whatsapp_webhooks")
      .update({ processado: true })
      .eq("payload->>event", event)
      .eq("processado", false)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(
      JSON.stringify({ success: true, event }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("Webhook processing error:", errorMessage);

    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
