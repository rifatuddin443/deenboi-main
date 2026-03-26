import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, startOfDay } from "date-fns";

const Reports = () => {
  const { data: transactions = [] } = useQuery({
    queryKey: ["all-transactions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, books(title)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Last 7 days chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayStr = dayStart.toDateString();
    const daySales = transactions.filter(
      (t) => t.type === "sale" && new Date(t.created_at).toDateString() === dayStr
    );
    const dayReturns = transactions.filter(
      (t) => t.type === "return" && new Date(t.created_at).toDateString() === dayStr
    );
    return {
      day: format(date, "EEE"),
      sales: daySales.reduce((s, t) => s + t.final_price, 0),
      returns: dayReturns.reduce((s, t) => s + t.final_price, 0),
    };
  });

  const totalSales = transactions.filter((t) => t.type === "sale").reduce((s, t) => s + t.final_price, 0);
  const totalReturns = transactions.filter((t) => t.type === "return").reduce((s, t) => s + t.final_price, 0);
  const totalTransactions = transactions.length;

  // Top sellers
  const bookSales: Record<string, { title: string; qty: number; revenue: number }> = {};
  transactions.filter((t) => t.type === "sale").forEach((t) => {
    const title = (t as any).books?.title || "Unknown";
    if (!bookSales[t.book_id]) bookSales[t.book_id] = { title, qty: 0, revenue: 0 };
    bookSales[t.book_id].qty += t.quantity;
    bookSales[t.book_id].revenue += t.final_price;
  });
  const topSellers = Object.values(bookSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display leading-tight">Reports</h1>
        <p className="text-muted-foreground mt-1">Sales analytics and insights</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="slide-up">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold tabular-nums text-success">Tk {totalSales.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="slide-up" style={{ animationDelay: "80ms" }}>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Total Returns</p>
            <p className="text-2xl font-bold tabular-nums text-destructive">Tk {totalReturns.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="slide-up" style={{ animationDelay: "160ms" }}>
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground">Transactions</p>
            <p className="text-2xl font-bold tabular-nums">{totalTransactions}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Last 7 Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7Days}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                    fontSize: 13,
                  }}
                />
                 <Bar dataKey="sales" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Sales (Tk)" />
                 <Bar dataKey="returns" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} name="Returns (Tk)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {topSellers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Top Sellers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topSellers.map((b, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">#{i + 1}</span>
                    <div>
                      <p className="font-medium text-sm">{b.title}</p>
                      <p className="text-xs text-muted-foreground">{b.qty} sold</p>
                    </div>
                  </div>
                  <span className="font-semibold tabular-nums text-sm">Tk {b.revenue.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Reports;
