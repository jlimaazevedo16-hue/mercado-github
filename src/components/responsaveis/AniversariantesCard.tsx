import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Cake, Gift } from "lucide-react";
import { format, getMonth, getDate, isToday, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export const AniversariantesCard = () => {
  const currentMonth = getMonth(new Date()) + 1; // 1-12
  const today = getDate(new Date());

  const { data: aniversariantes, isLoading } = useQuery({
    queryKey: ["aniversariantes-mes", currentMonth],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("responsaveis")
        .select("id, nome, data_nascimento, imagem_url, telefone")
        .eq("status", "ATIVO")
        .not("data_nascimento", "is", null);

      if (error) throw error;

      // Filter by current month
      return data
        ?.filter((r) => {
          if (!r.data_nascimento) return false;
          const birthDate = parseISO(r.data_nascimento);
          return getMonth(birthDate) + 1 === currentMonth;
        })
        .sort((a, b) => {
          const dayA = getDate(parseISO(a.data_nascimento!));
          const dayB = getDate(parseISO(b.data_nascimento!));
          return dayA - dayB;
        }) || [];
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Aniversariantes do Mês
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Cake className="h-5 w-5 text-pink-500" />
          Aniversariantes de {format(new Date(), "MMMM", { locale: ptBR })}
          {aniversariantes && aniversariantes.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {aniversariantes.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {aniversariantes && aniversariantes.length > 0 ? (
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {aniversariantes.map((pessoa) => {
              const birthDate = parseISO(pessoa.data_nascimento!);
              const day = getDate(birthDate);
              const isBirthdayToday = day === today;

              return (
                <div
                  key={pessoa.id}
                  className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isBirthdayToday ? "bg-pink-50 border border-pink-200" : "hover:bg-muted/50"
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={pessoa.imagem_url || undefined} />
                    <AvatarFallback className={isBirthdayToday ? "bg-pink-200" : ""}>
                      {pessoa.nome?.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate flex items-center gap-2">
                      {pessoa.nome}
                      {isBirthdayToday && (
                        <Gift className="h-4 w-4 text-pink-500 animate-bounce" />
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(birthDate, "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                  </div>
                  {isBirthdayToday && (
                    <Badge className="bg-pink-500 text-white">Hoje!</Badge>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm text-center py-4">
            Nenhum aniversariante neste mês
          </p>
        )}
      </CardContent>
    </Card>
  );
};
