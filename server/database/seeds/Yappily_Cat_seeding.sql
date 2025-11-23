BEGIN;

-- Map Yapily's raw category label -> your internal categories.id
-- Example Yapily labels (consumer incoming/outgoing):
--  - "groceries"
--  - "food and drink"
--  - "public transport"
--  - "vehicle maintenance"
--  - "benefits"
--  - "ecommerce"
--  - "loans"
--  - "intra account transfer"
--  etc.  (see Yapily docs)
-- We will always store them in lowercase for consistency.

CREATE TABLE IF NOT EXISTS yapily_category_map (
    source_category TEXT PRIMARY KEY, -- e.g. 'groceries', 'public transport'
    internal_category_id INT NOT NULL REFERENCES categories (id) ON DELETE RESTRICT,
    notes TEXT
);

COMMIT;

BEGIN;

-- =========================
-- INCOMING / INCOME MAPPINGS
-- =========================

-- Government benefits / refunds → Benefits & Refunds (income)
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'benefits',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Benefits & Refunds'
                AND type = 'income'
        ),
        'Government/employer benefits → Benefits & Refunds (income)'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- Cashback / chargeback → Other Income
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'cashback',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Other Income'
                AND type = 'income'
        ),
        'Cashback treated as Other Income'
    ),
    (
        'chargeback',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Other Income'
                AND type = 'income'
        ),
        'Chargeback refunds treated as Other Income'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- Generic ATM / bank deposit → Other Income (can refine later)
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'atm/bank deposit',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Other Income'
                AND type = 'income'
        ),
        'Generic deposit treated as Other Income; you can refine later using description/metadata'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- =========================
-- OUTGOING / EXPENSE MAPPINGS
-- =========================

-- Food-related
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'groceries',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Groceries'
                AND type = 'expense'
        ),
        'Groceries → Groceries (Food & Groceries group)'
    ),
    (
        'food and drink',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Eating Out'
                AND type = 'expense'
        ),
        'Restaurants / cafes → Eating Out'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- Transport-related
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'public transport',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Public Transport'
                AND type = 'expense'
        ),
        'Buses / trains → Public Transport'
    ),
    (
        'vehicle maintenance',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Vehicle Maintenance'
                AND type = 'expense'
        ),
        'Repairs / servicing → Vehicle Maintenance'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- Ecommerce spending → Shopping & Lifestyle
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'ecommerce',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Shopping & Lifestyle'
                AND type = 'expense'
        ),
        'Online shopping → Shopping & Lifestyle'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- Loan / debt repayments → Loan Payments (expense)
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'loans',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Loan Payments'
                AND type = 'expense'
        ),
        'Loan/debt repayments → Loan Payments'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- Not enough info → Uncategorised Expense
INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'not enough information',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Uncategorised Expense'
                AND type = 'expense'
        ),
        'Fallback when Yapily cannot determine category'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

-- =========================
-- TRANSFER-TYPE MAPPINGS
-- =========================

INSERT INTO
    yapily_category_map (
        source_category,
        internal_category_id,
        notes
    )
VALUES (
        'intra account transfer',
        (
            SELECT id
            FROM categories
            WHERE
                name = 'Between Own Accounts'
                AND type = 'transfer'
        ),
        'Transfers between own accounts'
    ) ON CONFLICT (source_category) DO
UPDATE
SET
    internal_category_id = EXCLUDED.internal_category_id,
    notes = EXCLUDED.notes;

COMMIT;