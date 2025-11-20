-- BANK / INSTITUTION CATALOG
CREATE TABLE institutions (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    country_code    CHAR(2),
    provider_code   TEXT,                -- e.g. 'AIB_IE', 'AIB_UK'
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- USER'S OPEN BANKING CONNECTION (Yapily etc.)
CREATE TABLE bank_connections (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id      INT NOT NULL REFERENCES institutions(id),
    provider            TEXT NOT NULL,   -- 'yapily', 'sandbox', etc.
    external_id         TEXT NOT NULL,   -- consent/login id from provider
    status              TEXT NOT NULL DEFAULT 'active', -- active | expired | revoked
    consent_expires_at  TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ACCOUNTS (current, savings, credit card, etc.)
CREATE TABLE accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_connection_id  UUID NOT NULL REFERENCES bank_connections(id) ON DELETE CASCADE,
    household_id        UUID REFERENCES households(id),

    -- Safe identifiers
    external_account_id TEXT NOT NULL,     -- from provider (not sensitive)
    name                TEXT NOT NULL,     -- e.g. "Current Account"
    account_type        TEXT,              -- current, savings, credit_card, loan
    currency_code       CHAR(3) NOT NULL,  -- EUR, GBP, etc.

    -- Non-sensitive display info
    masked_account_ref  TEXT,              -- e.g. ****1234

    -- Balances
    current_balance     NUMERIC(18,2),
    available_balance   NUMERIC(18,2),
    last_synced_at      TIMESTAMPTZ,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    UNIQUE (bank_connection_id, external_account_id)
);
