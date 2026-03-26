import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, TrendingUp, Package, AlertTriangle } from "lucide-react";

const Dashboard = () => {
  const { data: books = [] } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: transactions = [] } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const { data, error } = await supabase.from("transactions").select("*, books(title)").order("created_at", { ascending: false }).limit(20);
      if (error) throw error;
      return data;
    },
  });

  const totalBooks = books.length;
  const totalStock = books.reduce((s, b) => s + b.quantity, 0);
  const lowStock = books.filter((b) => b.quantity <= 2);
  const todaySales = transactions.filter(
    (t) => t.type === "sale" && new Date(t.created_at).toDateString() === new Date().toDateString()
  );
  const todayRevenue = todaySales.reduce((s, t) => s + t.final_price, 0);

  const stats = [
    { label: "Total Titles", value: totalBooks, icon: BookOpen, color: "text-primary" },
    { label: "Total Stock", value: totalStock, icon: Package, color: "text-accent" },
    { label: "Today's Revenue", value: `Tk ${todayRevenue.toFixed(2)}`, icon: TrendingUp, color: "text-success" },
    { label: "Low Stock", value: lowStock.length, icon: AlertTriangle, color: "text-destructive" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display leading-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of your bookstore</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label} className="slide-up">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-2">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold tabular-nums">{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Low Stock Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStock.map((b) => (
                <div key={b.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">{b.title}</p>
                    <p className="text-xs text-muted-foreground">{b.isbn}</p>
                  </div>
                  <span className="text-sm font-semibold text-destructive tabular-nums">
                    {b.quantity} left
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">No transactions yet.</p>
          ) : (
            <div className="space-y-2">
              {transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex justify-between items-center py-2 border-b last:border-0">
                  <div>
                    <p className="font-medium text-sm">
                      {(t as any).books?.title || "Unknown"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t.type === "sale" ? "Sale" : "Return"} · {new Date(t.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${t.type === "return" ? "text-destructive" : "text-success"}`}>
                    {t.type === "return" ? "-" : "+"}Tk {t.final_price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
