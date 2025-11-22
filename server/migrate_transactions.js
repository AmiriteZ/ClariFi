const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function migrate() {
  try {
    console.log("Adding external_transaction_id column...");
    await pool.query(`
      ALTER TABLE transactions 
      ADD COLUMN IF NOT EXISTS external_transaction_id VARCHAR(255);
    `);
    console.log("Column added.");

    console.log("Adding unique index...");
    await pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_external_id 
      ON transactions (account_id, external_transaction_id);
    `);
    console.log("Index added.");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await pool.end();
  }
}

migrate();
