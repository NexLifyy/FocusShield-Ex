-- ── SUPABASE DATABASE INITIALIZATION SCHEMA ──
-- FocusShield Extension companion database structure

-- Disable search path warning
-- SET search_path TO public;

-- 1. Create Profiles Table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  is_premium BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create profiles policies
CREATE POLICY "Users can view their own profiles" 
  ON public.profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profiles" 
  ON public.profiles FOR UPDATE 
  USING (auth.uid() = id);

-- 2. Create Backups Table (stores extension settings sync data)
CREATE TABLE IF NOT EXISTS public.backups (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  custom_sites JSONB DEFAULT '[]'::jsonb NOT NULL,
  schedules JSONB DEFAULT '[]'::jsonb NOT NULL,
  focus_stats JSONB DEFAULT '{}'::jsonb NOT NULL,
  filter_adult BOOLEAN DEFAULT FALSE NOT NULL,
  filter_gaming BOOLEAN DEFAULT FALSE NOT NULL,
  filter_shopping BOOLEAN DEFAULT FALSE NOT NULL,
  filter_gambling BOOLEAN DEFAULT FALSE NOT NULL,
  filter_streaming BOOLEAN DEFAULT FALSE NOT NULL,
  previous_platform_states JSONB DEFAULT '{}'::jsonb NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on backups
ALTER TABLE public.backups ENABLE ROW LEVEL SECURITY;

-- Create backups policies
CREATE POLICY "Users can view their own backups" 
  ON public.backups FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backups" 
  ON public.backups FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backups" 
  ON public.backups FOR UPDATE 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backups" 
  ON public.backups FOR DELETE 
  USING (auth.uid() = user_id);

-- 3. Automatic Profile Creation Trigger
-- When a user signs up via Supabase Auth, automatically create their profiles row
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, is_premium)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'is_premium')::boolean, FALSE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user signup trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
