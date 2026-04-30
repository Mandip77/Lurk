-- API Keys (Pro+ users)
CREATE TABLE public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  key_prefix TEXT NOT NULL,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own api keys" ON public.api_keys FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON public.api_keys(key_hash);

-- Referrals
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  code TEXT NOT NULL UNIQUE DEFAULT SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 8),
  bonus_scans_awarded INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own referrals" ON public.referrals FOR ALL USING (auth.uid() = referrer_id);
CREATE INDEX idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX idx_referrals_code ON public.referrals(code);

-- Referral bonus scans column on users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS bonus_scans INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE DEFAULT SUBSTR(MD5(gen_random_uuid()::TEXT), 1, 8);

-- Custom rules
CREATE TABLE public.custom_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  pattern TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low', 'info')),
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.custom_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own rules" ON public.custom_rules FOR ALL USING (auth.uid() = user_id);
CREATE INDEX idx_custom_rules_user_id ON public.custom_rules(user_id);

-- Suppressed findings
ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS suppressed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS suppressed_reason TEXT;
ALTER TABLE public.findings ADD COLUMN IF NOT EXISTS suppressed_at TIMESTAMPTZ;

-- Update scan_usage free limit function to account for bonus scans
CREATE OR REPLACE FUNCTION public.get_monthly_limit(p_user_id UUID)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_tier TEXT;
  v_bonus INTEGER;
BEGIN
  SELECT tier, bonus_scans INTO v_tier, v_bonus FROM users WHERE id = p_user_id;
  IF v_tier IN ('pro', 'agency') THEN RETURN 999999; END IF;
  RETURN 3 + COALESCE(v_bonus, 0);
END;
$$;
