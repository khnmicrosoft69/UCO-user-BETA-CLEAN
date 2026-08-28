-- Migration: add google_id and picture columns to user_accounts
-- Run this once on your Supabase database.
-- Safe to run multiple times — uses IF NOT EXISTS.

ALTER TABLE user_accounts
  ADD COLUMN IF NOT EXISTS google_id TEXT,
  ADD COLUMN IF NOT EXISTS picture   TEXT;
