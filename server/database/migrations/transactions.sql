-- CATEGORIES (Food, Rent, Groceries etc.)
CREATE TABLE categories (
    id              SERIAL PRIMARY KEY,
    parent_id       INT REFERENCES categories(id),
    name            TEXT NOT NULL,
    type            TEXT NOT NULL,    -- 'income' | 'expense' | 'transfer'
    is_system       BOOLEAN NOT NULL DEFAULT TRUE,
    display_order   INT,
    UNIQUE (name, type)
);

-- TRANSACTIONS
CREATE TABLE transactions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id          UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    external_tx_id      TEXT,                 -- provider's transaction id
    posted_at           TIMESTAMPTZ NOT NULL, -- booking date
    description         TEXT NOT NULL,
    amount              NUMERIC(18,2) NOT NULL,
    currency_code       CHAR(3) NOT NULL,
    direction           TEXT NOT NULL,        -- 'debit' | 'credit'
    category_id         INT REFERENCES categories(id),
    original_category   TEXT,
    merchant_name       TEXT,
    status              TEXT NOT NULL DEFAULT 'posted', -- posted | pending | reversed
    is_subscription     BOOLEAN DEFAULT FALSE,
    metadata            JSONB DEFAULT '{}'::jsonb,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (account_id, external_tx_id)
);

-- Helpful indexes
CREATE INDEX idx_transactions_account_date
    ON transactions (account_id, posted_at DESC);

CREATE INDEX idx_transactions_category
    ON transactions (category_id);