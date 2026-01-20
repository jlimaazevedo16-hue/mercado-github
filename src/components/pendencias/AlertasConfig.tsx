import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, Mail, MessageSquare, AlertTriangle, Settings } from 'lucide-react';
import { toast } from 'sonner';

interface AlertaConfig {
  id: string;
  tipo: string;
  descricao: string;
  diasAntes: number;
  frequenciaPosVencimento: 'diario' | 'semanal';
  ativo: boolean;
  canalEmail: boolean;
  canalWhatsapp: boolean;
}

const defaultConfigs: AlertaConfig[] = [
  {
    id: 'cert_vencimento',
    tipo: 'Certificados',
    descricao: 'Alerta de vencimento de certificados e licenças',
    diasAntes: 30,
    frequenciaPosVencimento: 'semanal',
    ativo: true,
    canalEmail: true,
    canalWhatsapp: false,
  },
  {
    id: 'notif_prazo',
    tipo: 'Notificações',
    descricao: 'Alerta de prazo de defesa/adequação',
    diasAntes: 7,
    frequenciaPosVencimento: 'semanal',
    ativo: true,
    canalEmail: true,
    canalWhatsapp: false,
  },
  {
    id: 'reforma_pendente',
    tipo: 'Reformas',
    descricao: 'Alerta de manutenções pendentes',
    diasAntes: 15,
    frequenciaPosVencimento: 'semanal',
    ativo: true,
    canalEmail: true,
    canalWhatsapp: false,
  },
  {
    id: 'pad_etapa',
    tipo: 'Processos',
    descricao: 'Alerta de processos aguardando ação',
    diasAntes: 5,
    frequenciaPosVencimento: 'semanal',
    ativo: true,
    canalEmail: true,
    canalWhatsapp: false,
  },
];

export const AlertasConfig = () => {
  const [configs, setConfigs] = useState<AlertaConfig[]>(defaultConfigs);

  const updateConfig = (id: string, field: keyof AlertaConfig, value: any) => {
    setConfigs(prev => prev.map(c => 
      c.id === id ? { ...c, [field]: value } : c
    ));
  };

  const handleSave = () => {
    // In a real implementation, save to database
    toast.success('Configurações de alertas salvas!');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Configuração de Alertas Automáticos
          </CardTitle>
          <CardDescription>
            Configure os alertas que serão enviados antes e após o vencimento das pendências.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {configs.map((config) => (
            <div key={config.id} className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{config.tipo}</h4>
                    <Badge variant={config.ativo ? 'default' : 'secondary'}>
                      {config.ativo ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {config.descricao}
                  </p>
                </div>
                <Switch
                  checked={config.ativo}
                  onCheckedChange={(checked) => updateConfig(config.id, 'ativo', checked)}
                />
              </div>

              {config.ativo && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t">
                  <div>
                    <Label className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Dias antes do vencimento
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={config.diasAntes}
                      onChange={(e) => updateConfig(config.id, 'diasAntes', parseInt(e.target.value))}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Frequência após vencimento
                    </Label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1"
                      value={config.frequenciaPosVencimento}
                      onChange={(e) => updateConfig(config.id, 'frequenciaPosVencimento', e.target.value)}
                    >
                      <option value="diario">Diário</option>
                      <option value="semanal">Semanal</option>
                    </select>
                  </div>

                  <div>
                    <Label>Canais de notificação</Label>
                    <div className="flex gap-4 mt-2">
                      <label className="flex items-center gap-2">
                        <Switch
                          checked={config.canalEmail}
                          onCheckedChange={(checked) => updateConfig(config.id, 'canalEmail', checked)}
                        />
                        <Mail className="h-4 w-4" />
                        <span className="text-sm">Email</span>
                      </label>
                      <label className="flex items-center gap-2 opacity-50 cursor-not-allowed">
                        <Switch
                          checked={config.canalWhatsapp}
                          disabled
                        />
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm">WhatsApp</span>
                        <Badge variant="outline" className="text-xs">Em breve</Badge>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end">
            <Button onClick={handleSave}>
              <Settings className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-muted/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">Como funcionam os alertas</h4>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                <li>• <strong>Antes do vencimento:</strong> Um alerta é enviado X dias antes da data limite.</li>
                <li>• <strong>Após o vencimento:</strong> Alertas recorrentes são enviados conforme a frequência configurada.</li>
                <li>• <strong>WhatsApp:</strong> Integração em desenvolvimento - por enquanto apenas email disponível.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
