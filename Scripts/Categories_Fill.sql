BEGIN;

-- ===========================
-- CORE SYSTEM CATEGORIES
-- ===========================
-- Table structure reminder:
-- categories (
--   id SERIAL PRIMARY KEY,
--   parent_id INT REFERENCES categories(id),
--   name TEXT NOT NULL,
--   type TEXT NOT NULL, -- 'income' | 'expense' | 'transfer'
--   is_system BOOLEAN NOT NULL DEFAULT TRUE,
--   display_order INT,
--   UNIQUE (name, type)
-- );
-- ---------------------------

-- ==============
-- EXPENSE: PARENTS
-- ==============
INSERT INTO categories (name, type, is_system, display_order)
VALUES
  ('Housing & Utilities',    'expense', TRUE, 10),
  ('Food & Groceries',       'expense', TRUE, 20),
  ('Transport',              'expense', TRUE, 30),
  ('Bills & Subscriptions',  'expense', TRUE, 40),
  ('Shopping & Lifestyle',   'expense', TRUE, 50),
  ('Health & Wellness',      'expense', TRUE, 60),
  ('Entertainment & Leisure','expense', TRUE, 70),
  ('Family & Children',      'expense', TRUE, 80),
  ('Financial & Fees',       'expense', TRUE, 90),
  ('Other Expenses',         'expense', TRUE, 99)
ON CONFLICT (name, type)
DO UPDATE SET display_order = EXCLUDED.display_order;

-- ==============
-- EXPENSE: CHILDREN
-- ==============

-- Housing & Utilities
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Housing & Utilities' AND type = 'expense'),
    'Rent / Mortgage',     'expense', TRUE, 11),
  ((SELECT id FROM categories WHERE name = 'Housing & Utilities' AND type = 'expense'),
    'Electricity',         'expense', TRUE, 12),
  ((SELECT id FROM categories WHERE name = 'Housing & Utilities' AND type = 'expense'),
    'Gas / Heating',       'expense', TRUE, 13),
  ((SELECT id FROM categories WHERE name = 'Housing & Utilities' AND type = 'expense'),
    'Water / Waste',       'expense', TRUE, 14),
  ((SELECT id FROM categories WHERE name = 'Housing & Utilities' AND type = 'expense'),
    'Internet',            'expense', TRUE, 15),
  ((SELECT id FROM categories WHERE name = 'Housing & Utilities' AND type = 'expense'),
    'Home Insurance',      'expense', TRUE, 16)
ON CONFLICT (name, type) DO NOTHING;

-- Food & Groceries
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Food & Groceries' AND type = 'expense'),
    'Groceries',           'expense', TRUE, 21),
  ((SELECT id FROM categories WHERE name = 'Food & Groceries' AND type = 'expense'),
    'Eating Out',          'expense', TRUE, 22),
  ((SELECT id FROM categories WHERE name = 'Food & Groceries' AND type = 'expense'),
    'Coffee / Snacks',     'expense', TRUE, 23),
  ((SELECT id FROM categories WHERE name = 'Food & Groceries' AND type = 'expense'),
    'Takeaway / Delivery', 'expense', TRUE, 24)
ON CONFLICT (name, type) DO NOTHING;

-- Transport
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Transport' AND type = 'expense'),
    'Fuel',                'expense', TRUE, 31),
  ((SELECT id FROM categories WHERE name = 'Transport' AND type = 'expense'),
    'Public Transport',    'expense', TRUE, 32),
  ((SELECT id FROM categories WHERE name = 'Transport' AND type = 'expense'),
    'Taxi / Rideshare',    'expense', TRUE, 33),
  ((SELECT id FROM categories WHERE name = 'Transport' AND type = 'expense'),
    'Parking / Tolls',     'expense', TRUE, 34),
  ((SELECT id FROM categories WHERE name = 'Transport' AND type = 'expense'),
    'Vehicle Maintenance', 'expense', TRUE, 35)
ON CONFLICT (name, type) DO NOTHING;

-- Bills & Subscriptions
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Bills & Subscriptions' AND type = 'expense'),
    'Mobile Phone',        'expense', TRUE, 41),
  ((SELECT id FROM categories WHERE name = 'Bills & Subscriptions' AND type = 'expense'),
    'Streaming Services',  'expense', TRUE, 42),
  ((SELECT id FROM categories WHERE name = 'Bills & Subscriptions' AND type = 'expense'),
    'Software / Apps',     'expense', TRUE, 43),
  ((SELECT id FROM categories WHERE name = 'Bills & Subscriptions' AND type = 'expense'),
    'Gym / Memberships',   'expense', TRUE, 44),
  ((SELECT id FROM categories WHERE name = 'Bills & Subscriptions' AND type = 'expense'),
    'Insurance (Non-Home)','expense', TRUE, 45)
ON CONFLICT (name, type) DO NOTHING;

-- Shopping & Lifestyle
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Shopping & Lifestyle' AND type = 'expense'),
    'Clothing & Shoes',    'expense', TRUE, 51),
  ((SELECT id FROM categories WHERE name = 'Shopping & Lifestyle' AND type = 'expense'),
    'Electronics & Gadgets','expense', TRUE, 52),
  ((SELECT id FROM categories WHERE name = 'Shopping & Lifestyle' AND type = 'expense'),
    'Home & Furniture',    'expense', TRUE, 53),
  ((SELECT id FROM categories WHERE name = 'Shopping & Lifestyle' AND type = 'expense'),
    'Beauty & Personal Care','expense', TRUE, 54),
  ((SELECT id FROM categories WHERE name = 'Shopping & Lifestyle' AND type = 'expense'),
    'Gifts & Donations',   'expense', TRUE, 55)
