-- Add budget archiving columns
ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

ALTER TABLE budgets ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP;

ALTER TABLE budgets
ADD COLUMN IF NOT EXISTS parent_budget_id UUID REFERENCES budgets (id);

-- Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_budgets_status ON budgets (status);

CREATE INDEX IF NOT EXISTS idx_budgets_user_status ON budgets (user_id, status);

-- Update existing budgets to have active status
UPDATE budgets SET status = 'active' WHERE status IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN budgets.status IS 'Budget status: active, completed, or archived';

COMMENT ON COLUMN budgets.archived_at IS 'Timestamp when budget was archived';

COMMENT ON COLUMN budgets.parent_budget_id IS 'Links to previous period budget for tracking lineage';