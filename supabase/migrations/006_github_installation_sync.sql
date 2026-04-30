-- Add GitHub user ID to users table for linking installations
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS github_id BIGINT UNIQUE;

-- Index for fast lookup during installation webhooks
CREATE INDEX IF NOT EXISTS users_github_id_idx ON public.users(github_id);
