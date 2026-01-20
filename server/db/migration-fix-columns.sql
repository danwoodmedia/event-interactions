-- Migration: Fix column types and add missing columns
-- Run this in Supabase SQL Editor to fix database issues
-- Date: January 2026

-- ============================================
-- FIX 1: Add missing allow_multiple column to polls
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'allow_multiple'
  ) THEN
    ALTER TABLE polls ADD COLUMN allow_multiple BOOLEAN DEFAULT false;
  END IF;
END $$;

-- ============================================
-- FIX 2: Change session_id from UUID to VARCHAR in questions table
-- First drop foreign key constraint if it exists, then alter column
-- ============================================
DO $$
BEGIN
  -- Drop the foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'questions_session_id_fkey'
    AND table_name = 'questions'
  ) THEN
    ALTER TABLE questions DROP CONSTRAINT questions_session_id_fkey;
  END IF;

  -- Now change the column type if it's UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions'
    AND column_name = 'session_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE questions ALTER COLUMN session_id TYPE VARCHAR(255) USING session_id::VARCHAR(255);
  END IF;
END $$;

-- ============================================
-- FIX 3: Change session_id from UUID to VARCHAR in reactions table
-- First drop foreign key constraint if it exists, then alter column
-- ============================================
DO $$
BEGIN
  -- Drop the foreign key constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'reactions_session_id_fkey'
    AND table_name = 'reactions'
  ) THEN
    ALTER TABLE reactions DROP CONSTRAINT reactions_session_id_fkey;
  END IF;

  -- Now change the column type if it's UUID
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'reactions'
    AND column_name = 'session_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE reactions ALTER COLUMN session_id TYPE VARCHAR(255) USING session_id::VARCHAR(255);
  END IF;
END $$;

-- ============================================
-- FIX 4: Add missing position column to polls table
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'position'
  ) THEN
    ALTER TABLE polls ADD COLUMN position VARCHAR(50) DEFAULT 'center';
  END IF;
END $$;

-- ============================================
-- FIX 5: Add missing size column to polls table
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'polls' AND column_name = 'size'
  ) THEN
    ALTER TABLE polls ADD COLUMN size VARCHAR(20) DEFAULT 'medium';
  END IF;
END $$;

-- ============================================
-- Verify the fixes
-- ============================================
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name IN ('polls', 'questions', 'reactions')
  AND column_name IN ('allow_multiple', 'session_id', 'position', 'size')
ORDER BY table_name, column_name;
