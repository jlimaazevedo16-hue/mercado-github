import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileWarning, Save, Building2 } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { useAuditLog } from '@/hooks/useAuditLog';
import { cn } from '@/lib/utils';

interface NotificacaoFormProps {
  onSuccess: () => void;
}

const artigos = [
  { value: 'art_15_I', label: 'Art. 15, I - Descumprimento de normas sanitárias' },
  { value: 'art_15_II', label: 'Art. 15, II - Irregularidade no uso do espaço' },
  { value: 'art_15_III', label: 'Art. 15, III - Inadimplência de taxas' },
  { value: 'art_16_I', label: 'Art. 16, I - Comércio de produtos não autorizados' },
  { value: 'art_16_II', label: 'Art. 16, II - Sublocação irregular' },
  { value: 'art_17', label: 'Art. 17 - Conduta inadequada' },
  { value: 'art_18', label: 'Art. 18 - Danos ao patrimônio' },
  { value: 'outro', label: 'Outro artigo' },
];

const orgaosFiscalizadores = [
  { value: 'IPEM', label: 'IPEM/INMETRO' },
  { value: 'VISA', label: 'Vigilância Sanitária' },
  { value: 'IBAMA', label: 'IBAMA' },
  { value: 'ICMBio', label: 'ICMBio' },
  { value: 'BOMBEIROS', label: 'Corpo de Bombeiros' },
  { value: 'PREFEITURA', label: 'Prefeitura Municipal' },
  { value: 'PROCON', label: 'PROCON' },
  { value: 'MP', label: 'Ministério Público' },
  { value: 'POLICIA', label: 'Polícia Civil/Militar' },
  { value: 'RECEITA', label: 'Receita Federal/Estadual' },
  { value: 'OUTRO', label: 'Outro órgão' },
];

