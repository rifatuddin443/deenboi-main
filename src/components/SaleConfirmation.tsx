import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X } from "lucide-react";
import type { Tables } from "@/integrations/supabase/types";

interface SaleConfirmationProps {
  book: Tables<"books">;
  onConfirm: (data: {
    discountPercent: number;
    finalPrice: number;
    quantity: number;
  }) => void;
  onCancel: () => void;
}

const SaleConfirmation = ({ book, onConfirm, onCancel }: SaleConfirmationProps) => {
  const [discountPercent, setDiscountPercent] = useState(0);
  const [customPrice, setCustomPrice] = useState("");
  const [useCustomPrice, setUseCustomPrice] = useState(false);
  const [quantity, setQuantity] = useState(1);

  const calculatedPrice = useCustomPrice
    ? parseFloat(customPrice) || 0
    : book.price * (1 - discountPercent / 100);

  const finalPrice = Math.round(calculatedPrice * 100) / 100;

  const handleDiscountInput = (val: string) => {
    const num = parseFloat(val);
    if (val === "") setDiscountPercent(0);
    else if (!isNaN(num)) setDiscountPercent(Math.max(0, Math.min(100, num)));
  };

  return (
    <Card className="max-w-md mx-auto slide-up shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl">Confirm Sale</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-lg bg-muted p-4 space-y-1">
          <p className="font-semibold text-base">{book.title}</p>
          <p className="text-sm text-muted-foreground">{book.author}</p>
          <p className="text-sm text-muted-foreground">ISBN: {book.isbn}</p>
          <p className="text-lg font-bold text-primary mt-2">Tk {book.price.toFixed(2)}</p>
          <p className="text-xs text-muted-foreground">In stock: {book.quantity}</p>
        </div>

        <div className="space-y-2">
          <Label>Quantity</Label>
          <Input
            type="number"
            min={1}
            max={book.quantity}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, Math.min(book.quantity, parseInt(e.target.value) || 1)))}
          />
        </div>

        <div className="flex gap-2">
          <Button
            variant={!useCustomPrice ? "default" : "outline"}
            size="sm"
            onClick={() => setUseCustomPrice(false)}
          >
            Discount %
          </Button>
          <Button
            variant={useCustomPrice ? "default" : "outline"}
            size="sm"
            onClick={() => setUseCustomPrice(true)}
          >
            Custom Price
          </Button>
        </div>

        {!useCustomPrice ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Label className="shrink-0">Discount:</Label>
              <Input
                type="number"
                min={0}
                max={100}
                step={1}
                value={discountPercent}
                onChange={(e) => handleDiscountInput(e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
            <Slider
              value={[discountPercent]}
              onValueChange={([v]) => setDiscountPercent(v)}
              max={100}
              step={5}
            />
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Custom Price (Tk)</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              placeholder="Enter price..."
              value={customPrice}
              onChange={(e) => setCustomPrice(e.target.value)}
              autoFocus
            />
          </div>
        )}

        <div className="rounded-lg bg-primary/10 p-4 text-center">
          <p className="text-sm text-muted-foreground">Total</p>
          <p className="text-3xl font-bold text-primary tabular-nums">
            Tk {(finalPrice * quantity).toFixed(2)}
          </p>
          {quantity > 1 && (
            <p className="text-xs text-muted-foreground">Tk {finalPrice.toFixed(2)} × {quantity}</p>
          )}
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 gap-2" onClick={onCancel}>
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => onConfirm({ discountPercent: useCustomPrice ? 0 : discountPercent, finalPrice: finalPrice * quantity, quantity })}
            disabled={finalPrice <= 0 || quantity > book.quantity}
          >
            <Check className="h-4 w-4" /> Confirm
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SaleConfirmation;
