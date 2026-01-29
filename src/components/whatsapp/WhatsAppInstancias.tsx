import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, RefreshCw, QrCode, Unplug, Loader2, Smartphone, Wifi, WifiOff, Clock } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Instance {
  id: string;
  nome: string;
  api_url: string;
  api_key: string;
  instance_name: string;
  status: string;
  qr_code: string | null;
  phone_number: string | null;
  created_at: string;
}

export const WhatsAppInstancias = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<Instance | null>(null);
  const [formData, setFormData] = useState({
    nome: "",
    api_url: "",
    api_key: "",
    instance_name: "",
  });

  const { data: instances, isLoading } = useQuery({
    queryKey: ["whatsapp-instances"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_instances")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Instance[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("whatsapp_instances").insert({
        nome: data.nome,
        api_url: data.api_url,
        api_key: data.api_key,
        instance_name: data.instance_name,
        status: "disconnected",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
      toast.success("Instância criada com sucesso!");
      setIsDialogOpen(false);
      setFormData({ nome: "", api_url: "", api_key: "", instance_name: "" });
    },
    onError: (error) => {
      toast.error("Erro ao criar instância: " + error.message);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, qr_code }: { id: string; status: string; qr_code?: string }) => {
      const { error } = await supabase
        .from("whatsapp_instances")
        .update({ status, qr_code: qr_code || null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-instances"] });
    },
  });

  const handleGenerateQrCode = async (instance: Instance) => {
    setSelectedInstance(instance);
    setIsQrDialogOpen(true);
    
    try {
      // Chama a edge function para gerar QR Code
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "generate_qr",
          instance_id: instance.id,
          api_url: instance.api_url,
          api_key: instance.api_key,
          instance_name: instance.instance_name,
        },
      });

      if (error) throw error;

      if (data?.qrcode) {
        await updateStatusMutation.mutateAsync({
          id: instance.id,
          status: "waiting_qr",
          qr_code: data.qrcode,
        });
        setSelectedInstance({ ...instance, qr_code: data.qrcode, status: "waiting_qr" });
        toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
      }
    } catch (error: any) {
      toast.error("Erro ao gerar QR Code: " + error.message);
      setIsQrDialogOpen(false);
    }
  };

  const handleCheckStatus = async (instance: Instance) => {
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "check_status",
          instance_id: instance.id,
          api_url: instance.api_url,
          api_key: instance.api_key,
          instance_name: instance.instance_name,
        },
      });

      if (error) throw error;

      await updateStatusMutation.mutateAsync({
        id: instance.id,
        status: data?.status || "disconnected",
      });

      toast.success(`Status atualizado: ${data?.status || "desconectado"}`);
    } catch (error: any) {
      toast.error("Erro ao verificar status: " + error.message);
    }
  };

  const handleDisconnect = async (instance: Instance) => {
    try {
      const { error } = await supabase.functions.invoke("whatsapp-evolution", {
        body: {
          action: "disconnect",
          instance_id: instance.id,
          api_url: instance.api_url,
          api_key: instance.api_key,
          instance_name: instance.instance_name,
        },
      });

      if (error) throw error;

      await updateStatusMutation.mutateAsync({
        id: instance.id,
        status: "disconnected",
      });

      toast.success("Instância desconectada!");
    } catch (error: any) {
      toast.error("Erro ao desconectar: " + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge className="bg-green-500"><Wifi className="w-3 h-3 mr-1" /> Conectado</Badge>;
      case "waiting_qr":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="w-3 h-3 mr-1" /> Aguardando QR</Badge>;
      default:
        return <Badge variant="destructive"><WifiOff className="w-3 h-3 mr-1" /> Desconectado</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Instâncias WhatsApp
            </CardTitle>
            <CardDescription>
              Gerencie suas conexões com a Evolution API
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Instância
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Nova Instância</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="nome">Nome da Instância</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    placeholder="Ex: WhatsApp Principal"
                  />
                </div>
                <div>
                  <Label htmlFor="api_url">URL da Evolution API</Label>
                  <Input
                    id="api_url"
                    value={formData.api_url}
                    onChange={(e) => setFormData({ ...formData, api_url: e.target.value })}
                    placeholder="https://api.evolution.example.com"
                  />
                </div>
                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={formData.api_key}
                    onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                    placeholder="Sua chave de API"
                  />
                </div>
                <div>
                  <Label htmlFor="instance_name">Nome da Instância (Evolution)</Label>
                  <Input
                    id="instance_name"
                    value={formData.instance_name}
                    onChange={(e) => setFormData({ ...formData, instance_name: e.target.value })}
                    placeholder="mercado-municipal"
                  />
                </div>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Criar Instância
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : instances?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Smartphone className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma instância configurada</p>
            <p className="text-sm">Clique em "Nova Instância" para começar</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Instância (Evolution)</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {instances?.map((instance) => (
                <TableRow key={instance.id}>
                  <TableCell className="font-medium">{instance.nome}</TableCell>
                  <TableCell>{instance.instance_name}</TableCell>
                  <TableCell>{getStatusBadge(instance.status)}</TableCell>
                  <TableCell>
                    {format(new Date(instance.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleGenerateQrCode(instance)}
                      disabled={instance.status === "connected"}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCheckStatus(instance)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDisconnect(instance)}
                      disabled={instance.status === "disconnected"}
                    >
                      <Unplug className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* QR Code Dialog */}
        <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Conectar WhatsApp</DialogTitle>
            </DialogHeader>
            <div className="text-center space-y-4">
              {selectedInstance?.qr_code ? (
                <>
                  <div className="bg-white p-4 rounded-lg inline-block">
                    <img
                      src={selectedInstance.qr_code}
                      alt="QR Code"
                      className="w-64 h-64"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p className="font-medium">Instruções:</p>
                    <ol className="text-left list-decimal list-inside space-y-1 mt-2">
                      <li>Abra o WhatsApp no seu celular</li>
                      <li>Vá em Configurações → Aparelhos Conectados</li>
                      <li>Clique em "Conectar um aparelho"</li>
                      <li>Escaneie este QR Code</li>
                    </ol>
                  </div>
                </>
              ) : (
                <div className="py-8">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto text-muted-foreground" />
                  <p className="mt-4 text-muted-foreground">Gerando QR Code...</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};
