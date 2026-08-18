-- Add free AI usage column
ALTER TABLE profiles ADD COLUMN free_ai_uses_remaining INT NOT NULL DEFAULT 5;

-- RPC for server to decrement safely
CREATE OR REPLACE FUNCTION decrement_free_ai_uses(p_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET free_ai_uses_remaining = GREATEST(0, free_ai_uses_remaining - 1)
  WHERE id = p_user_id;
END;
$$;

-- Protect column from RLS client updates
CREATE OR REPLACE FUNCTION protect_free_ai_uses()
RETURNS TRIGGER AS $$
BEGIN
  -- If not service_role, ignore any attempts to change the balance
  IF current_setting('role', true) != 'service_role' THEN
    NEW.free_ai_uses_remaining := OLD.free_ai_uses_remaining;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_protect_free_ai_uses
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION protect_free_ai_uses();
