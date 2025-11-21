-- Create budget_accounts junction table for many-to-many relationship between budgets and accounts
CREATE TABLE budget_accounts (
    budget_id UUID NOT NULL REFERENCES budgets (id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
    PRIMARY KEY (budget_id, account_id)
);

CREATE INDEX idx_budget_accounts_budget ON budget_accounts (budget_id);

CREATE INDEX idx_budget_accounts_account ON budget_accounts (account_id);