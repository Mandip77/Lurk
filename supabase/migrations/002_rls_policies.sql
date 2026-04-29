-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.repositories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scan_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Users
CREATE POLICY "Users see own row" ON public.users
  FOR ALL USING (auth.uid() = id);

-- Repositories
CREATE POLICY "Users see own repos" ON public.repositories
  FOR ALL USING (auth.uid() = user_id);

-- Scans
CREATE POLICY "Users see own scans" ON public.scans
  FOR ALL USING (auth.uid() = user_id);

-- Findings
CREATE POLICY "Users see own findings" ON public.findings
  FOR ALL USING (auth.uid() = user_id);

-- Scan usage
CREATE POLICY "Users see own usage" ON public.scan_usage
  FOR ALL USING (auth.uid() = user_id);

-- Reports: owners see all their reports; anyone can read public ones
CREATE POLICY "Users see own reports" ON public.reports
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Public reports readable by all" ON public.reports
  FOR SELECT USING (is_public = true);
