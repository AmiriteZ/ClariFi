-- Add optional income and savings fields to budgets table
ALTER TABLE budgets ADD COLUMN income_amount NUMERIC(18, 2);

ALTER TABLE budgets ADD COLUMN savings_target_amount NUMERIC(18, 2);

ALTER TABLE budgets
ADD COLUMN savings_target_type TEXT CHECK (
    savings_target_type IN ('amount', 'percentage')
);