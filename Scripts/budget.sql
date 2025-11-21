-- BUDGET HEADER
CREATE TABLE budgets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    household_id UUID NOT NULL REFERENCES households (id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    period_type TEXT NOT NULL DEFAULT 'monthly', -- monthly | weekly | custom
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    currency_code CHAR(3) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CATEGORY-LEVEL BUDGET LINES
CREATE TABLE budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    budget_id UUID NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
    category_id INT NOT NULL REFERENCES categories (id),
    limit_amount NUMERIC(18, 2) NOT NULL,
    notes TEXT,
    UNIQUE (budget_id, category_id)
);

CREATE INDEX idx_budget_items_budget ON budget_items (budget_id);

-- 1) Add user_id column (temporarily nullable so we don't break existing rows)
ALTER TABLE budgets ADD COLUMN user_id UUID;

-- 2) Make household_id nullable instead of NOT NULL
ALTER TABLE budgets ALTER COLUMN household_id DROP NOT NULL;

-- 3) Backfill user_id for existing budgets (DEV OPTION)
-- If you don't have real data yet, you can skip this or manually set some user.
-- Example: set all existing budgets to belong to a specific user:
UPDATE budgets
SET
    user_id = u.id
FROM users u
WHERE
    budgets.user_id IS NULL;
-- add a WHERE here to pick a specific user if you like

-- 4) Now enforce NOT NULL on user_id
ALTER TABLE budgets ALTER COLUMN user_id SET NOT NULL;

-- 5) Add the FK to users
ALTER TABLE budgets
ADD CONSTRAINT budgets_user_id_fkey FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;