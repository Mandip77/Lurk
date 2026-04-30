-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'agency')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repositories
CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'github',
  provider_repo_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  installation_id TEXT,
  webhook_secret TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_repo_id)
);

-- Scans
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  pr_number INTEGER,
  pr_title TEXT,
  pr_author TEXT,
  pr_url TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'scanning', 'complete', 'failed')),
  findings JSONB DEFAULT '[]',
  severity_score INTEGER DEFAULT 0 CHECK (severity_score >= 0 AND severity_score <= 100),
  tokens_used INTEGER,
  model_used TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Findings (normalized)
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  category TEXT,
  severity TEXT CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  title TEXT,
  description TEXT,
  file_path TEXT,
  line_start INTEGER,
  line_end INTEGER,
  code_snippet TEXT,
  fix_suggestion TEXT,
  cve_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scan usage (free tier quota)
CREATE TABLE public.scan_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, month)
);

-- Web reports (Agency tier - shareable, printable, white-label)
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  client_name TEXT,
  agency_name TEXT,
  agency_logo_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  slug TEXT UNIQUE DEFAULT SUBSTR(MD5(RANDOM()::TEXT), 1, 10),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_repositories_user_id ON public.repositories(user_id);
CREATE INDEX idx_scans_repository_id ON public.scans(repository_id);
CREATE INDEX idx_scans_user_id ON public.scans(user_id);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX idx_findings_scan_id ON public.findings(scan_id);
CREATE INDEX idx_reports_slug ON public.reports(slug);
CREATE INDEX idx_scan_usage_user_month ON public.scan_usage(user_id, month);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Atomic scan usage increment
CREATE OR REPLACE FUNCTION public.increment_scan_usage(p_user_id UUID, p_month DATE)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO scan_usage (user_id, month, scan_count)
  VALUES (p_user_id, p_month, 1)
  ON CONFLICT (user_id, month)
  DO UPDATE SET scan_count = scan_usage.scan_count + 1;
END;
$$;
