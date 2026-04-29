-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enums
CREATE TYPE user_tier AS ENUM ('free', 'pro', 'agency');
CREATE TYPE provider_type AS ENUM ('github', 'gitlab', 'bitbucket');
CREATE TYPE scan_status AS ENUM ('queued', 'scanning', 'complete', 'failed');
CREATE TYPE finding_category AS ENUM ('rls_misconfiguration', 'broken_auth', 'supply_chain', 'session_token', 'prompt_injection', 'other');
CREATE TYPE finding_severity AS ENUM ('critical', 'high', 'medium', 'low', 'info');

-- Users table (extends auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  stripe_customer_id TEXT UNIQUE,
  tier user_tier NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repositories table
CREATE TABLE public.repositories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider provider_type NOT NULL DEFAULT 'github',
  provider_repo_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  installation_id TEXT,
  webhook_secret TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider, provider_repo_id)
);

-- Scans table
CREATE TABLE public.scans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  repository_id UUID NOT NULL REFERENCES public.repositories(id) ON DELETE CASCADE,
  pr_number INTEGER,
  pr_title TEXT,
  pr_author TEXT,
  pr_url TEXT,
  status scan_status NOT NULL DEFAULT 'queued',
  findings JSONB DEFAULT '[]',
  fix_suggestions JSONB DEFAULT '[]',
  severity_score INTEGER DEFAULT 0 CHECK (severity_score >= 0 AND severity_score <= 100),
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Findings table (normalized)
CREATE TABLE public.findings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  category finding_category NOT NULL DEFAULT 'other',
  severity finding_severity NOT NULL DEFAULT 'info',
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT,
  line_start INTEGER,
  line_end INTEGER,
  code_snippet TEXT,
  fix_suggestion TEXT,
  cve_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Reports table (Agency tier)
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  scan_id UUID NOT NULL REFERENCES public.scans(id) ON DELETE CASCADE,
  client_name TEXT,
  agency_name TEXT,
  agency_logo_url TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Scan usage table (quota enforcement)
CREATE TABLE public.scan_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  scan_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, month)
);

-- Indexes
CREATE INDEX idx_repositories_user_id ON public.repositories(user_id);
CREATE INDEX idx_scans_repository_id ON public.scans(repository_id);
CREATE INDEX idx_scans_created_at ON public.scans(created_at DESC);
CREATE INDEX idx_findings_scan_id ON public.findings(scan_id);
CREATE INDEX idx_findings_severity ON public.findings(severity);
CREATE INDEX idx_reports_user_id ON public.reports(user_id);
CREATE INDEX idx_scan_usage_user_month ON public.scan_usage(user_id, month);

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
