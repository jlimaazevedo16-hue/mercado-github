import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Calculator } from "lucide-react";

interface UFMSCalculationPreviewProps {
  ufmsValor: number;
  fatorCondominio: number;
  fatorAluguel: number;
}

export function UFMSCalculationPreview({ 
  ufmsValor, 
  fatorCondominio, 
  fatorAluguel 
}: UFMSCalculationPreviewProps) {
  const taxaCondominioBase = ufmsValor * fatorCondominio;
  const taxaAluguelM2 = ufmsValor * fatorAluguel;

  return (
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
            <p className="text-sm text-muted-foreground">Taxa de Condomínio por m²</p>
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
              R$ {((taxaAluguelM2 + taxaCondominioBase) * 30).toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              30m² × (R$ {taxaCondominioBase.toFixed(2)} + R$ {taxaAluguelM2.toFixed(2)})
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
