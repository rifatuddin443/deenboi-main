import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import BarcodeScanner from "@/components/BarcodeScanner";
import SaleConfirmation from "@/components/SaleConfirmation";
import { ScanBarcode, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Tables } from "@/integrations/supabase/types";

const Index = () => {
  const [scanning, setScanning] = useState(true);
  const [book, setBook] = useState<Tables<"books"> | null>(null);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  const handleScan = async (code: string) => {
    setScanning(false);
    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("isbn", code)
      .maybeSingle();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setScanning(true);
      return;
    }
    if (!data) {
      toast({ title: "Book not found", description: `No book with ISBN "${code}". Add it in Inventory first.`, variant: "destructive" });
      setScanning(true);
      return;
    }
    if (data.quantity <= 0) {
      toast({ title: "Out of stock", description: `"${data.title}" has no stock remaining.`, variant: "destructive" });
      setScanning(true);
      return;
    }
    setBook(data);
  };

  const handleConfirm = async (saleData: { discountPercent: number; finalPrice: number; quantity: number }) => {
    if (!book) return;

    const { error: txError } = await supabase.from("transactions").insert({
      book_id: book.id,
      type: "sale",
      quantity: saleData.quantity,
      original_price: book.price * saleData.quantity,
      discount_percent: saleData.discountPercent,
      final_price: saleData.finalPrice,
    });

    if (txError) {
      toast({ title: "Error", description: txError.message, variant: "destructive" });
      return;
    }

    const { error: updateError } = await supabase
      .from("books")
      .update({ quantity: book.quantity - saleData.quantity })
      .eq("id", book.id);

    if (updateError) {
      toast({ title: "Warning", description: "Sale recorded but stock not updated.", variant: "destructive" });
    }

    setBook(null);
    setSuccess(true);
    setTimeout(() => {
      setSuccess(false);
      setScanning(true);
    }, 2000);
  };

  const handleCancel = () => {
    setBook(null);
    setScanning(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display leading-tight">Scan & Sell</h1>
        <p className="text-muted-foreground mt-1">Scan a barcode to start a sale</p>
      </div>

      {success && (
        <div className="flex flex-col items-center py-12 fade-in">
          <CheckCircle2 className="h-16 w-16 text-success mb-4" />
          <p className="text-xl font-semibold">Sale Complete!</p>
        </div>
      )}

      {!book && !success && (
        <div className="space-y-4">
          <BarcodeScanner onScan={handleScan} scanning={scanning} />
          {!scanning && (
            <div className="text-center">
              <Button variant="outline" onClick={() => setScanning(true)} className="gap-2">
                <ScanBarcode className="h-4 w-4" /> Scan Again
              </Button>
            </div>
          )}
        </div>
      )}

      {book && (
        <SaleConfirmation book={book} onConfirm={handleConfirm} onCancel={handleCancel} />
      )}
    </div>
  );
};

export default Index;
