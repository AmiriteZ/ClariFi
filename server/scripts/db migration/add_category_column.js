const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log("Adding yapily_category column to transactions...");
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS yapily_category VARCHAR(255);
    `);
    console.log("Column added successfully.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
