import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  FileText, Search, AlertTriangle, CheckCircle, Clock, 
  Download, Eye, Trash2, Package, User, Filter
} from "lucide-react";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UnifiedDocument {
  id: string;
  nome: string;
  tipo: string | null;
  descricao: string | null;
  data_emissao: string | null;
  data_validade: string | null;
  arquivo_url: string | null;
  created_at: string;
  source: 'box' | 'responsavel';
  entity_id: string;
  entity_name: string;
  entity_code?: string;
}

const DOCUMENT_TYPES = [
  { value: "all", label: "Todos os Tipos" },
  { value: "Alvará", label: "Alvará" },
  { value: "Certificado", label: "Certificado" },
  { value: "Curso", label: "Curso" },
  { value: "Contrato", label: "Contrato" },
  { value: "Licença", label: "Licença" },
  { value: "RG", label: "RG" },
  { value: "CPF", label: "CPF" },
  { value: "Comprovante", label: "Comprovante" },
  { value: "Outro", label: "Outro" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "Todos os Status" },
  { value: "valid", label: "Válido" },
  { value: "expiring", label: "Vencendo (30 dias)" },
  { value: "expired", label: "Vencido" },
  { value: "no_expiry", label: "Sem validade" },
];

const getValidityInfo = (dataValidade: string | null) => {
  if (!dataValidade) {
    return { status: 'no_expiry', label: '—', daysLeft: null, variant: 'outline' as const };
  }
  
  const today = new Date();
  const validade = parseISO(dataValidade);
  const daysUntilExpiry = differenceInDays(validade, today);
  
  if (daysUntilExpiry < 0) {
    return { 
      status: 'expired', 
      label: `Vencido há ${Math.abs(daysUntilExpiry)}d`, 
      daysLeft: daysUntilExpiry,
      variant: 'destructive' as const 
    };
  } else if (daysUntilExpiry <= 30) {
    return { 
      status: 'expiring', 
      label: `Vence em ${daysUntilExpiry}d`, 
      daysLeft: daysUntilExpiry,
      variant: 'warning' as const 
    };
  }
  return { 
    status: 'valid', 
    label: `Válido (${daysUntilExpiry}d)`, 
    daysLeft: daysUntilExpiry,
    variant: 'default' as const 
  };
};

