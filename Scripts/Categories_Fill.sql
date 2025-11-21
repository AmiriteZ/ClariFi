BEGIN;

----------------------------------------------------------------------
-- 1) BACKUP EXISTING CATEGORIES (RUN ONCE / SAFE TO KEEP)
----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories_backup AS
SELECT *
FROM categories;

----------------------------------------------------------------------
-- 2) UPSERT CANONICAL CATEGORY SET
--    This keeps IDs the same but fixes names / parent_ids / type.
--    is_system is forced TRUE for these built-in categories.
----------------------------------------------------------------------

INSERT INTO
    categories (
        id,
        name,
        type,
        parent_id,
        is_system
    )
VALUES
    -- TOP-LEVEL EXPENSE GROUPS
    (
        8,
        'Housing & Utilities',
        'expense',
        NULL,
        TRUE
    ),
    (
        9,
        'Food & Groceries',
        'expense',
        NULL,
        TRUE
    ),
    (
        10,
        'Transport',
        'expense',
        NULL,
        TRUE
    ),
    (
        11,
        'Bills & Subscriptions',
        'expense',
        NULL,
        TRUE
    ),
    (
        12,
        'Shopping & Lifestyle',
        'expense',
        NULL,
        TRUE
    ),
    (
        13,
        'Health & Wellness',
        'expense',
        NULL,
        TRUE
    ),
    (
        14,
        'Entertainment & Leisure',
        'expense',
        NULL,
        TRUE
    ),
    (
        15,
        'Family & Children',
        'expense',
        NULL,
        TRUE
    ),
    (
        16,
        'Financial & Fees',
        'expense',
        NULL,
        TRUE
    ),
    (
        17,
        'Other Expenses',
        'expense',
        NULL,
        TRUE
    ),

-- HOUSING & UTILITIES (parent 8)
(
    18,
    'Rent / Mortgage',
    'expense',
    8,
    TRUE
),
(
    19,
    'Electricity',
    'expense',
    8,
    TRUE
),
(
    20,
    'Gas / Heating',
    'expense',
    8,
    TRUE
),
(
    21,
    'Water / Waste',
    'expense',
    8,
    TRUE
),
(
    22,
    'Internet',
    'expense',
    8,
    TRUE
),
(
    23,
    'Home Insurance',
    'expense',
    8,
    TRUE
),

-- FOOD & GROCERIES (parent 9)
(
    24,
    'Groceries',
    'expense',
    9,
    TRUE
),
(
    25,
    'Eating Out',
    'expense',
    9,
    TRUE
),
(
    26,
    'Coffee / Snacks',
    'expense',
    9,
    TRUE
),
(
    27,
    'Takeaway / Delivery',
    'expense',
    9,
    TRUE
),

-- TRANSPORT (parent 10)
(
    28,
    'Fuel',
    'expense',
    10,
    TRUE
),
(
    29,
    'Public Transport',
    'expense',
    10,
    TRUE
),
(
    30,
    'Taxi / Rideshare',
    'expense',
    10,
    TRUE
),
(
    31,
    'Parking / Tolls',
    'expense',
    10,
    TRUE
),
(
    32,
    'Vehicle Maintenance',
    'expense',
    10,
    TRUE
),

-- BILLS & SUBSCRIPTIONS (parent 11)
(
    33,
    'Mobile Phone',
    'expense',
    11,
    TRUE
),
(
    34,
    'Streaming Services',
    'expense',
    11,
    TRUE
),
(
    35,
    'Software / Apps',
    'expense',
    11,
    TRUE
),
(
    36,
    'Gym / Memberships',
    'expense',
    11,
    TRUE
),

-- SHOPPING & LIFESTYLE (parent 12)
(
    37,
    'Insurance (Non-Home)',
    'expense',
    12,
    TRUE
),
(
    38,
    'Clothing & Shoes',
    'expense',
    12,
    TRUE
),
(
    39,
    'Electronics & Gadgets',
    'expense',
    12,
    TRUE
),
(
    40,
    'Home & Furniture',
    'expense',
    12,
    TRUE
),
(
    41,
    'Beauty & Personal Care',
    'expense',
    12,
    TRUE
),
(
    42,
    'Gifts & Donations',
    'expense',
    12,
    TRUE
),

-- HEALTH & WELLNESS (parent 13)
(
    43,
    'Medical & Pharmacy',
    'expense',
    13,
    TRUE
),
(
    44,
    'Health Insurance',
    'expense',
    13,
    TRUE
),
(
    45,
    'Mental Health',
    'expense',
    13,
    TRUE
),

