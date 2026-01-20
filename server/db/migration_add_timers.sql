-- Migration: Add timers table for countdown/stopwatch persistence
-- Run this in Supabase SQL Editor

-- ============================================
-- TIMERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS timers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('countdown', 'stopwatch')),
  duration_ms BIGINT DEFAULT 0,              -- Duration in milliseconds (for countdown)
  status VARCHAR(20) DEFAULT 'ready' CHECK (status IN ('ready', 'running', 'paused', 'finished')),
  started_at TIMESTAMP WITH TIME ZONE,       -- When timer was started
  paused_elapsed_ms BIGINT DEFAULT 0,        -- Milliseconds elapsed when paused
  show_on_display BOOLEAN DEFAULT false,
  position VARCHAR(50) DEFAULT 'center',
  size VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_timers_event ON timers(event_id);
CREATE INDEX IF NOT EXISTS idx_timers_status ON timers(status);

-- Enable RLS
ALTER TABLE timers ENABLE ROW LEVEL SECURITY;

-- Service role policy
DROP POLICY IF EXISTS "Service role has full access to timers" ON timers;
CREATE POLICY "Service role has full access to timers"
  ON timers FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Updated at trigger
DROP TRIGGER IF EXISTS update_timers_updated_at ON timers;
CREATE TRIGGER update_timers_updated_at
  BEFORE UPDATE ON timers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON timers TO authenticated;
