-- SAVINGS / DEBT GOALS
CREATE TABLE goals (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    target_amount   NUMERIC(18,2) NOT NULL,
    currency_code   CHAR(3) NOT NULL,
    target_date     DATE,
    category_id     INT REFERENCES categories(id),
    status          TEXT NOT NULL DEFAULT 'active', -- active | paused | completed | cancelled
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- LINK TRANSACTIONS OR MANUAL TOP-UPS TO GOALS
CREATE TABLE goal_contributions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id         UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    transaction_id  UUID REFERENCES transactions(id),
    amount          NUMERIC(18,2) NOT NULL,
    contributed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    notes           TEXT
);

CREATE INDEX idx_goal_contributions_goal
    ON goal_contributions (goal_id);


SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;


-- 1) Add a user_id column to goals (owner of the goal)
ALTER TABLE goals
ADD COLUMN user_id UUID REFERENCES users(id);

-- 2) Drop the NOT NULL on household_id (so goals can be personal-only)
ALTER TABLE goals
ALTER COLUMN household_id DROP NOT NULL;

-- 3) For any existing goals, if you have them, you can backfill user_id.
-- If you have no data yet, you can skip this part or run with a dummy.
-- Example (optional), if early goals were household-only and
-- you want to attribute them to the household creator:
UPDATE goals g
SET user_id = h.created_by
FROM households h
WHERE g.household_id = h.id
  AND g.user_id IS NULL;

-- 4) Make user_id required (we always know who owns the goal)
ALTER TABLE goals
ALTER COLUMN user_id SET NOT NULL;

-- 5) add is favourite for main goal
ALTER TABLE goals
ADD COLUMN is_favourite BOOLEAN NOT NULL DEFAULT FALSE;

-- Optional but nice for performance later:
CREATE INDEX idx_goals_user_favourite
  ON goals (user_id, is_favourite)
  WHERE is_favourite = TRUE;