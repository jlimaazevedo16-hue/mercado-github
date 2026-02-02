import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, FileSpreadsheet, Table, Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import * as XLSX from "xlsx";

const TEMPLATE_HEADERS = [
  "setor_nome",
  "segmento_nome", 
  "box_codigo",
  "box_nome",
  "box_area_m2",
  "box_status",
  "responsavel_nome",
  "responsavel_cpf",
  "responsavel_telefone",
  "responsavel_email",
  "responsavel_endereco",
  "responsavel_cidade",
  "responsavel_estado",
  "responsavel_cep"
];

const TEMPLATE_EXAMPLE = [
  {
    setor_nome: "Setor A",
    segmento_nome: "Pescados",
    box_codigo: "A001",
    box_nome: "Box 001",
    box_area_m2: "12.5",
    box_status: "assinado",
    responsavel_nome: "João Silva",
    responsavel_cpf: "123.456.789-00",
    responsavel_telefone: "(67) 99999-0000",
    responsavel_email: "joao@email.com",
    responsavel_endereco: "Rua das Flores, 123",
    responsavel_cidade: "Campo Grande",
    responsavel_estado: "MS",
    responsavel_cep: "79000-000"
  },
  {
    setor_nome: "Setor A",
    segmento_nome: "Hortifruti",
    box_codigo: "A002",
    box_nome: "Box 002",
    box_area_m2: "10",
    box_status: "disponivel",
    responsavel_nome: "",
    responsavel_cpf: "",
    responsavel_telefone: "",
    responsavel_email: "",
    responsavel_endereco: "",
    responsavel_cidade: "",
    responsavel_estado: "",
    responsavel_cep: ""
  }
];

const INSTRUCTIONS = [
  {
    title: "Estrutura da Planilha",
    items: [
      "A primeira linha deve conter os cabeçalhos exatamente como no modelo",
      "Cada linha representa um box com seu respectivo responsável (se houver)",
      "Setores e Segmentos serão criados automaticamente se não existirem"
    ]
  },
  {
    title: "Campos Obrigatórios",
    items: [
      "setor_nome - Nome do setor do box",
      "segmento_nome - Segmento de atividade",
      "box_codigo - Código único do box (ex: A001)",
      "box_nome - Nome/identificação do box",
      "box_area_m2 - Área em metros quadrados (número)",
      "box_status - Status: assinado, disponivel, processo, cancelado, desativado, devolvido, interditado"
    ]
  },
  {
    title: "Campos do Responsável",
    items: [
      "Obrigatórios se box_status = 'assinado'",
      "responsavel_cpf - CPF válido (com ou sem formatação)",
      "Se o responsável já existir (mesmo CPF), será vinculado ao box",
      "Máximo de 2 responsáveis por box (use linhas duplicadas com mesmo box_codigo)"
    ]
  },
  {
    title: "Regras de Validação",
    items: [
      "CPF deve ser válido (dígitos verificadores)",
      "box_codigo deve ser único",
      "Box com status 'assinado' deve ter responsável",
      "Box com status 'disponivel' não pode ter responsável",
      "Área deve ser um número positivo"
    ]
  }
];

export function ImportacaoModelo() {
  const downloadCSV = () => {
    const csvContent = [
      TEMPLATE_HEADERS.join(";"),
      ...TEMPLATE_EXAMPLE.map(row => 
        TEMPLATE_HEADERS.map(h => row[h as keyof typeof row] || "").join(";")
      )
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "modelo_importacao.csv";
    link.click();
  };

  const downloadExcel = () => {
    const ws = XLSX.utils.json_to_sheet(TEMPLATE_EXAMPLE);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Importação");
    XLSX.writeFile(wb, "modelo_importacao.xlsx");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Baixar Modelo de Planilha
          </CardTitle>
          <CardDescription>
            Faça o download do modelo de planilha e preencha com os dados a serem importados
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <Button onClick={downloadCSV} variant="outline" className="gap-2">
              <Table className="h-4 w-4" />
              Baixar CSV
            </Button>
            <Button onClick={downloadExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Baixar Excel (.xlsx)
            </Button>
          </div>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              O modelo já contém exemplos de preenchimento. Apague as linhas de exemplo 
              e adicione seus dados mantendo a estrutura.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Instruções de Preenchimento
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            {INSTRUCTIONS.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h4 className="font-semibold text-sm">{section.title}</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-5 w-5" />
            Ordem de Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-amber-700 dark:text-amber-400">
            O sistema processará automaticamente na seguinte ordem:
          </p>
          <ol className="mt-2 text-sm text-amber-700 dark:text-amber-400 list-decimal list-inside space-y-1">
            <li><strong>Setores</strong> - Criados se não existirem</li>
            <li><strong>Segmentos</strong> - Criados se não existirem</li>
            <li><strong>Responsáveis</strong> - Criados ou vinculados por CPF</li>
            <li><strong>Boxes</strong> - Criados com vínculos aos responsáveis</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
