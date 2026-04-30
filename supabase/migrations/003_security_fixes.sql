-- Atomic quota check-and-read (avoids race condition in webhook handler)
-- Returns TRUE if the user is under the limit, FALSE if they've hit it.
-- Does NOT increment - increment still happens via increment_scan_usage() after scan creation.
CREATE OR REPLACE FUNCTION public.check_quota(
  p_user_id UUID,
  p_month DATE,
  p_limit INT
) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COALESCE(scan_count, 0)
  INTO v_count
  FROM scan_usage
  WHERE user_id = p_user_id AND month = p_month;

  RETURN COALESCE(v_count, 0) < p_limit;
END;
$$;