const Documentos = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeMenuItem, setActiveMenuItem] = useState("documentos");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Fetch box documents
  const { data: boxDocuments, isLoading: loadingBoxDocs } = useQuery({
    queryKey: ["all-box-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("box_documents")
        .select(`
          *,
          boxes (id, codigo, boxe)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch responsavel documents
  const { data: responsavelDocuments, isLoading: loadingRespDocs } = useQuery({
    queryKey: ["all-responsavel-documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsavel_documents")
        .select(`
          *,
          responsaveis (id, nome)
        `)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Unify documents
  const allDocuments: UnifiedDocument[] = useMemo(() => {
    const unified: UnifiedDocument[] = [];

    boxDocuments?.forEach(doc => {
      unified.push({
        id: doc.id,
        nome: doc.nome,
        tipo: doc.tipo,
        descricao: doc.descricao,
        data_emissao: doc.data_emissao,
        data_validade: doc.data_validade,
        arquivo_url: doc.arquivo_url,
        created_at: doc.created_at,
        source: 'box',
        entity_id: doc.box_id,
        entity_name: (doc.boxes as any)?.boxe || "Box",
        entity_code: (doc.boxes as any)?.codigo,
      });
    });

    responsavelDocuments?.forEach(doc => {
      unified.push({
        id: doc.id,
        nome: doc.nome,
        tipo: doc.tipo,
        descricao: doc.descricao,
        data_emissao: doc.data_emissao,
        data_validade: doc.data_validade,
        arquivo_url: doc.arquivo_url,
        created_at: doc.created_at,
        source: 'responsavel',
        entity_id: doc.responsavel_id,
        entity_name: (doc.responsaveis as any)?.nome || "Responsável",
      });
    });

    return unified.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [boxDocuments, responsavelDocuments]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = allDocuments.length;
    let valid = 0, expiring = 0, expired = 0, noExpiry = 0;

    allDocuments.forEach(doc => {
      const info = getValidityInfo(doc.data_validade);
      if (info.status === 'valid') valid++;
      else if (info.status === 'expiring') expiring++;
      else if (info.status === 'expired') expired++;
      else noExpiry++;
    });

    return { total, valid, expiring, expired, noExpiry };
  }, [allDocuments]);

  // Filter documents
  const filteredDocuments = useMemo(() => {
    return allDocuments.filter(doc => {
      // Search filter
      const matchesSearch = !searchTerm ||
        doc.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.entity_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.entity_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.tipo?.toLowerCase().includes(searchTerm.toLowerCase());

      // Type filter
      const matchesType = typeFilter === "all" || doc.tipo === typeFilter;

      // Status filter
      const validityInfo = getValidityInfo(doc.data_validade);
      const matchesStatus = statusFilter === "all" || validityInfo.status === statusFilter;

      // Source filter
      const matchesSource = sourceFilter === "all" || doc.source === sourceFilter;

      return matchesSearch && matchesType && matchesStatus && matchesSource;
    });
  }, [allDocuments, searchTerm, typeFilter, statusFilter, sourceFilter]);

  // Delete mutations
  const deleteBoxDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("box_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-box-documents"] });
      toast.success("Documento removido!");
    },
    onError: () => toast.error("Erro ao remover documento"),
  });

  const deleteRespDocMutation = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("responsavel_documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-responsavel-documents"] });
      toast.success("Documento removido!");
    },
    onError: () => toast.error("Erro ao remover documento"),
  });

  const handleDelete = (doc: UnifiedDocument) => {
    if (!confirm("Deseja remover este documento?")) return;
    if (doc.source === 'box') {
      deleteBoxDocMutation.mutate(doc.id);
    } else {
      deleteRespDocMutation.mutate(doc.id);
    }
  };

  const handleView = (url: string | null) => {
    if (url) window.open(url, '_blank');
  };

  const handleNavigateToEntity = (doc: UnifiedDocument) => {
    if (doc.source === 'box') {
      navigate(`/boxes/${doc.entity_id}`);
    } else {
      navigate(`/responsaveis/${doc.entity_id}`);
    }
  };

  const isLoading = loadingBoxDocs || loadingRespDocs;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar activeItem={activeMenuItem} onItemClick={setActiveMenuItem} />

      <div className="flex-1 flex flex-col">
        <Header />

        <main className="flex-1 p-6 overflow-auto">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">Gestão de Documentos</h1>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total</p>
                    <p className="text-xl font-bold">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Válidos</p>
                    <p className="text-xl font-bold text-green-600">{stats.valid}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="h-5 w-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencendo</p>
                    <p className="text-xl font-bold text-yellow-600">{stats.expiring}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Vencidos</p>
                    <p className="text-xl font-bold text-red-600">{stats.expired}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    <FileText className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Sem Validade</p>
                    <p className="text-xl font-bold text-gray-500">{stats.noExpiry}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
                  <Input
                    placeholder="Buscar por nome, tipo ou entidade..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Vínculo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="box">Boxes</SelectItem>
                    <SelectItem value="responsavel">Responsáveis</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Documents Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Documentos ({filteredDocuments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-4 text-muted-foreground">Carregando documentos...</p>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum documento encontrado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Documento</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Vínculo</TableHead>
                      <TableHead>Emissão</TableHead>
                      <TableHead>Validade</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDocuments.map((doc) => {
                      const validityInfo = getValidityInfo(doc.data_validade);

                      return (
                        <TableRow key={`${doc.source}-${doc.id}`}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">{doc.nome}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{doc.tipo || "—"}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 text-left"
                              onClick={() => handleNavigateToEntity(doc)}
                            >
                              <div className="flex items-center gap-2">
                                {doc.source === 'box' ? (
                                  <Package className="h-4 w-4 text-blue-500" />
                                ) : (
                                  <User className="h-4 w-4 text-purple-500" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">{doc.entity_name}</p>
                                  {doc.entity_code && (
                                    <p className="text-xs text-muted-foreground">{doc.entity_code}</p>
                                  )}
                                </div>
                              </div>
                            </Button>
                          </TableCell>
                          <TableCell>
                            {doc.data_emissao
                              ? format(parseISO(doc.data_emissao), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            {doc.data_validade
                              ? format(parseISO(doc.data_validade), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={validityInfo.variant === 'warning' ? 'outline' : validityInfo.variant}
                              className={
                                validityInfo.status === 'expiring'
                                  ? 'border-yellow-500 text-yellow-600 bg-yellow-50'
                                  : validityInfo.status === 'valid'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : ''
                              }
                            >
                              {validityInfo.status === 'expired' && (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                              )}
                              {validityInfo.status === 'expiring' && (
                                <Clock className="h-3 w-3 mr-1" />
                              )}
                              {validityInfo.status === 'valid' && (
                                <CheckCircle className="h-3 w-3 mr-1" />
                              )}
                              {validityInfo.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {doc.arquivo_url && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleView(doc.arquivo_url)}
                                  title="Visualizar"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(doc)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
};

export default Documentos;
