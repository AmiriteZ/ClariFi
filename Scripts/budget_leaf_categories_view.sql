-- Create a view that returns only leaf expense categories for budgeting
-- Excludes parent groups, income/transfer categories, and uncategorised expenses

CREATE OR REPLACE VIEW vw_budget_leaf_categories AS
SELECT
    c.id,
    c.name,
    c.parent_id,
    p.name AS parent_name,
    c.type,
    c.display_order,
    p.display_order AS parent_display_order
FROM
    categories c
    LEFT JOIN categories p ON c.parent_id = p.id
    LEFT JOIN categories child ON child.parent_id = c.id
WHERE
    child.id IS NULL -- leaf only (no children)
    AND c.type = 'expense' -- expense categories only
    AND c.name <> 'Uncategorised Expense' -- exclude uncategorised
ORDER BY COALESCE(p.display_order, 999), -- parent group order
    COALESCE(p.name, c.name), -- parent group name
    c.display_order, -- child order within group
    c.name;
-- child name