import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useAuth } from "@/hooks/useAuth";
import { useUFMS } from "@/contexts/UFMSContext";
import { Settings, Save, Calculator, DollarSign, AlertTriangle, History, CheckCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UFMSCalculationPreview } from "./UFMSCalculationPreview";
import { UFMSHistoryTable } from "./UFMSHistoryTable";

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
  const { user } = useAuth();
  const { invalidateAndRefetch, ufmsValor, fatorCondominio, fatorAluguel, lastUpdated } = useUFMS();
  const queryClient = useQueryClient();
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingChanges, setPendingChanges] = useState<{ id: string; valor: number; chave: string; oldValue: number }[]>([]);

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
    mutationFn: async ({ id, valor, chave, oldValue }: { id: string; valor: number; chave: string; oldValue: number }) => {
      // 1. Close current validity period in history
      const { error: updateHistoryError } = await supabase
        .from("ufms_historico")
        .update({ data_fim_vigencia: new Date().toISOString() })
        .is("data_fim_vigencia", null);

      if (updateHistoryError) throw updateHistoryError;

      // 2. Update the configuration value
      const { error: updateConfigError } = await supabase
        .from("configuracoes_administrativas")
        .update({ valor })
        .eq("id", id);

      if (updateConfigError) throw updateConfigError;

      // 3. Get current values for history
      const { data: currentConfigs } = await supabase
        .from("configuracoes_administrativas")
        .select("chave, valor")
        .in("chave", ["ufms_valor", "fator_condominio", "fator_aluguel"]);

      const configMap = currentConfigs?.reduce((acc, c) => {
        acc[c.chave] = c.valor;
        return acc;
      }, {} as Record<string, number>) || {};

      // Update with new value
      configMap[chave] = valor;

      // 4. Create new history record
      const { error: insertHistoryError } = await supabase
        .from("ufms_historico")
        .insert({
          ufms_valor: configMap["ufms_valor"] || 0,
          fator_condominio: configMap["fator_condominio"] || 0,
          fator_aluguel: configMap["fator_aluguel"] || 0,
          data_inicio_vigencia: new Date().toISOString(),
          created_by: user?.id,
        });

      if (insertHistoryError) throw insertHistoryError;

      return { chave, oldValue, newValue: valor };
    },
    onSuccess: async (result) => {
      // Invalidate all related caches and refresh global context
      await invalidateAndRefetch();
      await queryClient.invalidateQueries({ queryKey: ["ufms-historico"] });

      // Log the action for audit
      logAction({
        action: "UPDATE_UFMS",
        tableName: "configuracoes_administrativas",
        recordId: result.chave,
        oldValues: { valor: result.oldValue },
        newValues: { valor: result.newValue },
      });

      toast({ 
        title: "UFMS atualizada com sucesso",
        description: "Os novos valores serão aplicados apenas a lançamentos futuros.",
      });
      
      setShowConfirmation(false);
      setPendingChanges([]);
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: String(error),
        variant: "destructive",
      });
    },
  });

  const handlePrepareChange = (config: Configuracao) => {
    const newValue = editedValues[config.id];
    if (newValue !== undefined) {
      const numValue = parseFloat(newValue.replace(",", "."));
      if (!isNaN(numValue) && numValue !== config.valor) {
        setPendingChanges([{ id: config.id, valor: numValue, chave: config.chave, oldValue: config.valor }]);
        setShowConfirmation(true);
      }
    }
  };

  const handleConfirmChange = () => {
    if (pendingChanges.length > 0) {
      const change = pendingChanges[0];
      updateMutation.mutate(change);
      setEditedValues((prev) => {
        const next = { ...prev };
        delete next[change.id];
        return next;
      });
    }
  };

  const handleCancelChange = () => {
    setShowConfirmation(false);
    setPendingChanges([]);
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
      {/* Current Value Banner */}
      <Card className="border-primary/50 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-6 w-6 text-primary" />
              <div>
                <p className="text-sm font-medium">Valor Vigente da UFMS</p>
                <p className="text-2xl font-bold text-primary">R$ {ufmsValor.toFixed(4)}</p>
              </div>
            </div>
            {lastUpdated && (
              <div className="text-right text-sm text-muted-foreground">
                <p>Última atualização</p>
                <p>{format(lastUpdated, "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Warning Alert */}
      <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        <AlertTitle className="text-amber-800 dark:text-amber-400">Importante</AlertTitle>
        <AlertDescription className="text-amber-700 dark:text-amber-300">
          Alterações na UFMS serão aplicadas <strong>apenas a lançamentos futuros</strong>. 
          Valores já registrados no histórico não serão recalculados.
        </AlertDescription>
      </Alert>

      {/* Confirmation Dialog */}
      {showConfirmation && pendingChanges.length > 0 && (
        <Alert className="border-destructive bg-destructive/10">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <AlertTitle>Confirmar Alteração</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>
              Você está prestes a alterar <strong>{getConfigLabel(pendingChanges[0].chave)}</strong> de{" "}
              <strong>{pendingChanges[0].oldValue}</strong> para{" "}
              <strong>{pendingChanges[0].valor}</strong>.
            </p>
            <p className="text-sm text-muted-foreground">
              Este valor será aplicado apenas a lançamentos futuros. 
              Um registro será criado no histórico para auditoria.
            </p>
            <div className="flex gap-2 mt-4">
              <Button onClick={handleConfirmChange} disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Salvando..." : "Confirmar Alteração"}
              </Button>
              <Button variant="outline" onClick={handleCancelChange}>
                Cancelar
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Configuration Cards */}
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
                            disabled={showConfirmation}
                          />
                        </div>
                        {editedValues[config.id] !== undefined && !showConfirmation && (
                          <Button
                            size="icon"
                            onClick={() => handlePrepareChange(config)}
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

      {/* Calculation Preview */}
      <UFMSCalculationPreview 
        ufmsValor={ufmsValor}
        fatorCondominio={fatorCondominio}
        fatorAluguel={fatorAluguel}
      />

      {/* History Table */}
      <UFMSHistoryTable />
    </div>
  );
}
