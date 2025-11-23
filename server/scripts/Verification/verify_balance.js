const { Pool } = require("pg");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const ACCOUNT_ID = "b776920f-44f7-4a9d-8a08-ca4b52c90124";

async function verify() {
  try {
    // 1. Check account balance
    const accRes = await pool.query(
      "SELECT current_balance, available_balance FROM accounts WHERE id = $1",
      [ACCOUNT_ID]
    );
    console.log("Account balances:", accRes.rows[0]);

    // 2. Sum all transactions
    const sumRes = await pool.query(
      `SELECT 
        SUM(CASE WHEN direction = 'credit' THEN amount ELSE -amount END) as net_total,
        COUNT(*) as transaction_count
       FROM transactions WHERE account_id = $1`,
      [ACCOUNT_ID]
    );
    console.log("Transactions:", sumRes.rows[0]);

    // 3. Calculate what balance should be (assuming started at 2000)
    const initialBalance = 2000;
    const calculatedBalance =
      initialBalance + parseFloat(sumRes.rows[0].net_total);
    console.log(
      `\nCalculated balance (${initialBalance} + ${
        sumRes.rows[0].net_total
      }): €${calculatedBalance.toFixed(2)}`
    );
    console.log(`Current DB balance: €${accRes.rows[0].current_balance}`);
    console.log(
      `Difference: €${(
        parseFloat(accRes.rows[0].current_balance) - calculatedBalance
      ).toFixed(2)}`
    );

    // 4. Fix available_balance to match current_balance
    await pool.query(
      "UPDATE accounts SET available_balance = current_balance WHERE id = $1",
      [ACCOUNT_ID]
    );
    console.log("\n✅ Updated available_balance to match current_balance");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

verify();
