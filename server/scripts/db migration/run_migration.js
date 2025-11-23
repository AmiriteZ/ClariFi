const { Pool } = require("pg");
const fs = require("fs");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runMigration() {
  try {
    console.log("🔄 Running budget archiving migration...");

    const sql = fs.readFileSync(
      "./server/migrations/add_budget_archiving.sql",
      "utf8"
    );

    await pool.query(sql);

    console.log("✅ Migration completed successfully!");

    // Verify columns were added
    const result = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'budgets' 
      AND column_name IN ('status', 'archived_at', 'parent_budget_id')
    `);

    console.log("\nNew columns:");
    result.rows.forEach((row) => {
      console.log(`  - ${row.column_name}: ${row.data_type}`);
    });
  } catch (err) {
    console.error("❌ Migration failed:", err);
  } finally {
    await pool.end();
  }
}

runMigration();