-- ENTERTAINMENT & LEISURE (parent 14)
(
    46,
    'Cinema / Events',
    'expense',
    14,
    TRUE
),
(
    47,
    'Hobbies & Activities',
    'expense',
    14,
    TRUE
),
(
    48,
    'Holidays & Travel',
    'expense',
    14,
    TRUE
),

-- FAMILY & CHILDREN (parent 15)
(
    49,
    'Childcare',
    'expense',
    15,
    TRUE
),
(
    50,
    'School & Education',
    'expense',
    15,
    TRUE
),
(
    51,
    'Pet Care',
    'expense',
    15,
    TRUE
),

-- FINANCIAL & FEES (parent 16)
(
    52,
    'Bank Fees & Charges',
    'expense',
    16,
    TRUE
),
(
    53,
    'Loan Payments',
    'expense',
    16,
    TRUE
),
(
    54,
    'Credit Card Payments',
    'expense',
    16,
    TRUE
),
(
    55,
    'Taxes Paid',
    'expense',
    16,
    TRUE
),

-- OTHER EXPENSES (parent 17)
( 56, 'Uncategorised Expense', 'expense', 17, TRUE ),

-- INCOME GROUPS
(
    57,
    'Salary & Wages',
    'income',
    NULL,
    TRUE
),
(
    58,
    'Benefits & Refunds',
    'income',
    NULL,
    TRUE
),
(
    59,
    'Other Income',
    'income',
    NULL,
    TRUE
),

-- INCOME CHILDREN
(
    60,
    'Primary Salary',
    'income',
    57,
    TRUE
),
(
    61,
    'Bonus / Commission',
    'income',
    57,
    TRUE
),
(
    62,
    'Government Benefits',
    'income',
    58,
    TRUE
),
(
    63,
    'Tax Refunds',
    'income',
    58,
    TRUE
),
(
    64,
    'Side Hustle / Freelance',
    'income',
    59,
    TRUE
),
(
    65,
    'Interest & Dividends',
    'income',
    59,
    TRUE
),
(
    66,
    'Gifts Received',
    'income',
    59,
    TRUE
),

-- TRANSFER GROUPS
(
    67,
    'Internal Transfers',
    'transfer',
    NULL,
    TRUE
),
(
    68,
    'External Transfers',
    'transfer',
    NULL,
    TRUE
),

-- TRANSFER CHILDREN
(
    69,
    'Between Own Accounts',
    'transfer',
    67,
    TRUE
),
(
    70,
    'To Savings / Investments',
    'transfer',
    68,
    TRUE
),
(
    71,
    'To Friends & Family',
    'transfer',
    68,
    TRUE
),
(
    72,
    'From Friends & Family',
    'transfer',
    68,
    TRUE
) ON CONFLICT (id) DO
UPDATE
SET
    name = EXCLUDED.name,
    type = EXCLUDED.type,
    parent_id = EXCLUDED.parent_id,
    is_system = TRUE;

----------------------------------------------------------------------
-- 3) REMOVE OLD SYSTEM CATEGORIES NOT IN THIS CANONICAL LIST
--    (e.g. old "Grocerie" etc.), BUT KEEP user-defined (is_system = FALSE).
----------------------------------------------------------------------

DELETE FROM categories
WHERE
    is_system = TRUE
    AND id NOT IN(
        8,
        9,
        10,
        11,
        12,
        13,
        14,
        15,
        16,
        17,
        18,
        19,
        20,
        21,
        22,
        23,
        24,
        25,
        26,
        27,
        28,
        29,
        30,
        31,
        32,
        33,
        34,
        35,
        36,
        37,
        38,
        39,
        40,
        41,
        42,
        43,
        44,
        45,
        46,
        47,
        48,
        49,
        50,
        51,
        52,
        53,
        54,
        55,
        56,
        57,
        58,
        59,
        60,
        61,
        62,
        63,
        64,
        65,
        66,
        67,
        68,
        69,
        70,
        71,
        72
    );

----------------------------------------------------------------------
-- 4) RESET SEQUENCE FOR categories.id (since id is SERIAL)
----------------------------------------------------------------------

SELECT setval (
        pg_get_serial_sequence ('categories', 'id'), (
            SELECT COALESCE(MAX(id), 1)
            FROM categories
        ), TRUE
    );

COMMIT;