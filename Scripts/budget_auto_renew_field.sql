-- Add auto_renew field to budgets table
ALTER TABLE budgets
ADD COLUMN auto_renew BOOLEAN NOT NULL DEFAULT FALSE;