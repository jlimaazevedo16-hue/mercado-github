import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { Settings, Save, Calculator, DollarSign } from "lucide-react";

interface Configuracao {
  id: string;
  chave: string;
  valor: number;
  descricao: string | null;
  unidade: string | null;
}

export function ConfiguracoesUFMS() {
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});

  const { data: configuracoes, isLoading } = useQuery({
    queryKey: ["configuracoes-administrativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("configuracoes_administrativas")
        .select("*")
        .order("chave");

      if (error) throw error;
      return data as Configuracao[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, valor }: { id: string; valor: number }) => {
      const { error } = await supabase
        .from("configuracoes_administrativas")
        .update({ valor })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["configuracoes-administrativas"] });
      logAction({
        action: "UPDATE_CONFIGURACAO",
        tableName: "configuracoes_administrativas",
        recordId: variables.id,
        newValues: { valor: variables.valor },
      });
      toast({ title: "Configuração atualizada com sucesso" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handleSave = (config: Configuracao) => {
    const newValue = editedValues[config.id];
    if (newValue !== undefined) {
      const numValue = parseFloat(newValue.replace(",", "."));
      if (!isNaN(numValue)) {
        updateMutation.mutate({ id: config.id, valor: numValue });
        setEditedValues((prev) => {
          const next = { ...prev };
          delete next[config.id];
          return next;
        });
      }
    }
  };

  const getConfigIcon = (chave: string) => {
    if (chave.includes("ufms")) return <DollarSign className="h-5 w-5 text-primary" />;
    return <Calculator className="h-5 w-5 text-muted-foreground" />;
  };

  const getConfigLabel = (chave: string) => {
    switch (chave) {
      case "ufms_valor":
        return "Valor da UFMS";
      case "fator_condominio":
        return "Fator de Condomínio";
      case "fator_aluguel":
        return "Fator de Aluguel";
      default:
        return chave;
    }
  };

  const formatValue = (valor: number, unidade: string | null) => {
    if (unidade === "R$") {
      return `R$ ${valor.toFixed(4)}`;
    }
    return `${valor} ${unidade || ""}`;
  };

  // Exemplo de cálculo
  const ufmsValor = configuracoes?.find((c) => c.chave === "ufms_valor")?.valor || 0;
  const fatorCondominio = configuracoes?.find((c) => c.chave === "fator_condominio")?.valor || 0;
  const fatorAluguel = configuracoes?.find((c) => c.chave === "fator_aluguel")?.valor || 0;

  const taxaCondominioBase = ufmsValor * fatorCondominio;
  const taxaAluguelM2 = ufmsValor * fatorAluguel;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <div>
              <CardTitle>Configurações Administrativas</CardTitle>
              <CardDescription>
                Gerencie os valores base para cálculos de taxas e multas
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {configuracoes?.map((config) => (
              <Card key={config.id} className="border-2">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    {getConfigIcon(config.chave)}
                    <div className="flex-1 space-y-3">
                      <div>
                        <Label className="text-sm font-medium">
                          {getConfigLabel(config.chave)}
                        </Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          {config.descricao}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          {config.unidade === "R$" && (
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                              R$
                            </span>
                          )}
                          <Input
                            type="text"
                            value={
                              editedValues[config.id] !== undefined
                                ? editedValues[config.id]
                                : config.valor.toString().replace(".", ",")
                            }
                            onChange={(e) =>
                              setEditedValues((prev) => ({
                                ...prev,
                                [config.id]: e.target.value,
                              }))
                            }
                            className={config.unidade === "R$" ? "pl-9" : ""}
                          />
                        </div>
                        {editedValues[config.id] !== undefined && (
                          <Button
                            size="icon"
                            onClick={() => handleSave(config)}
                            disabled={updateMutation.isPending}
                          >
                            <Save className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Atual: {formatValue(config.valor, config.unidade)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Preview de cálculos */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Simulação de Cálculos
          </CardTitle>
          <CardDescription>
            Valores calculados com base nas configurações atuais
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground">Taxa de Condomínio Base</p>
              <p className="text-2xl font-bold text-primary">
                R$ {taxaCondominioBase.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                UFMS ({ufmsValor.toFixed(4)}) × Fator ({fatorCondominio})
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground">Taxa de Aluguel por m²</p>
              <p className="text-2xl font-bold text-primary">
                R$ {taxaAluguelM2.toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                UFMS ({ufmsValor.toFixed(4)}) × Fator ({fatorAluguel})
              </p>
            </div>
            <div className="p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground">Exemplo: Box 30m²</p>
              <p className="text-2xl font-bold text-primary">
                R$ {(taxaAluguelM2 * 30 + taxaCondominioBase).toFixed(2)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Aluguel + Condomínio mensal
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
