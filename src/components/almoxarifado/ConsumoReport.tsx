import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, eachMonthOfInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface ConsumoData {
  item_descricao: string;
  total_entradas: number;
  total_saidas: number;
  saldo: number;
}

interface ChartData {
  month: string;
  entradas: number;
  saidas: number;
}

export const ConsumoReport = () => {
  const [dataInicio, setDataInicio] = useState(format(startOfMonth(new Date()), "yyyy-MM-dd"));
  const [dataFim, setDataFim] = useState(format(endOfMonth(new Date()), "yyyy-MM-dd"));
  const [selectedItem, setSelectedItem] = useState<string>("all");

  const { data: items } = useQuery({
    queryKey: ["inventory-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory_items")
        .select("id, descricao")
        .order("descricao");
      if (error) throw error;
      return data;
    },
  });

  const { data: entries } = useQuery({
    queryKey: ["inventory-entries-report", dataInicio, dataFim, selectedItem],
    queryFn: async () => {
      let query = supabase
        .from("inventory_entries")
        .select("item_id, qtd, data, inventory_items(descricao)")
        .gte("data", dataInicio)
        .lte("data", dataFim);

      if (selectedItem !== "all") {
        query = query.eq("item_id", selectedItem);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: exits } = useQuery({
    queryKey: ["inventory-exits-report", dataInicio, dataFim, selectedItem],
    queryFn: async () => {
      let query = supabase
        .from("inventory_exits")
        .select("item_id, qtd, data, inventory_items(descricao)")
        .gte("data", dataInicio)
        .lte("data", dataFim);

      if (selectedItem !== "all") {
        query = query.eq("item_id", selectedItem);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Monthly chart data (last 6 months)
  const { data: chartEntries } = useQuery({
    queryKey: ["inventory-entries-chart", selectedItem],
    queryFn: async () => {
      const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
      let query = supabase
        .from("inventory_entries")
        .select("qtd, data")
        .gte("data", sixMonthsAgo);

      if (selectedItem !== "all") {
        query = query.eq("item_id", selectedItem);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: chartExits } = useQuery({
    queryKey: ["inventory-exits-chart", selectedItem],
    queryFn: async () => {
      const sixMonthsAgo = format(startOfMonth(subMonths(new Date(), 5)), "yyyy-MM-dd");
      let query = supabase
        .from("inventory_exits")
        .select("qtd, data")
        .gte("data", sixMonthsAgo);

      if (selectedItem !== "all") {
        query = query.eq("item_id", selectedItem);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const chartData: ChartData[] = (() => {
    const months = eachMonthOfInterval({
      start: startOfMonth(subMonths(new Date(), 5)),
      end: endOfMonth(new Date()),
    });

    return months.map((month) => {
      const monthStr = format(month, "yyyy-MM");
      const monthLabel = format(month, "MMM/yy", { locale: ptBR });

      const monthEntries = chartEntries?.filter((e: any) => e.data?.startsWith(monthStr)) || [];
      const monthExits = chartExits?.filter((e: any) => e.data?.startsWith(monthStr)) || [];

      return {
        month: monthLabel,
        entradas: monthEntries.reduce((sum: number, e: any) => sum + Number(e.qtd), 0),
        saidas: monthExits.reduce((sum: number, e: any) => sum + Number(e.qtd), 0),
      };
    });
  })();

  const consumoData: ConsumoData[] = (() => {
    const itemMap = new Map<string, { entradas: number; saidas: number; descricao: string }>();

    entries?.forEach((entry: any) => {
      const key = entry.item_id;
      const current = itemMap.get(key) || { entradas: 0, saidas: 0, descricao: entry.inventory_items?.descricao || "" };
      current.entradas += Number(entry.qtd);
      itemMap.set(key, current);
    });

    exits?.forEach((exit: any) => {
      const key = exit.item_id;
      const current = itemMap.get(key) || { entradas: 0, saidas: 0, descricao: exit.inventory_items?.descricao || "" };
      current.saidas += Number(exit.qtd);
      itemMap.set(key, current);
    });

    return Array.from(itemMap.entries()).map(([_, value]) => ({
      item_descricao: value.descricao,
      total_entradas: value.entradas,
      total_saidas: value.saidas,
      saldo: value.entradas - value.saidas,
    })).sort((a, b) => a.item_descricao.localeCompare(b.item_descricao));
  })();

  const totals = consumoData.reduce(
    (acc, item) => ({
      entradas: acc.entradas + item.total_entradas,
      saidas: acc.saidas + item.total_saidas,
      saldo: acc.saldo + item.saldo,
    }),
    { entradas: 0, saidas: 0, saldo: 0 }
  );

  const exportToCSV = () => {
    const headers = ["Item", "Total Entradas", "Total Saídas", "Saldo"];
    const rows = consumoData.map((item) => [
      item.item_descricao,
      item.total_entradas.toString(),
      item.total_saidas.toString(),
      item.saldo.toString(),
    ]);
    rows.push(["TOTAL", totals.entradas.toString(), totals.saidas.toString(), totals.saldo.toString()]);

    const csvContent = [headers.join(";"), ...rows.map((row) => row.join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `relatorio-consumo-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end flex-wrap">
            <div className="w-48">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
            <div className="flex-1 min-w-48">
              <Label htmlFor="item">Item</Label>
              <Select value={selectedItem} onValueChange={setSelectedItem}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os itens" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os itens</SelectItem>
                  {items?.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.descricao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" onClick={exportToCSV} disabled={consumoData.length === 0}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Consumo Mensal (Últimos 6 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#22c55e" />
                <Bar dataKey="saidas" name="Saídas" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relatório de Consumo</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead className="text-right">Total Entradas</TableHead>
                <TableHead className="text-right">Total Saídas</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consumoData.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>{item.item_descricao}</TableCell>
                  <TableCell className="text-right text-green-600">+{item.total_entradas}</TableCell>
                  <TableCell className="text-right text-red-600">-{item.total_saidas}</TableCell>
                  <TableCell className={`text-right font-medium ${item.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {item.saldo}
                  </TableCell>
                </TableRow>
              ))}
              {consumoData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Nenhum dado encontrado para o período
                  </TableCell>
                </TableRow>
              )}
              {consumoData.length > 0 && (
                <TableRow className="font-bold bg-muted/50">
                  <TableCell>TOTAL</TableCell>
                  <TableCell className="text-right text-green-600">+{totals.entradas}</TableCell>
                  <TableCell className="text-right text-red-600">-{totals.saidas}</TableCell>
                  <TableCell className={`text-right ${totals.saldo >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {totals.saldo}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
