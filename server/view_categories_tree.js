const { Pool } = require("pg");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function viewCategories() {
  try {
    const res = await pool.query(
      "SELECT id, name, parent_id FROM categories ORDER BY parent_id NULLS FIRST, name"
    );

    console.log("\n=== CATEGORIES ===\n");

    // Group by parent
    const parents = res.rows.filter((c) => c.parent_id === null);
    const children = res.rows.filter((c) => c.parent_id !== null);

    parents.forEach((parent) => {
      console.log(`\n📁 ${parent.name} (ID: ${parent.id})`);
      const subs = children.filter((c) => c.parent_id === parent.id);
      subs.forEach((sub) => {
        console.log(`   └─ ${sub.name} (ID: ${sub.id})`);
      });
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

viewCategories();
