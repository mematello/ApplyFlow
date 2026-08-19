-- Migration 0014: System Alerts and Blocks

-- 1. Drop existing void function
DROP FUNCTION IF EXISTS block_model(TEXT, TIMESTAMPTZ);

-- Recreate to return boolean
CREATE OR REPLACE FUNCTION block_model(p_model_name TEXT, p_blocked_until TIMESTAMPTZ)
RETURNS boolean AS $$
DECLARE
  v_old_blocked_until TIMESTAMPTZ;
BEGIN
  -- Check existing blocked_until
  SELECT blocked_until INTO v_old_blocked_until 
  FROM ai_model_usage 
  WHERE model_name = p_model_name AND date = CURRENT_DATE;
  
  -- If it's already blocked beyond or equal to requested time, return false
  IF v_old_blocked_until IS NOT NULL AND v_old_blocked_until >= p_blocked_until THEN
    RETURN false;
  END IF;

  -- Otherwise, apply the block and return true
  INSERT INTO ai_model_usage (model_name, date, request_count, blocked_until)
  VALUES (p_model_name, CURRENT_DATE, 0, p_blocked_until)
  ON CONFLICT (model_name, date)
  DO UPDATE SET blocked_until = p_blocked_until;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create system tables for exhaustion alerts
CREATE TABLE system_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Explicit RLS: Deny all client access
ALTER TABLE system_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE system_alerts_state (
  alert_type TEXT PRIMARY KEY,
  last_alert_sent_at TIMESTAMPTZ
);
-- Explicit RLS: Deny all client access
ALTER TABLE system_alerts_state ENABLE ROW LEVEL SECURITY;

-- Seed initial row so FOR UPDATE lock has a target
INSERT INTO system_alerts_state (alert_type, last_alert_sent_at) 
VALUES ('EXHAUSTION', '1970-01-01'::timestamptz);

-- 3. Create RPC for exhaustion counting
CREATE OR REPLACE FUNCTION record_exhaustion_event()
RETURNS boolean AS $$
DECLARE
  v_last_alert TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- 1. Log event
  INSERT INTO system_events (event_type) VALUES ('EXHAUSTION');
  
  -- 2. Cleanup old events
  DELETE FROM system_events WHERE created_at < NOW() - INTERVAL '48 hours';
  
  -- 3. Atomic lock on alert state
  SELECT last_alert_sent_at INTO v_last_alert 
  FROM system_alerts_state 
  WHERE alert_type = 'EXHAUSTION' 
  FOR UPDATE;
  
  -- 4. Suppression check (within 1 hour)
  IF v_last_alert IS NOT NULL AND v_last_alert >= NOW() - INTERVAL '1 hour' THEN
    RETURN false;
  END IF;
  
  -- 5. Count events in the sliding window
  SELECT count(*) INTO v_count 
  FROM system_events 
  WHERE event_type = 'EXHAUSTION' AND created_at >= NOW() - INTERVAL '1 hour';
  
  -- 6. Check threshold
  IF v_count >= 3 THEN
    UPDATE system_alerts_state SET last_alert_sent_at = NOW() WHERE alert_type = 'EXHAUSTION';
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
