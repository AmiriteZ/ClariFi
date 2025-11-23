const { Pool } = require("pg");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ACCOUNT_ID = "b776920f-44f7-4a9d-8a08-ca4b52c90124";

async function resetAndReseed() {
  try {
    console.log("🗑️  Deleting old transactions...");

    // Delete all transactions for this account
    const deleteRes = await pool.query(
      "DELETE FROM transactions WHERE account_id = $1",
      [ACCOUNT_ID]
    );
    console.log(`✅ Deleted ${deleteRes.rowCount} transactions`);

    // Reset account balance to starting amount (2000)
    await pool.query(
      "UPDATE accounts SET current_balance = 2000, available_balance = 2000 WHERE id = $1",
      [ACCOUNT_ID]
    );
    console.log("✅ Reset account balance to €2000");

    console.log("\n🌱 Now run: cmd /c node server/seed_user_data.js\n");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    await pool.end();
  }
}

resetAndReseed();
