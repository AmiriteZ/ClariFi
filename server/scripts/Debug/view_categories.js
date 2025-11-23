const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function viewCategories() {
  try {
    // Show table structure
    console.log("Categories table structure:");
    const structure = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position;
    `);
    structure.rows.forEach((row) => {
      console.log(`  ${row.column_name} (${row.data_type})`);
    });

    // Show first 10 categories
    console.log("\nFirst 10 categories:");
    const categories = await pool.query(`
      SELECT id, name FROM categories LIMIT 10;
    `);
    categories.rows.forEach((row) => {
      console.log(`  ${row.id}: ${row.name}`);
    });
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

viewCategories();
