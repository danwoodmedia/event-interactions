-- Event Interactions Database Schema
-- Run this in Supabase SQL Editor to create all required tables
-- Based on PRD Section 7.2 (Core Tables)

-- ============================================
-- ORGANIZATIONS
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  data_retention_days INTEGER DEFAULT 90,
  branding_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- USERS (synced from Supabase Auth)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ORGANIZATION MEMBERSHIPS
-- ============================================
CREATE TABLE IF NOT EXISTS org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL CHECK (role IN ('owner', 'admin', 'producer', 'avtech')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

-- ============================================
-- EVENTS
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'live', 'ended')),
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  widgets_enabled JSONB DEFAULT '["reactions", "polls", "qa"]',
  avtech_password VARCHAR(100) DEFAULT '0000',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for finding events by slug
CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);

-- ============================================
-- DISPLAYS
-- ============================================
CREATE TABLE IF NOT EXISTS displays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  output_mode VARCHAR(50) DEFAULT 'transparent' CHECK (output_mode IN ('transparent', 'chroma')),
  chroma_color VARCHAR(7) DEFAULT '#00FF00',
  resolution VARCHAR(20) DEFAULT '1920x1080',
  widget_layout JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_displays_event ON displays(event_id);

-- ============================================
-- AUDIENCE SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS audience_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_token VARCHAR(255) UNIQUE NOT NULL,
  nickname VARCHAR(100),
  email VARCHAR(255),
  ip_address INET,
  user_agent TEXT,
  connected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  disconnected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_event ON audience_sessions(event_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON audience_sessions(session_token);

-- ============================================
-- POLLS
-- ============================================
CREATE TABLE IF NOT EXISTS polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'ready' CHECK (status IN ('ready', 'live', 'closed')),
  allow_change BOOLEAN DEFAULT false,
  allow_multiple BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT false,
  duration_seconds INTEGER,
  correct_option_id UUID, -- For quiz mode
  position VARCHAR(50) DEFAULT 'center',
  size VARCHAR(20) DEFAULT 'medium',
  opened_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_polls_event ON polls(event_id);
CREATE INDEX IF NOT EXISTS idx_polls_status ON polls(status);

-- ============================================
-- POLL OPTIONS
-- ============================================
CREATE TABLE IF NOT EXISTS poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  text VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_poll_options_poll ON poll_options(poll_id);

-- ============================================
-- POLL VOTES
-- Supports both single-select and multi-select polls
-- For single-select: one row per (poll_id, session_id)
-- For multi-select: multiple rows per (poll_id, session_id)
-- ============================================
CREATE TABLE IF NOT EXISTS poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  -- Composite unique constraint allows multi-select (multiple options per session)
  -- but prevents duplicate votes for the same option
  UNIQUE(poll_id, session_id, option_id)
);

CREATE INDEX IF NOT EXISTS idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX IF NOT EXISTS idx_poll_votes_session ON poll_votes(session_id);

-- ============================================
-- POLL BUNDLES (for sequential polling)
-- ============================================
CREATE TABLE IF NOT EXISTS poll_bundles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'ready' CHECK (status IN ('ready', 'active', 'completed')),
  current_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bundles_event ON poll_bundles(event_id);

-- ============================================
-- BUNDLE POLLS (linking polls to bundles)
-- ============================================
CREATE TABLE IF NOT EXISTS bundle_polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID REFERENCES poll_bundles(id) ON DELETE CASCADE,
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(bundle_id, poll_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_polls_bundle ON bundle_polls(bundle_id);

-- ============================================
-- QUESTIONS (Q&A)
-- ============================================
CREATE TABLE IF NOT EXISTS questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  text TEXT NOT NULL,
  submitter_name VARCHAR(100) DEFAULT 'Anonymous',
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'featured', 'answered')),
  upvotes INTEGER DEFAULT 0,
  featured_at TIMESTAMP WITH TIME ZONE,
  answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_event ON questions(event_id);
CREATE INDEX IF NOT EXISTS idx_questions_status ON questions(status);