ON CONFLICT (name, type) DO NOTHING;

-- Health & Wellness
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Health & Wellness' AND type = 'expense'),
    'Medical & Pharmacy',  'expense', TRUE, 61),
  ((SELECT id FROM categories WHERE name = 'Health & Wellness' AND type = 'expense'),
    'Health Insurance',    'expense', TRUE, 62),
  ((SELECT id FROM categories WHERE name = 'Health & Wellness' AND type = 'expense'),
    'Mental Health',       'expense', TRUE, 63)
ON CONFLICT (name, type) DO NOTHING;

-- Entertainment & Leisure
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Entertainment & Leisure' AND type = 'expense'),
    'Cinema / Events',     'expense', TRUE, 71),
  ((SELECT id FROM categories WHERE name = 'Entertainment & Leisure' AND type = 'expense'),
    'Hobbies & Activities','expense', TRUE, 72),
  ((SELECT id FROM categories WHERE name = 'Entertainment & Leisure' AND type = 'expense'),
    'Holidays & Travel',   'expense', TRUE, 73)
ON CONFLICT (name, type) DO NOTHING;

-- Family & Children
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Family & Children' AND type = 'expense'),
    'Childcare',           'expense', TRUE, 81),
  ((SELECT id FROM categories WHERE name = 'Family & Children' AND type = 'expense'),
    'School & Education',  'expense', TRUE, 82),
  ((SELECT id FROM categories WHERE name = 'Family & Children' AND type = 'expense'),
    'Pet Care',            'expense', TRUE, 83)
ON CONFLICT (name, type) DO NOTHING;

-- Financial & Fees
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Financial & Fees' AND type = 'expense'),
    'Bank Fees & Charges', 'expense', TRUE, 91),
  ((SELECT id FROM categories WHERE name = 'Financial & Fees' AND type = 'expense'),
    'Loan Payments',       'expense', TRUE, 92),
  ((SELECT id FROM categories WHERE name = 'Financial & Fees' AND type = 'expense'),
    'Credit Card Payments','expense', TRUE, 93),
  ((SELECT id FROM categories WHERE name = 'Financial & Fees' AND type = 'expense'),
    'Taxes Paid',          'expense', TRUE, 94)
ON CONFLICT (name, type) DO NOTHING;

-- Other Expenses
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Other Expenses' AND type = 'expense'),
    'Uncategorised Expense','expense', TRUE, 99)
ON CONFLICT (name, type) DO NOTHING;

-- ==============
-- INCOME CATEGORIES
-- ==============
INSERT INTO categories (name, type, is_system, display_order)
VALUES
  ('Salary & Wages',       'income', TRUE, 10),
  ('Benefits & Refunds',   'income', TRUE, 20),
  ('Other Income',         'income', TRUE, 30)
ON CONFLICT (name, type)
DO UPDATE SET display_order = EXCLUDED.display_order;

-- Optional children (if you want finer breakdown later)
INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Salary & Wages' AND type = 'income'),
    'Primary Salary',      'income', TRUE, 11),
  ((SELECT id FROM categories WHERE name = 'Salary & Wages' AND type = 'income'),
    'Bonus / Commission',  'income', TRUE, 12),
  ((SELECT id FROM categories WHERE name = 'Benefits & Refunds' AND type = 'income'),
    'Government Benefits', 'income', TRUE, 21),
  ((SELECT id FROM categories WHERE name = 'Benefits & Refunds' AND type = 'income'),
    'Tax Refunds',         'income', TRUE, 22),
  ((SELECT id FROM categories WHERE name = 'Other Income' AND type = 'income'),
    'Side Hustle / Freelance','income', TRUE, 31),
  ((SELECT id FROM categories WHERE name = 'Other Income' AND type = 'income'),
    'Interest & Dividends','income', TRUE, 32),
  ((SELECT id FROM categories WHERE name = 'Other Income' AND type = 'income'),
    'Gifts Received',      'income', TRUE, 33)
ON CONFLICT (name, type) DO NOTHING;

-- ==============
-- TRANSFER CATEGORIES
-- ==============
INSERT INTO categories (name, type, is_system, display_order)
VALUES
  ('Internal Transfers',   'transfer', TRUE, 10),
  ('External Transfers',   'transfer', TRUE, 20)
ON CONFLICT (name, type)
DO UPDATE SET display_order = EXCLUDED.display_order;

INSERT INTO categories (parent_id, name, type, is_system, display_order)
VALUES
  ((SELECT id FROM categories WHERE name = 'Internal Transfers' AND type = 'transfer'),
    'Between Own Accounts','transfer', TRUE, 11),
  ((SELECT id FROM categories WHERE name = 'External Transfers' AND type = 'transfer'),
    'To Savings / Investments','transfer', TRUE, 21),
  ((SELECT id FROM categories WHERE name = 'External Transfers' AND type = 'transfer'),
    'To Friends & Family','transfer', TRUE, 22),
  ((SELECT id FROM categories WHERE name = 'External Transfers' AND type = 'transfer'),
    'From Friends & Family','transfer', TRUE, 23)
ON CONFLICT (name, type) DO NOTHING;

COMMIT;
