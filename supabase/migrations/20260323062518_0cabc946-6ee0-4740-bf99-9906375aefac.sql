
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Books table
CREATE TABLE public.books (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  isbn TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT DEFAULT '',
  publisher TEXT DEFAULT '',
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books" ON public.books FOR SELECT USING (true);
CREATE POLICY "Anyone can insert books" ON public.books FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update books" ON public.books FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete books" ON public.books FOR DELETE USING (true);

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Transactions table (sales and returns)
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('sale', 'return')),
  quantity INTEGER NOT NULL DEFAULT 1,
  original_price NUMERIC(10,2) NOT NULL,
  discount_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  final_price NUMERIC(10,2) NOT NULL,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view transactions" ON public.transactions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert transactions" ON public.transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update transactions" ON public.transactions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete transactions" ON public.transactions FOR DELETE USING (true);

CREATE INDEX idx_transactions_book_id ON public.transactions(book_id);
CREATE INDEX idx_transactions_type ON public.transactions(type);
CREATE INDEX idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX idx_books_isbn ON public.books(isbn);
