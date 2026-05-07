-- ============================================================
-- Dynamis Currency Splitter v2 — Auth Migration
-- Run this once in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add user_id to each table
--    DEFAULT auth.uid() means Supabase automatically fills it
--    from the JWT on every insert — no need to pass it manually
--    (but we do pass it explicitly in db.js for clarity).

ALTER TABLE runs
  ADD COLUMN IF NOT EXISTS user_id UUID
  REFERENCES auth.users(id)
  DEFAULT auth.uid();

ALTER TABLE default_members
  ADD COLUMN IF NOT EXISTS user_id UUID
  REFERENCES auth.users(id)
  DEFAULT auth.uid();

ALTER TABLE guest_history
  ADD COLUMN IF NOT EXISTS user_id UUID
  REFERENCES auth.users(id)
  DEFAULT auth.uid();

-- 2. Enable Row Level Security
ALTER TABLE runs            ENABLE ROW LEVEL SECURITY;
ALTER TABLE default_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE guest_history   ENABLE ROW LEVEL SECURITY;

-- 3. Create policies — each user sees and manages only their own rows
CREATE POLICY "own_runs"
  ON runs FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "own_members"
  ON default_members FOR ALL
  USING (auth.uid() = user_id);

CREATE POLICY "own_guest_history"
  ON guest_history FOR ALL
  USING (auth.uid() = user_id);

-- ============================================================
-- STEP 2 — Claim existing data after re-registering
--
-- Run this AFTER you have created your new account via the
-- login page. The app stores usernames internally as
-- username@dynamissplit.com — so replace 'xavierre' below
-- with your actual username (lowercase).
--
-- This assigns all orphaned rows (user_id IS NULL) to your
-- new account so nothing is lost.
-- ============================================================

UPDATE runs
  SET user_id = (SELECT id FROM auth.users WHERE email = 'xavierre@dynamissplit.com')
  WHERE user_id IS NULL;

UPDATE default_members
  SET user_id = (SELECT id FROM auth.users WHERE email = 'xavierre@dynamissplit.com')
  WHERE user_id IS NULL;

UPDATE guest_history
  SET user_id = (SELECT id FROM auth.users WHERE email = 'xavierre@dynamissplit.com')
  WHERE user_id IS NULL;

-- ============================================================
-- STEP 3 — After confirming everything works, clean up the old
-- custom users table (it is no longer used):
--
--   DROP TABLE IF EXISTS users;
--
-- ============================================================

-- ============================================================
-- Supabase Dashboard settings to check:
--
--   Authentication → Providers → Email:
--   • "Confirm email" — disable this for a private app so
--     signups don't require email verification.
--
--   Authentication → URL Configuration:
--   • Set Site URL to your Vercel deployment URL.
-- ============================================================
