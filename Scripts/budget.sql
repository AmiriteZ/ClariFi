-- BUDGET HEADER
CREATE TABLE budgets (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    period_type     TEXT NOT NULL DEFAULT 'monthly', -- monthly | weekly | custom
    period_start    DATE NOT NULL,
    period_end      DATE NOT NULL,
    currency_code   CHAR(3) NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CATEGORY-LEVEL BUDGET LINES
CREATE TABLE budget_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    budget_id       UUID NOT NULL REFERENCES budgets(id) ON DELETE CASCADE,
    category_id     INT NOT NULL REFERENCES categories(id),
    limit_amount    NUMERIC(18,2) NOT NULL,
    notes           TEXT,
    UNIQUE (budget_id, category_id)
);

CREATE INDEX idx_budget_items_budget
    ON budget_items (budget_id);
