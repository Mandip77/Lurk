-- API key expiry support
ALTER TABLE public.api_keys ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Audit log table for security-sensitive actions
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES public.users(id) ON DELETE SET NULL,
  action      TEXT        NOT NULL,
  resource_type TEXT,
  resource_id TEXT,
  metadata    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Users can read their own audit logs; only service role can insert
CREATE POLICY "Users read own audit logs"
  ON public.audit_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE INDEX idx_audit_logs_user_id   ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action    ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_created   ON public.audit_logs(created_at DESC);

-- Auto-purge audit logs older than 90 days (keeps table lean)
CREATE OR REPLACE FUNCTION public.purge_old_audit_logs()
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  DELETE FROM public.audit_logs WHERE created_at < NOW() - INTERVAL '90 days';
$$;
