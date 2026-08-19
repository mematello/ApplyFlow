-- Drop the existing function
DROP FUNCTION IF EXISTS decrement_free_ai_uses(UUID);

-- Recreate with atomic check-and-decrement
CREATE OR REPLACE FUNCTION decrement_free_ai_uses(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_updated_count int;
BEGIN
  -- Atomically decrement ONLY if greater than 0
  UPDATE profiles
  SET free_ai_uses_remaining = free_ai_uses_remaining - 1
  WHERE id = p_user_id AND free_ai_uses_remaining > 0;
  
  -- Check if any row was actually updated
  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  
  -- If no row was updated, it means the user had 0 uses remaining
  IF v_updated_count = 0 THEN
    RAISE EXCEPTION 'FREE_LIMIT_EXHAUSTED';
  END IF;
END;
$$;
