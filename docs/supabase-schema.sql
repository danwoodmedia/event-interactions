-- Event Interactions Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ORGANIZATIONS
-- ============================================================================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  data_retention_days INTEGER DEFAULT 90,
  branding_config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- USERS
-- ============================================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ORGANIZATION MEMBERSHIPS
-- ============================================================================

CREATE TABLE org_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL, -- 'admin', 'producer', 'tech'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(organization_id, user_id)
);

CREATE INDEX idx_org_memberships_org ON org_memberships(organization_id);
CREATE INDEX idx_org_memberships_user ON org_memberships(user_id);

-- ============================================================================
-- EVENTS
-- ============================================================================

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'live', 'ended'
  scheduled_start TIMESTAMP WITH TIME ZONE,
  scheduled_end TIMESTAMP WITH TIME ZONE,
  settings JSONB DEFAULT '{}',
  widgets_enabled JSONB DEFAULT '["reactions", "polls", "qa", "timer"]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_org ON events(organization_id);
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);

-- ============================================================================
-- DISPLAYS
-- ============================================================================

CREATE TABLE displays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  output_mode VARCHAR(50) DEFAULT 'transparent', -- 'transparent', 'chroma'
  chroma_color VARCHAR(7) DEFAULT '#00FF00',
  resolution VARCHAR(20) DEFAULT '1920x1080',
  widget_layout JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_displays_event ON displays(event_id);

-- ============================================================================
-- AUDIENCE SESSIONS
-- ============================================================================

CREATE TABLE audience_sessions (
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

CREATE INDEX idx_audience_sessions_event ON audience_sessions(event_id);
CREATE INDEX idx_audience_sessions_token ON audience_sessions(session_token);

-- ============================================================================
-- REACTIONS (for analytics, not real-time)
-- ============================================================================

CREATE TABLE reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES audience_sessions(id) ON DELETE SET NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reactions_event_created ON reactions(event_id, created_at);
CREATE INDEX idx_reactions_event_emoji ON reactions(event_id, emoji);

-- ============================================================================
-- POLLS
-- ============================================================================

CREATE TABLE polls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'open', 'closed'
  allow_change BOOLEAN DEFAULT false,
  show_results BOOLEAN DEFAULT false,
  duration_seconds INTEGER,
  opened_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_polls_event ON polls(event_id);

CREATE TABLE poll_options (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  text VARCHAR(255) NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_poll_options_poll ON poll_options(poll_id);

CREATE TABLE poll_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id UUID REFERENCES polls(id) ON DELETE CASCADE,
  option_id UUID REFERENCES poll_options(id) ON DELETE CASCADE,
  session_id UUID REFERENCES audience_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(poll_id, session_id) -- One vote per session per poll
);

CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_option ON poll_votes(option_id);

-- ============================================================================
-- QUESTIONS (Q&A)
-- ============================================================================

CREATE TABLE questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES audience_sessions(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  submitter_name VARCHAR(100),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'featured', 'answered'
  upvotes INTEGER DEFAULT 0,
  featured_at TIMESTAMP WITH TIME ZONE,
  answered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_questions_event ON questions(event_id);
CREATE INDEX idx_questions_status ON questions(status);
CREATE INDEX idx_questions_event_created ON questions(event_id, created_at);

-- ============================================================================
-- SOCIAL SUBMISSIONS (for Fast Follow phase)
-- ============================================================================

CREATE TABLE social_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES audience_sessions(id) ON DELETE SET NULL,
  text TEXT NOT NULL,
  submitter_name VARCHAR(100),
  image_url VARCHAR(500),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'approved', 'rejected', 'featured'
  featured_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_social_submissions_event ON social_submissions(event_id);
CREATE INDEX idx_social_submissions_status ON social_submissions(status);

-- ============================================================================
-- QUIZZES (for Fast Follow phase)
-- ============================================================================

CREATE TABLE quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'active', 'ended'
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quizzes_event ON quizzes(event_id);

CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES quizzes(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  correct_option INTEGER NOT NULL,
  duration_seconds INTEGER DEFAULT 30,
  points INTEGER DEFAULT 100,
  sort_order INTEGER DEFAULT 0,
  options JSONB NOT NULL, -- Array of option texts
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_quiz_questions_quiz ON quiz_questions(quiz_id);

CREATE TABLE quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID REFERENCES quiz_questions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES audience_sessions(id) ON DELETE CASCADE,
  selected_option INTEGER NOT NULL,
  is_correct BOOLEAN NOT NULL,
  points_earned INTEGER DEFAULT 0,
  answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(question_id, session_id)
);

CREATE INDEX idx_quiz_answers_question ON quiz_answers(question_id);
CREATE INDEX idx_quiz_answers_session ON quiz_answers(session_id);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update_updated_at trigger to relevant tables
CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_displays_updated_at BEFORE UPDATE ON displays
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Enable but policies added later
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE displays ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_answers ENABLE ROW LEVEL SECURITY;

-- Temporary: Allow service role full access (we'll add proper policies later)
-- This allows your backend to work immediately

CREATE POLICY "Service role has full access" ON organizations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON users
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON org_memberships
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON events
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON displays
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON audience_sessions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON reactions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON polls
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON poll_options
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON poll_votes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON social_submissions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON quizzes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON quiz_questions
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Service role has full access" ON quiz_answers
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================================
-- INITIAL DATA (optional)
-- ============================================================================

-- You can add initial test data here if needed
