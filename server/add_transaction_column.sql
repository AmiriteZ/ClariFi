-- Add external_transaction_id column to transactions table
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(255);

-- Create unique index to prevent duplicate transactions
CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_id ON transactions (
    account_id,
    external_transaction_id
);

-- Display the structure of the transactions table
SELECT column_name, data_type
FROM information_schema.columns
WHERE
    table_name = 'transactions'
ORDER BY ordinal_position;