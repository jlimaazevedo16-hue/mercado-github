import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { format } from "date-fns";

interface ReceitaOperacionalFormProps {
  isOpen: boolean;
  onClose: () => void;
  editingReceita?: {
    id: string;
    data_referencia: string;
    tipo_receita_id: string;
    descricao: string | null;
    valor_bruto: number;
    forma_pagamento: string;
    origem_caixa: string | null;
    observacoes: string | null;
    comprovante_url: string | null;
    bloqueado: boolean;
  } | null;
}

export function ReceitaOperacionalForm({ isOpen, onClose, editingReceita }: ReceitaOperacionalFormProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isEditing = !!editingReceita;

  const [formData, setFormData] = useState({
    data_referencia: format(new Date(), "yyyy-MM-dd"),
    tipo_receita_id: "",
    descricao: "",
    valor_bruto: "",
    forma_pagamento: "dinheiro",
    origem_caixa: "",
    observacoes: "",
  });

  const { data: tipos = [] } = useQuery({
    queryKey: ["tipos-receita-ativos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tipos_receita")
        .select("id, nome, categoria")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (editingReceita) {
      setFormData({
        data_referencia: editingReceita.data_referencia,
        tipo_receita_id: editingReceita.tipo_receita_id,
        descricao: editingReceita.descricao || "",
        valor_bruto: editingReceita.valor_bruto.toString(),
        forma_pagamento: editingReceita.forma_pagamento,
        origem_caixa: editingReceita.origem_caixa || "",
        observacoes: editingReceita.observacoes || "",
      });
    } else {
      setFormData({
        data_referencia: format(new Date(), "yyyy-MM-dd"),
        tipo_receita_id: tipos[0]?.id || "",
        descricao: "",
        valor_bruto: "",
        forma_pagamento: "dinheiro",
        origem_caixa: "",
        observacoes: "",
      });
    }
  }, [editingReceita, isOpen, tipos]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const insertData = {
        ...data,
        valor_bruto: parseFloat(data.valor_bruto.replace(",", ".")),
        responsavel_lancamento: user?.id,
      };

      const { data: newReceita, error } = await supabase
        .from("receitas_operacionais")
        .insert(insertData)
        .select()
        .single();
      
      if (error) throw error;

      // Create log entry
      await supabase.from("logs_receitas_operacionais").insert({
        receita_operacional_id: newReceita.id,
        acao: "criacao",
        usuario_id: user?.id,
        dados_novos: insertData,
      });

      return newReceita;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receitas-operacionais"] });
      toast.success("Lançamento criado com sucesso!");
      onClose();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao criar lançamento");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!editingReceita) return;

      const updateData = {
        ...data,
        valor_bruto: parseFloat(data.valor_bruto.replace(",", ".")),
      };

      // Store old values for log
      const dadosAnteriores = {
        data_referencia: editingReceita.data_referencia,
        tipo_receita_id: editingReceita.tipo_receita_id,
        descricao: editingReceita.descricao,
        valor_bruto: editingReceita.valor_bruto,
        forma_pagamento: editingReceita.forma_pagamento,
        origem_caixa: editingReceita.origem_caixa,
        observacoes: editingReceita.observacoes,
      };

      const { error } = await supabase
        .from("receitas_operacionais")
        .update(updateData)
        .eq("id", editingReceita.id);
      
      if (error) throw error;

      // Create log entry
      await supabase.from("logs_receitas_operacionais").insert({
        receita_operacional_id: editingReceita.id,
        acao: "edicao",
        usuario_id: user?.id,
        dados_anteriores: dadosAnteriores,
        dados_novos: updateData,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["receitas-operacionais"] });
      toast.success("Lançamento atualizado!");
      onClose();
    },
    onError: (error) => {
      console.error(error);
      toast.error("Erro ao atualizar lançamento");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.tipo_receita_id) {
      toast.error("Selecione o tipo de receita");
      return;
    }
    if (!formData.valor_bruto || parseFloat(formData.valor_bruto.replace(",", ".")) <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    if (isEditing) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Lançamento" : "Novo Lançamento de Receita"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Referência *</Label>
              <Input
                type="date"
                value={formData.data_referencia}
                onChange={(e) => setFormData({ ...formData, data_referencia: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Receita *</Label>
              <Select
                value={formData.tipo_receita_id}
                onValueChange={(value) => setFormData({ ...formData, tipo_receita_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.nome} ({t.categoria})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor Arrecadado (R$) *</Label>
              <Input
                type="text"
                value={formData.valor_bruto}
                onChange={(e) => setFormData({ ...formData, valor_bruto: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Forma de Pagamento *</Label>
              <Select
                value={formData.forma_pagamento}
                onValueChange={(value) => setFormData({ ...formData, forma_pagamento: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Origem do Caixa</Label>
            <Input
              value={formData.origem_caixa}
              onChange={(e) => setFormData({ ...formData, origem_caixa: e.target.value })}
              placeholder="Ex: Banheiro Mercado Modelo"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Breve descrição do lançamento"
            />
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar Alterações" : "Criar Lançamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
