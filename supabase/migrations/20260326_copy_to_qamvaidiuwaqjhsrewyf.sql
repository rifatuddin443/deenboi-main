-- Apply this in Supabase Dashboard -> SQL Editor for project qamvaidiuwaqjhsrewyf
-- Recreates schema, triggers, RLS policies, and auth signup triggers.

BEGIN;

-- Needed for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- === Migration 1: books + transactions ===

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

-- === Migration 2: profiles + roles + tighten RLS ===

-- Profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Authenticated users can read all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- User roles
CREATE TYPE public.app_role AS ENUM ('seller', 'stakeholder');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can read own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Auto-assign seller role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'seller');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Update books/transactions RLS to require authentication
DROP POLICY IF EXISTS "Anyone can view books" ON public.books;
DROP POLICY IF EXISTS "Anyone can insert books" ON public.books;
DROP POLICY IF EXISTS "Anyone can update books" ON public.books;
DROP POLICY IF EXISTS "Anyone can delete books" ON public.books;
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can insert transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can update transactions" ON public.transactions;
DROP POLICY IF EXISTS "Anyone can delete transactions" ON public.transactions;

CREATE POLICY "Authenticated can view books" ON public.books FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update books" ON public.books FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete books" ON public.books FOR DELETE TO authenticated USING (true);
CREATE POLICY "Authenticated can view transactions" ON public.transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete transactions" ON public.transactions FOR DELETE TO authenticated USING (true);

COMMIT;
