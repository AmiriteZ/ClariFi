-- Add photo_url column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_url TEXT;