const { Pool } = require("pg");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const USER_ID = "200bec91-f562-4b51-ab6a-9dc963880983";
const ACCOUNT_ID = "b776920f-44f7-4a9d-8a08-ca4b52c90124";

const fs = require("fs");
const logFile = "./server/debug_output.txt";

function log(msg) {
  console.log(msg);
  fs.appendFileSync(logFile, msg + "\n");
}

async function debug() {
  try {
    fs.writeFileSync(logFile, "Starting Debug...\n");
    log(`Target User ID: ${USER_ID}`);
    log(`Target Account ID: ${ACCOUNT_ID}`);

    // 1. Check User
    const userRes = await pool.query(
      "SELECT id, email, display_name FROM users WHERE id = $1",
      [USER_ID]
    );
    if (userRes.rows.length === 0) {
      log("❌ User NOT found!");
    } else {
      log(`✅ User found: ${JSON.stringify(userRes.rows[0])}`);
    }

    // 2. Check Account
    const accRes = await pool.query(
      "SELECT id, name, current_balance FROM accounts WHERE id = $1",
      [ACCOUNT_ID]
    );
    if (accRes.rows.length === 0) {
      log("❌ Account NOT found!");
    } else {
      log(`✅ Account found: ${JSON.stringify(accRes.rows[0])}`);
    }

    // 3. Check Bank Connection (Account must be linked to one)
    const connRes = await pool.query(
      "SELECT id, user_id FROM bank_connections WHERE user_id = $1",
      [USER_ID]
    );
    log(`ℹ️ User has ${connRes.rows.length} bank connections.`);

    // 4. Try Insert
    if (accRes.rows.length > 0) {
      log("Attempting test insertion...");
      const txRes = await pool.query(
        `INSERT INTO transactions (
          account_id, posted_at, amount, currency_code, direction, description, merchant_name, status, external_transaction_id
        ) VALUES ($1, NOW(), -1.00, 'EUR', 'debit', 'Debug Test', 'Debug Merchant', 'BOOKED', $2)
        RETURNING id`,
        [ACCOUNT_ID, `debug-${Date.now()}`]
      );
      log(`✅ Test transaction inserted with ID: ${txRes.rows[0].id}`);
    }
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  } finally {
    await pool.end();
  }
}

debug();
