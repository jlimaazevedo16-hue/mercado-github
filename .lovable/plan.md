
# Plano: Exibir Valor UFMS e Valor Real na Ficha do Box

## Objetivo
Atualizar o card "Configuração de Cobrança" na ficha do box (`BoxFicha.tsx`) para exibir dois valores lado a lado:
1. **Valor Sugerido UFMS** - calculado com base na taxa de condomínio + área × UFMS × fator de aluguel
2. **Valor Cobrança Real** - calculado pela multiplicação do m² do box × valor/m² do setor (mínimo R$ 50)

## Contexto Atual
- O sistema já possui o contexto `useUFMS()` que fornece:
  - `ufmsValor` (valor da UFMS vigente)
  - `fatorCondominio` e `fatorAluguel`
  - `taxaCondominio` (UFMS × fator condomínio)
  - `taxaAluguelM2` (UFMS × fator aluguel)
- O card atual mostra apenas o cálculo por setor (m² × valor/m²)

## Alterações

### 1. Importar contexto UFMS
Adicionar import do `useUFMS` no `BoxFicha.tsx`

### 2. Reformular o Card de Cobrança
Reorganizar em 3 seções:

```text
+-----------------------------------------------+
|  Configuração de Cobrança                     |
+-----------------------------------------------+
| Valor Sugerido (UFMS)    | Valor Cobrança Real|
| R$ 123,45                | R$ 85,00           |
| Condomínio: R$ 18,80     | 17m² × R$ 5,00/m²  |
| Aluguel: 17m² × R$ 6,14  | (mínimo R$ 50)     |
|--------------------------|--------------------+
| Valor Diferenciado (se aplicável)             |
| [ campo para valor customizado ]              |
+-----------------------------------------------+
```

### Fórmulas:

**Valor UFMS:**
```
Taxa Condomínio + (Área × UFMS × Fator Aluguel)
= taxaCondominio + (area_m2 × ufmsValor × fatorAluguel)
```

**Valor Real (Setor):**
```
max(50, Área × Valor/m² do Setor)
```

## Seção Técnica

### Arquivo: `src/pages/BoxFicha.tsx`

1. Adicionar import:
```typescript
import { useUFMS } from "@/contexts/UFMSContext";
```

2. No componente, chamar o hook:
```typescript
const { ufmsValor, fatorCondominio, fatorAluguel, taxaCondominio, taxaAluguelM2 } = useUFMS();
```

3. Substituir o card de cobrança (linhas ~715-767) por uma versão com 3 colunas:
   - Coluna 1: Valor Sugerido UFMS (somente leitura)
   - Coluna 2: Valor Cobrança Real pelo Setor (somente leitura)
   - Coluna 3: Campo para Valor Diferenciado (editável)

### Cálculos no componente:
```typescript
// Valor sugerido pela UFMS
const area = Number(formData.area_m2 || box?.area_m2 || 0);
const valorUFMS = taxaCondominio + (area * ufmsValor * fatorAluguel);

// Valor real (setor)
const valorPorM2 = Number(box?.setores?.valor_cobranca_padrao || 5);
const valorSetor = Math.max(50, area * valorPorM2);

// Valor final usado nos relatórios
const valorFinal = formData.valor_cobranca_customizado 
  ? Math.max(50, Number(formData.valor_cobranca_customizado))
  : valorSetor;
```

## Resultado Esperado
O administrador verá claramente:
- Quanto o box **deveria pagar** pela fórmula UFMS oficial
- Quanto o box **vai pagar** pela regra do setor
- Opção de definir um valor diferenciado que substitui o cálculo automático

Todos os relatórios financeiros continuarão usando o valor real (setor ou diferenciado).
