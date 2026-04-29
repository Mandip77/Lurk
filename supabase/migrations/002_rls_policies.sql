-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Repositories policies
CREATE POLICY "Users can view own repositories" ON public.repositories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own repositories" ON public.repositories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own repositories" ON public.repositories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own repositories" ON public.repositories
  FOR DELETE USING (auth.uid() = user_id);

-- Scans policies
CREATE POLICY "Users can view scans for own repositories" ON public.scans
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.repositories r
      WHERE r.id = scans.repository_id AND r.user_id = auth.uid()
    )
  );

-- Findings policies
CREATE POLICY "Users can view findings for own scans" ON public.findings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.scans s
      JOIN public.repositories r ON r.id = s.repository_id
      WHERE s.id = findings.scan_id AND r.user_id = auth.uid()
    )
  );

-- Reports policies
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports" ON public.reports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Scan usage policies
CREATE POLICY "Users can view own usage" ON public.scan_usage
  FOR SELECT USING (auth.uid() = user_id);
