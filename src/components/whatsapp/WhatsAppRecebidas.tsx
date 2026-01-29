import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Inbox, Loader2, Search, MessageSquare, User, Building, Calendar, Eye } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ReceivedMessage {
  id: string;
  telefone_origem: string;
  nome_contato: string | null;
  mensagem: string;
  tipo: string;
  recebida_em: string;
  lida: boolean;
  respondida: boolean;
  boxes: { codigo: string; boxe: string } | null;
  responsaveis: { nome: string } | null;
}

export const WhatsAppRecebidas = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterBox, setFilterBox] = useState<string>("all");
  const [selectedMessage, setSelectedMessage] = useState<ReceivedMessage | null>(null);

  const { data: messages, isLoading } = useQuery({
    queryKey: ["whatsapp-recebidas", filterBox],
    queryFn: async () => {
      let query = supabase
        .from("whatsapp_recebidas")
        .select(`
          id,
          telefone_origem,
          nome_contato,
          mensagem,
          tipo,
          recebida_em,
          lida,
          respondida,
          boxes (codigo, boxe),
          responsaveis (nome)
        `)
        .order("recebida_em", { ascending: false })
        .limit(100);

      if (filterBox && filterBox !== "all") {
        query = query.eq("box_id", filterBox);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as ReceivedMessage[];
    },
    refetchInterval: 30000,
  });

  const { data: boxes } = useQuery({
    queryKey: ["boxes-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("boxes")
        .select("id, codigo, boxe")
        .order("codigo");
      if (error) throw error;
      return data;
    },
  });

  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("whatsapp_recebidas")
        .update({ lida: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-recebidas"] });
    },
  });

  const filteredMessages = messages?.filter((msg) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      msg.telefone_origem.includes(search) ||
      msg.nome_contato?.toLowerCase().includes(search) ||
      msg.mensagem.toLowerCase().includes(search)
    );
  });

  const getTypeBadge = (tipo: string) => {
    const types: Record<string, { label: string; className: string }> = {
      texto: { label: "Texto", className: "bg-blue-500" },
      imagem: { label: "Imagem", className: "bg-purple-500" },
      audio: { label: "Áudio", className: "bg-green-500" },
      video: { label: "Vídeo", className: "bg-red-500" },
      documento: { label: "Doc", className: "bg-orange-500" },
    };
    const t = types[tipo] || { label: tipo, className: "bg-gray-500" };
    return <Badge className={t.className}>{t.label}</Badge>;
  };

  const handleViewMessage = (msg: ReceivedMessage) => {
    setSelectedMessage(msg);
    if (!msg.lida) {
      markAsReadMutation.mutate(msg.id);
    }
  };

  const unreadCount = messages?.filter((m) => !m.lida).length || 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Mensagens Recebidas
              {unreadCount > 0 && (
                <Badge variant="destructive">{unreadCount} nova(s)</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Histórico de mensagens recebidas via WhatsApp
            </CardDescription>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por telefone, nome ou mensagem..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterBox} onValueChange={setFilterBox}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por Box" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Boxes</SelectItem>
              {boxes?.filter(b => b.id).map((box) => (
                <SelectItem key={box.id} value={box.id}>
                  {box.codigo} - {box.boxe}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredMessages?.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Nenhuma mensagem recebida</p>
            <p className="text-sm">As mensagens recebidas aparecerão aqui</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead></TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Mensagem</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Box</TableHead>
                <TableHead>Recebida em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages?.map((msg) => (
                <TableRow 
                  key={msg.id} 
                  className={!msg.lida ? "bg-blue-50 dark:bg-blue-950" : ""}
                >
                  <TableCell>
                    {!msg.lida && (
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{msg.nome_contato || "Desconhecido"}</p>
                        <p className="text-xs text-muted-foreground">{msg.telefone_origem}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[300px]">
                    <p className="truncate">{msg.mensagem}</p>
                  </TableCell>
                  <TableCell>{getTypeBadge(msg.tipo)}</TableCell>
                  <TableCell>
                    {msg.boxes ? (
                      <div className="flex items-center gap-1">
                        <Building className="h-3 w-3" />
                        <span className="text-sm">{msg.boxes.codigo}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                      <span className="text-sm">
                        {format(new Date(msg.recebida_em), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewMessage(msg)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Mensagem Recebida
            </DialogTitle>
          </DialogHeader>
          {selectedMessage && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Contato</p>
                  <p className="font-medium">{selectedMessage.nome_contato || "Desconhecido"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Telefone</p>
                  <p className="font-medium">{selectedMessage.telefone_origem}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Box</p>
                  <p className="font-medium">
                    {selectedMessage.boxes?.codigo || "Não vinculado"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Responsável</p>
                  <p className="font-medium">
                    {selectedMessage.responsaveis?.nome || "Não identificado"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Recebida em</p>
                  <p className="font-medium">
                    {format(new Date(selectedMessage.recebida_em), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tipo</p>
                  {getTypeBadge(selectedMessage.tipo)}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground mb-2">Conteúdo</p>
                <div className="p-4 bg-muted rounded-lg whitespace-pre-wrap">
                  {selectedMessage.mensagem}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};