export const NotificacaoForm = ({ onSuccess }: NotificacaoFormProps) => {
  const queryClient = useQueryClient();
  const { logAction } = useAuditLog();
  
  const [formData, setFormData] = useState({
    tipo: 'interna' as 'interna' | 'externa',
    box_id: '',
    responsavel_id: '',
    artigo_violado: '',
    artigo_outro: '',
    descricao_infracao: '',
    classificacao: '' as 'leve' | 'media' | 'grave' | 'gravissima' | '',
    data_notificacao: new Date(),
    prazo_defesa: addDays(new Date(), 15),
    prazo_adequacao: addDays(new Date(), 30),
    observacoes: '',
    // Campos para notificação externa
    orgao_fiscalizador: '',
    orgao_fiscalizador_outro: '',
    numero_auto_externo: '',
  });

  const { data: boxes } = useQuery({
    queryKey: ['boxes-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('boxes')
        .select('id, codigo, boxe, responsavel_id, responsaveis(nome)')
        .order('codigo');
      if (error) throw error;
      return data;
    },
  });

  const { data: responsaveis } = useQuery({
    queryKey: ['responsaveis-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('responsaveis')
        .select('id, nome')
        .eq('status', 'ATIVO')
        .order('nome');
      if (error) throw error;
      return data;
    },
  });

  const createNotificacaoMutation = useMutation({
    mutationFn: async () => {
      // Generate notification number for internal notifications
      let numeroInterno = null;
      if (formData.tipo === 'interna') {
        const { data: numData } = await supabase.rpc('generate_notification_number');
        numeroInterno = numData;
      }

      const artigoFinal = formData.artigo_violado === 'outro' 
        ? formData.artigo_outro 
        : artigos.find(a => a.value === formData.artigo_violado)?.label || formData.artigo_violado;

      // Determinar órgão fiscalizador final
      const orgaoFinal = formData.orgao_fiscalizador === 'OUTRO'
        ? formData.orgao_fiscalizador_outro
        : orgaosFiscalizadores.find(o => o.value === formData.orgao_fiscalizador)?.label || formData.orgao_fiscalizador;

      const insertData: any = {
        tipo: formData.tipo,
        box_id: formData.box_id || null,
        responsavel_id: formData.responsavel_id || null,
        artigo_violado: artigoFinal,
        descricao_infracao: formData.descricao_infracao,
        classificacao: formData.classificacao,
        data_notificacao: format(formData.data_notificacao, 'yyyy-MM-dd'),
        prazo_defesa: format(formData.prazo_defesa, 'yyyy-MM-dd'),
        prazo_adequacao: format(formData.prazo_adequacao, 'yyyy-MM-dd'),
        observacoes: formData.observacoes || null,
        status: 'pendente',
      };
      
      if (numeroInterno) {
        insertData.numero_interno = numeroInterno;
      }

      // Campos para notificação externa
      if (formData.tipo === 'externa') {
        insertData.orgao_fiscalizador = orgaoFinal || null;
        insertData.numero_auto_externo = formData.numero_auto_externo || null;
      }

      const { data, error } = await supabase
        .from('notificacoes')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['notificacoes'] });
      logAction({
        action: 'CREATE_NOTIFICACAO',
        tableName: 'notificacoes',
        recordId: data.id,
        newValues: data,
      });
      toast.success('Notificação criada com sucesso!');
      onSuccess();
    },
    onError: (error) => {
      console.error(error);
      toast.error('Erro ao criar notificação');
    },
  });

  const handleBoxChange = (boxId: string) => {
    setFormData({ ...formData, box_id: boxId });
    const box = boxes?.find((b) => b.id === boxId);
    if (box?.responsavel_id) {
      setFormData((prev) => ({ ...prev, box_id: boxId, responsavel_id: box.responsavel_id || '' }));
    }
  };

  const handleTipoChange = (tipo: 'interna' | 'externa') => {
    setFormData({ 
      ...formData, 
      tipo,
      // Limpar campos de externa quando mudar para interna
      orgao_fiscalizador: '',
      orgao_fiscalizador_outro: '',
      numero_auto_externo: '',
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.artigo_violado || !formData.descricao_infracao || !formData.classificacao) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    // Validação adicional para notificação externa
    if (formData.tipo === 'externa' && (!formData.orgao_fiscalizador || !formData.numero_auto_externo)) {
      toast.error('Para notificações externas, informe o órgão fiscalizador e o número do auto');
      return;
    }
    createNotificacaoMutation.mutate();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileWarning className="h-5 w-5" />
          Nova Notificação
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo */}
            <div className="space-y-2">
              <Label>Tipo de Notificação *</Label>
              <Select
                value={formData.tipo}
                onValueChange={handleTipoChange}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="interna">Interna (numeração automática)</SelectItem>
                  <SelectItem value="externa">Externa (órgão fiscalizador)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Campos para Notificação Externa */}
            {formData.tipo === 'externa' && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Órgão Fiscalizador *
                  </Label>
                  <Select
                    value={formData.orgao_fiscalizador}
                    onValueChange={(v) => setFormData({ ...formData, orgao_fiscalizador: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o órgão" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgaosFiscalizadores.map((orgao) => (
                        <SelectItem key={orgao.value} value={orgao.value}>
                          {orgao.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {formData.orgao_fiscalizador === 'OUTRO' && (
                  <div className="space-y-2">
                    <Label>Nome do Órgão *</Label>
                    <Input
                      value={formData.orgao_fiscalizador_outro}
                      onChange={(e) => setFormData({ ...formData, orgao_fiscalizador_outro: e.target.value })}
                      placeholder="Ex: Secretaria de Meio Ambiente"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Número do Auto de Infração *</Label>
                  <Input
                    value={formData.numero_auto_externo}
                    onChange={(e) => setFormData({ ...formData, numero_auto_externo: e.target.value })}
                    placeholder="Ex: AI-2026-00458"
                  />
                </div>
              </>
            )}

            {/* Box */}
            <div className="space-y-2">
              <Label>Box</Label>
              <Select
                value={formData.box_id}
                onValueChange={handleBoxChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o box" />
                </SelectTrigger>
                <SelectContent>
                  {boxes?.map((box) => (
                    <SelectItem key={box.id} value={box.id}>
                      {box.codigo} - {box.boxe}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Responsável */}
            <div className="space-y-2">
              <Label>Responsável</Label>
              <Select
                value={formData.responsavel_id}
                onValueChange={(v) => setFormData({ ...formData, responsavel_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {responsaveis?.map((resp) => (
                    <SelectItem key={resp.id} value={resp.id}>
                      {resp.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Artigo Violado */}
            <div className="space-y-2">
              <Label>Artigo Violado *</Label>
              <Select
                value={formData.artigo_violado}
                onValueChange={(v) => setFormData({ ...formData, artigo_violado: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o artigo" />
                </SelectTrigger>
                <SelectContent>
                  {artigos.map((artigo) => (
                    <SelectItem key={artigo.value} value={artigo.value}>
                      {artigo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.artigo_violado === 'outro' && (
              <div className="space-y-2 md:col-span-2">
                <Label>Especifique o Artigo *</Label>
                <Input
                  value={formData.artigo_outro}
                  onChange={(e) => setFormData({ ...formData, artigo_outro: e.target.value })}
                  placeholder="Ex: Art. 20, § 1º"
                />
              </div>
            )}

            {/* Classificação */}
            <div className="space-y-2">
              <Label>Classificação da Infração *</Label>
              <Select
                value={formData.classificacao}
                onValueChange={(v: 'leve' | 'media' | 'grave' | 'gravissima') => 
                  setFormData({ ...formData, classificacao: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a classificação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leve">Leve - Multa 50%</SelectItem>
                  <SelectItem value="media">Média - Multa 100%</SelectItem>
                  <SelectItem value="grave">Grave - Multa 100%</SelectItem>
                  <SelectItem value="gravissima">Gravíssima - Multa 200%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Data da Notificação */}
            <div className="space-y-2">
              <Label>Data da Notificação *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.data_notificacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.data_notificacao, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.data_notificacao}
                    onSelect={(date) => date && setFormData({ ...formData, data_notificacao: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Prazo Defesa */}
            <div className="space-y-2">
              <Label>Prazo para Defesa</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.prazo_defesa && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.prazo_defesa, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.prazo_defesa}
                    onSelect={(date) => date && setFormData({ ...formData, prazo_defesa: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Prazo Adequação */}
            <div className="space-y-2">
              <Label>Prazo para Adequação</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.prazo_adequacao && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.prazo_adequacao, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.prazo_adequacao}
                    onSelect={(date) => date && setFormData({ ...formData, prazo_adequacao: date })}
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição da Infração *</Label>
            <Textarea
              value={formData.descricao_infracao}
              onChange={(e) => setFormData({ ...formData, descricao_infracao: e.target.value })}
              placeholder="Descreva detalhadamente a infração cometida..."
              rows={4}
            />
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={createNotificacaoMutation.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {createNotificacaoMutation.isPending ? 'Salvando...' : 'Registrar Notificação'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
