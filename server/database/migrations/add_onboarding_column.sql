-- Add has_onboarded column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS has_onboarded BOOLEAN DEFAULT FALSE;