import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RotateCcw, Search, CheckCircle2 } from "lucide-react";

const Returns = () => {
  const [search, setSearch] = useState("");
  const [selectedTx, setSelectedTx] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ["recent-sales"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("*, books(id, title, isbn, quantity, price)")
        .eq("type", "sale")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const returnMutation = useMutation({
    mutationFn: async () => {
      if (!selectedTx) return;
      const book = (selectedTx as any).books;

      // Insert return transaction
      const { error: txErr } = await supabase.from("transactions").insert({
        book_id: selectedTx.book_id,
        type: "return",
        quantity: selectedTx.quantity,
        original_price: selectedTx.original_price,
        discount_percent: 0,
        final_price: selectedTx.final_price,
        notes: notes || "Return",
      });
      if (txErr) throw txErr;

      // Restore stock
      const { error: updateErr } = await supabase
        .from("books")
        .update({ quantity: book.quantity + selectedTx.quantity })
        .eq("id", selectedTx.book_id);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["recent-sales"] });
      qc.invalidateQueries({ queryKey: ["books"] });
      setSelectedTx(null);
      setNotes("");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
      toast({ title: "Return processed successfully" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = sales.filter((s) => {
    const book = (s as any).books;
    const q = search.toLowerCase();
    return (
      book?.title?.toLowerCase().includes(q) ||
      book?.isbn?.includes(search)
    );
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display leading-tight">Returns</h1>
        <p className="text-muted-foreground mt-1">Process returns and correct mistakes</p>
      </div>

      {success && (
        <div className="flex flex-col items-center py-8 fade-in">
          <CheckCircle2 className="h-12 w-12 text-success mb-3" />
          <p className="text-lg font-semibold">Return Processed!</p>
        </div>
      )}

      {selectedTx ? (
        <Card className="max-w-md mx-auto slide-up">
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">Confirm Return</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-1">
              <p className="font-semibold">{(selectedTx as any).books?.title}</p>
              <p className="text-sm text-muted-foreground">Sold on {new Date(selectedTx.created_at).toLocaleDateString()}</p>
              <p className="text-sm">Qty: {selectedTx.quantity} · Paid: Tk {selectedTx.final_price.toFixed(2)}</p>
            </div>
            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Reason for return..."
                rows={2}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setSelectedTx(null)}>Cancel</Button>
              <Button variant="destructive" className="flex-1 gap-2" onClick={() => returnMutation.mutate()} disabled={returnMutation.isPending}>
                <RotateCcw className="h-4 w-4" /> Process Return
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search sales by title or ISBN..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No recent sales found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((sale) => {
                const book = (sale as any).books;
                return (
                  <Card key={sale.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedTx(sale)}>
                    <CardContent className="py-3 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">{book?.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(sale.created_at).toLocaleDateString()} · Qty: {sale.quantity}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold tabular-nums">Tk {sale.final_price.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {sale.discount_percent > 0 ? `${sale.discount_percent}% off` : "No discount"}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Returns;
