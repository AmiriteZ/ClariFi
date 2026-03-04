const { Pool } = require("pg");
const pool = new Pool({
  connectionString:
    "postgres://clarifi_user:clarifi_pass@localhost:54323/clarifi_dev",
});

async function debug() {
  try {
    const accounts = await pool.query(
      "SELECT * FROM accounts ORDER BY created_at DESC LIMIT 5",
    );
    console.log("--- ACCOUNTS ---");
    console.log(JSON.stringify(accounts.rows, null, 2));

    if (accounts.rows.length > 0) {
      const accId = accounts.rows[0].id;
      const transactions = await pool.query(
        "SELECT * FROM transactions WHERE account_id = $1 ORDER BY posted_at DESC LIMIT 5",
        [accId],
      );
      console.log("--- TRANSACTIONS ---");
      console.log(JSON.stringify(transactions.rows, null, 2));
    }

    const categories = await pool.query("SELECT * FROM categories LIMIT 5");
    console.log("--- CATEGORIES ---");
    console.log(JSON.stringify(categories.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}
debug();
