import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

const emptyForm = { isbn: "", title: "", author: "", publisher: "", price: "", quantity: "" };

const Inventory = () => {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: books = [], isLoading } = useQuery({
    queryKey: ["books"],
    queryFn: async () => {
      const { data, error } = await supabase.from("books").select("*").order("title");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        isbn: form.isbn.trim(),
        title: form.title.trim(),
        author: form.author.trim(),
        publisher: form.publisher.trim(),
        price: parseFloat(form.price) || 0,
        quantity: parseInt(form.quantity) || 0,
      };
      if (editingId) {
        const { error } = await supabase.from("books").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("books").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      toast({ title: editingId ? "Book updated" : "Book added" });
      setDialogOpen(false);
      setForm(emptyForm);
      setEditingId(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("books").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["books"] });
      toast({ title: "Book deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (book: Tables<"books">) => {
    setForm({
      isbn: book.isbn,
      title: book.title,
      author: book.author || "",
      publisher: book.publisher || "",
      price: book.price.toString(),
      quantity: book.quantity.toString(),
    });
    setEditingId(book.id);
    setDialogOpen(true);
  };

  const openNew = () => {
    setForm(emptyForm);
    setEditingId(null);
    setDialogOpen(true);
  };

  const filtered = books.filter(
    (b) =>
      b.title.toLowerCase().includes(search.toLowerCase()) ||
      b.isbn.includes(search) ||
      (b.author || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display leading-tight">Inventory</h1>
          <p className="text-muted-foreground mt-1">{books.length} books total</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew} className="gap-2">
              <Plus className="h-4 w-4" /> Add Book
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Book" : "Add New Book"}</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label>ISBN / Barcode *</Label>
                <Input value={form.isbn} onChange={(e) => setForm({ ...form, isbn: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label>Title *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Author</Label>
                  <Input value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Publisher</Label>
                  <Input value={form.publisher} onChange={(e) => setForm({ ...form, publisher: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Price (Tk)</Label>
                  <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} required />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Saving..." : editingId ? "Update" : "Add Book"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by title, ISBN, author..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {search ? "No books match your search." : "No books yet. Add one to get started!"}
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead className="hidden sm:table-cell">Author</TableHead>
                <TableHead>ISBN</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{book.author}</TableCell>
                  <TableCell className="text-sm text-muted-foreground tabular-nums">{book.isbn}</TableCell>
                  <TableCell className="text-right tabular-nums">Tk {book.price.toFixed(2)}</TableCell>
                  <TableCell className={`text-right tabular-nums ${book.quantity <= 2 ? "text-destructive font-semibold" : ""}`}>
                    {book.quantity}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <button onClick={() => openEdit(book)} className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Pencil className="h-4 w-4 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(book.id)} className="p-1.5 rounded hover:bg-destructive/10 transition-colors">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default Inventory;