-- ============================================
-- REACTIONS (for analytics only, not real-time)
-- ============================================
CREATE TABLE IF NOT EXISTS reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  emoji VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_reactions_event_created ON reactions(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reactions_event_emoji ON reactions(event_id, emoji);

-- ============================================
-- EMOJI PACKS
-- ============================================
CREATE TABLE IF NOT EXISTS emoji_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  emojis JSONB NOT NULL DEFAULT '[]', -- Array of emoji strings or objects with custom images
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emoji_packs_event ON emoji_packs(event_id);

-- ============================================
-- EVENT SETTINGS (widget configurations)
-- ============================================
CREATE TABLE IF NOT EXISTS event_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE UNIQUE,
  emoji_enabled BOOLEAN DEFAULT true,
  emoji_max_on_screen INTEGER DEFAULT 30,
  emoji_size VARCHAR(20) DEFAULT 'medium',
  emoji_speed VARCHAR(20) DEFAULT 'normal',
  emoji_spawn_direction VARCHAR(20) DEFAULT 'up',
  emoji_spawn_position VARCHAR(20) DEFAULT 'wide',
  qa_enabled BOOLEAN DEFAULT true,
  poll_position VARCHAR(50) DEFAULT 'center',
  poll_size VARCHAR(20) DEFAULT 'medium',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_settings_event ON event_settings(event_id);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at trigger to tables that have it
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_displays_updated_at ON displays;
CREATE TRIGGER update_displays_updated_at
  BEFORE UPDATE ON displays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_polls_updated_at ON polls;
CREATE TRIGGER update_polls_updated_at
  BEFORE UPDATE ON polls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_poll_bundles_updated_at ON poll_bundles;
CREATE TRIGGER update_poll_bundles_updated_at
  BEFORE UPDATE ON poll_bundles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_emoji_packs_updated_at ON emoji_packs;
CREATE TRIGGER update_emoji_packs_updated_at
  BEFORE UPDATE ON emoji_packs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_event_settings_updated_at ON event_settings;
CREATE TRIGGER update_event_settings_updated_at
  BEFORE UPDATE ON event_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enable RLS on all tables
-- ============================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bundle_polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE emoji_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- SERVICE ROLE POLICIES
-- Allow service role full access (for server-side operations)
-- Drop existing policies first to avoid conflicts
-- ============================================

-- Organizations
DROP POLICY IF EXISTS "Service role has full access to organizations" ON organizations;
CREATE POLICY "Service role has full access to organizations"
  ON organizations FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Users
DROP POLICY IF EXISTS "Service role has full access to users" ON users;
CREATE POLICY "Service role has full access to users"
  ON users FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Org Memberships
DROP POLICY IF EXISTS "Service role has full access to org_memberships" ON org_memberships;
CREATE POLICY "Service role has full access to org_memberships"
  ON org_memberships FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Events
DROP POLICY IF EXISTS "Service role has full access to events" ON events;
CREATE POLICY "Service role has full access to events"
  ON events FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Displays
DROP POLICY IF EXISTS "Service role has full access to displays" ON displays;
CREATE POLICY "Service role has full access to displays"
  ON displays FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Audience Sessions
DROP POLICY IF EXISTS "Service role has full access to audience_sessions" ON audience_sessions;
CREATE POLICY "Service role has full access to audience_sessions"
  ON audience_sessions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Polls
DROP POLICY IF EXISTS "Service role has full access to polls" ON polls;
CREATE POLICY "Service role has full access to polls"
  ON polls FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Poll Options
DROP POLICY IF EXISTS "Service role has full access to poll_options" ON poll_options;
CREATE POLICY "Service role has full access to poll_options"
  ON poll_options FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Poll Votes
DROP POLICY IF EXISTS "Service role has full access to poll_votes" ON poll_votes;
CREATE POLICY "Service role has full access to poll_votes"
  ON poll_votes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Poll Bundles
DROP POLICY IF EXISTS "Service role has full access to poll_bundles" ON poll_bundles;
CREATE POLICY "Service role has full access to poll_bundles"
  ON poll_bundles FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Bundle Polls
DROP POLICY IF EXISTS "Service role has full access to bundle_polls" ON bundle_polls;
CREATE POLICY "Service role has full access to bundle_polls"
  ON bundle_polls FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Questions
DROP POLICY IF EXISTS "Service role has full access to questions" ON questions;
CREATE POLICY "Service role has full access to questions"
  ON questions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Reactions
DROP POLICY IF EXISTS "Service role has full access to reactions" ON reactions;
CREATE POLICY "Service role has full access to reactions"
  ON reactions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Emoji Packs
DROP POLICY IF EXISTS "Service role has full access to emoji_packs" ON emoji_packs;
CREATE POLICY "Service role has full access to emoji_packs"
  ON emoji_packs FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Event Settings
DROP POLICY IF EXISTS "Service role has full access to event_settings" ON event_settings;
CREATE POLICY "Service role has full access to event_settings"
  ON event_settings FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ============================================
-- SEED DATA: Create default organization and event
-- ============================================

-- Insert default organization
INSERT INTO organizations (id, name, subscription_tier)
VALUES ('00000000-0000-0000-0000-000000000001', 'Default Organization', 'free')
ON CONFLICT DO NOTHING;

-- Insert default event (matches current 'default' eventId in code)
INSERT INTO events (id, organization_id, name, slug, status, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Default Event',
  'default',
  'live',
  '{}'::jsonb
)
ON CONFLICT DO NOTHING;

-- Insert default event settings
INSERT INTO event_settings (event_id)
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant usage on schema to authenticated and anon roles
GRANT USAGE ON SCHEMA public TO authenticated, anon;

-- Grant select on all tables to authenticated users
GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant insert/update/delete on specific tables to authenticated users
GRANT INSERT, UPDATE, DELETE ON polls, poll_options, poll_votes, questions, reactions, emoji_packs, event_settings TO authenticated;

-- Service role already has full access via policies
