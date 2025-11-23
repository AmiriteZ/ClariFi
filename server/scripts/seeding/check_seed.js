const { Pool } = require("pg");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ACCOUNT_ID = "b776920f-44f7-4a9d-8a08-ca4b52c90124";

async function checkData() {
  try {
    const res = await pool.query(
      "SELECT COUNT(*) FROM transactions WHERE account_id = $1",
      [ACCOUNT_ID]
    );
    console.log(`Transactions found: ${res.rows[0].count}`);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkData();
