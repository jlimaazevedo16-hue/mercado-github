import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface EmailTemplatePreviewProps {
  assunto: string;
  conteudo: string;
}

interface InstitutionalConfig {
  nome: string;
  cnpj: string;
  endereco: string;
  cidade: string;
  email: string;
  logoUrl: string;
  corPrimaria: string;
  corSecundaria: string;
}

const DEFAULT_CONFIG: InstitutionalConfig = {
  nome: "Mercado Municipal Digital",
  cnpj: "00.000.000/0001-00",
  endereco: "Rua Principal, 123",
  cidade: "Cidade - UF",
  email: "contato@mercadomunicipal.com",
  logoUrl: "",
  corPrimaria: "#1e40af",
  corSecundaria: "#f59e0b",
};

const defaultVariables: Record<string, string> = {
  nome: "João Silva",
  email: "joao.silva@email.com",
  box: "A-001",
  responsavel: "Maria Oliveira",
  data: new Date().toLocaleDateString("pt-BR"),
  prazo: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR"),
  mensagem: "Esta é uma mensagem de exemplo para demonstrar como o conteúdo será exibido.",
  titulo: "Título do E-mail",
  documento: "Alvará de Funcionamento",
  referencia: "Box A-001 / Maria Oliveira",
  data_vencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString("pt-BR"),
  dias_restantes: "30",
  valor: "1.250,00",
  mes_referencia: "Janeiro/2026",
  vencimento: "15/02/2026",
  link: "#",
  assunto: "Assunto do E-mail",
  conteudo: "<p>Conteúdo de exemplo do e-mail.</p>",
};

export function EmailTemplatePreview({ assunto, conteudo }: EmailTemplatePreviewProps) {
  const [config, setConfig] = useState<InstitutionalConfig>(DEFAULT_CONFIG);
  const [variables, setVariables] = useState<Record<string, string>>(defaultVariables);

  useEffect(() => {
    fetchInstitutionalConfig();
  }, []);

  const fetchInstitutionalConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("configuracoes_administrativas")
        .select("chave, descricao")
        .in("chave", [
          "instituicao_nome",
          "instituicao_cnpj",
          "instituicao_endereco",
          "instituicao_cidade",
          "instituicao_email",
          "instituicao_logo_url",
          "instituicao_cor_primaria",
          "instituicao_cor_secundaria",
        ]);

      if (error) throw error;

      const configMap = new Map(data?.map((item) => [item.chave, item.descricao]) || []);

      const newConfig: InstitutionalConfig = {
        nome: configMap.get("instituicao_nome") || DEFAULT_CONFIG.nome,
        cnpj: configMap.get("instituicao_cnpj") || DEFAULT_CONFIG.cnpj,
        endereco: configMap.get("instituicao_endereco") || DEFAULT_CONFIG.endereco,
        cidade: configMap.get("instituicao_cidade") || DEFAULT_CONFIG.cidade,
        email: configMap.get("instituicao_email") || DEFAULT_CONFIG.email,
        logoUrl: configMap.get("instituicao_logo_url") || DEFAULT_CONFIG.logoUrl,
        corPrimaria: configMap.get("instituicao_cor_primaria") || DEFAULT_CONFIG.corPrimaria,
        corSecundaria: configMap.get("instituicao_cor_secundaria") || DEFAULT_CONFIG.corSecundaria,
      };

      setConfig(newConfig);
      setVariables((prev) => ({
        ...prev,
        instituicao: newConfig.nome,
        cor_primaria: newConfig.corPrimaria,
        cor_secundaria: newConfig.corSecundaria,
      }));
    } catch (error) {
      console.error("Error fetching config:", error);
    }
  };

  const replaceVariables = (text: string): string => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
    });
    return result;
  };

  const processedSubject = replaceVariables(assunto);
  const processedContent = replaceVariables(conteudo);

  const ano = new Date().getFullYear();

  const logoHtml = config.logoUrl
    ? `<img src="${config.logoUrl}" alt="${config.nome}" style="max-height: 60px; max-width: 200px; margin-bottom: 15px;" />`
    : "";

  const footerInfo = [
    config.nome,
    config.cnpj ? `CNPJ: ${config.cnpj}` : "",
    config.endereco && config.cidade ? `${config.endereco} - ${config.cidade}` : config.endereco || config.cidade,
    config.email ? `E-mail: ${config.email}` : "",
  ]
    .filter(Boolean)
    .join("<br>");

  const fullEmailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" style="width: 100%; border-collapse: collapse;">
        <tr>
          <td align="center" style="padding: 40px 0;">
            <table role="presentation" style="width: 600px; border-collapse: collapse; background-color: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <tr>
                <td style="padding: 40px 40px 20px; text-align: center; background-color: ${config.corPrimaria}; border-radius: 8px 8px 0 0;">
                  ${logoHtml}
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px;">${config.nome}</h1>
                </td>
              </tr>
              <tr>
                <td style="padding: 40px;">
                  ${processedContent}
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 40px; background-color: #f9fafb; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; color: #374151; font-size: 12px; line-height: 1.5;">
                    ${footerInfo}
                  </p>
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    © ${ano} ${config.nome}. Todos os direitos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  // Extract variables from content
  const usedVariables = new Set<string>();
  const regex = /\{\{(\w+)\}\}/g;
  let match;
  while ((match = regex.exec(assunto + conteudo)) !== null) {
    usedVariables.add(match[1]);
  }

  return (
    <div className="space-y-4">
      {/* Variable Editor */}
      {usedVariables.size > 0 && (
        <Card>
          <CardContent className="pt-4">
            <Label className="text-sm font-medium mb-3 block">
              Editar valores de preview
            </Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {Array.from(usedVariables).map((varName) => (
                <div key={varName} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{`{{${varName}}}`}</Label>
                  <Input
                    value={variables[varName] || ""}
                    onChange={(e) =>
                      setVariables({ ...variables, [varName]: e.target.value })
                    }
                    className="h-8 text-sm"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subject Preview */}
      <Card>
        <CardContent className="pt-4">
          <Label className="text-sm font-medium text-muted-foreground">Assunto:</Label>
          <p className="font-medium mt-1">{processedSubject || "(Sem assunto)"}</p>
        </CardContent>
      </Card>

      {/* Email Preview */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div
            className="w-full"
            style={{ backgroundColor: "#f4f4f5" }}
            dangerouslySetInnerHTML={{ __html: fullEmailHtml }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
