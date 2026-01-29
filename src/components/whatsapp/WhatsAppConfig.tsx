import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings, Loader2, Save, Shield, Info, Clock } from "lucide-react";
import { toast } from "sonner";

interface Config {
  id: string;
  intervalo_min_segundos: number;
  intervalo_max_segundos: number;
  max_mensagens_lote: number;
  espera_entre_lotes_minutos: number;
  hora_inicio_envio: string;
  hora_fim_envio: string;
  max_tentativas: number;
}

export const WhatsAppConfig = () => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    intervalo_min_segundos: 5,
    intervalo_max_segundos: 10,
    max_mensagens_lote: 30,
    espera_entre_lotes_minutos: 5,
    hora_inicio_envio: "08:00",
    hora_fim_envio: "18:00",
    max_tentativas: 3,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["whatsapp-config"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_config")
        .select("*")
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as Config | null;
    },
  });

  useEffect(() => {
    if (config) {
      setFormData({
        intervalo_min_segundos: config.intervalo_min_segundos,
        intervalo_max_segundos: config.intervalo_max_segundos,
        max_mensagens_lote: config.max_mensagens_lote,
        espera_entre_lotes_minutos: config.espera_entre_lotes_minutos,
        hora_inicio_envio: config.hora_inicio_envio?.slice(0, 5) || "08:00",
        hora_fim_envio: config.hora_fim_envio?.slice(0, 5) || "18:00",
        max_tentativas: config.max_tentativas || 3,
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        hora_inicio_envio: data.hora_inicio_envio + ":00",
        hora_fim_envio: data.hora_fim_envio + ":00",
      };

      if (config?.id) {
        const { error } = await supabase
          .from("whatsapp_config")
          .update(payload)
          .eq("id", config.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("whatsapp_config").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao salvar: " + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Configurações Anti-Ban
          </CardTitle>
          <CardDescription>
            Configure intervalos e limites para evitar bloqueios do WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-yellow-50 dark:bg-yellow-950 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800">
            <div className="flex items-start gap-2">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">Importante: Proteção contra banimento</p>
                <p>
                  Essas configurações ajudam a evitar que o número seja bloqueado pelo WhatsApp.
                  Valores muito baixos podem causar banimento. Recomendamos manter os valores padrão
                  ou aumentá-los conforme necessário.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="intervalo_min">Intervalo Mínimo entre Mensagens (segundos)</Label>
              <Input
                id="intervalo_min"
                type="number"
                min={3}
                max={60}
                value={formData.intervalo_min_segundos}
                onChange={(e) =>
                  setFormData({ ...formData, intervalo_min_segundos: parseInt(e.target.value) || 5 })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo mínimo de espera entre cada mensagem (recomendado: 5s)
              </p>
            </div>

            <div>
              <Label htmlFor="intervalo_max">Intervalo Máximo entre Mensagens (segundos)</Label>
              <Input
                id="intervalo_max"
                type="number"
                min={5}
                max={120}
                value={formData.intervalo_max_segundos}
                onChange={(e) =>
                  setFormData({ ...formData, intervalo_max_segundos: parseInt(e.target.value) || 10 })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo máximo de espera (cria variação aleatória)
              </p>
            </div>

            <div>
              <Label htmlFor="max_lote">Máximo de Mensagens por Lote</Label>
              <Input
                id="max_lote"
                type="number"
                min={5}
                max={100}
                value={formData.max_mensagens_lote}
                onChange={(e) =>
                  setFormData({ ...formData, max_mensagens_lote: parseInt(e.target.value) || 30 })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Quantas mensagens enviar antes de pausar (recomendado: 30)
              </p>
            </div>

            <div>
              <Label htmlFor="espera_lotes">Espera entre Lotes (minutos)</Label>
              <Input
                id="espera_lotes"
                type="number"
                min={1}
                max={60}
                value={formData.espera_entre_lotes_minutos}
                onChange={(e) =>
                  setFormData({ ...formData, espera_entre_lotes_minutos: parseInt(e.target.value) || 5 })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Tempo de pausa após cada lote de mensagens (recomendado: 5min)
              </p>
            </div>

            <div>
              <Label htmlFor="max_tentativas">Máximo de Tentativas por Mensagem</Label>
              <Input
                id="max_tentativas"
                type="number"
                min={1}
                max={10}
                value={formData.max_tentativas}
                onChange={(e) =>
                  setFormData({ ...formData, max_tentativas: parseInt(e.target.value) || 3 })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Número de tentativas antes de marcar como erro definitivo
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Horário Permitido de Envio
          </CardTitle>
          <CardDescription>
            Defina o horário em que as mensagens podem ser enviadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-2">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">Horário comercial</p>
                <p>
                  Mensagens fora do horário permitido serão mantidas na fila e enviadas
                  quando o horário permitido começar. Evite envios noturnos.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label htmlFor="hora_inicio">Horário de Início</Label>
              <Input
                id="hora_inicio"
                type="time"
                value={formData.hora_inicio_envio}
                onChange={(e) =>
                  setFormData({ ...formData, hora_inicio_envio: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Início do período permitido (recomendado: 08:00)
              </p>
            </div>

            <div>
              <Label htmlFor="hora_fim">Horário de Fim</Label>
              <Input
                id="hora_fim"
                type="time"
                value={formData.hora_fim_envio}
                onChange={(e) =>
                  setFormData({ ...formData, hora_fim_envio: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Fim do período permitido (recomendado: 18:00)
              </p>
            </div>
          </div>

          <Button
            onClick={() => updateMutation.mutate(formData)}
            disabled={updateMutation.isPending}
            className="w-full"
          >
            {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            <Save className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Boas Práticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Use mensagens institucionais e informativas, não promocionais</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Sempre tenha consentimento prévio dos destinatários</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Evite enviar mensagens fora do horário comercial</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-green-500">✓</span>
              <span>Mantenha a frequência de envios moderada</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">✗</span>
              <span>Não envie mensagens em massa para números desconhecidos</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-red-500">✗</span>
              <span>Não utilize para spam ou marketing agressivo</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};
