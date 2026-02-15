ALTER TABLE transactions
ADD COLUMN is_hidden_from_household BOOLEAN DEFAULT FALSE;