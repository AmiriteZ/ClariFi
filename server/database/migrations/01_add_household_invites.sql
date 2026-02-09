-- 1. Add invite code and toggle to households
ALTER TABLE households
ADD COLUMN invite_code TEXT UNIQUE,
ADD COLUMN is_invite_enabled BOOLEAN DEFAULT TRUE;

-- 2. Add status to members (if not already present or needs update)
ALTER TABLE household_members
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
-- ensure status can be 'active', 'pending_approval', 'invited'

-- 3. Function to generate random 6-char code (A-Z, 0-9)
CREATE OR REPLACE FUNCTION generate_invite_code() RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  result TEXT := '';
  i INTEGER := 0;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 4. Automatically assign code on insert
CREATE OR REPLACE FUNCTION set_household_invite_code() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invite_code IS NULL THEN
    NEW.invite_code := generate_invite_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_household_invite_code ON households;

CREATE TRIGGER trg_set_household_invite_code
BEFORE INSERT ON households
FOR EACH ROW
EXECUTE FUNCTION set_household_invite_code();