const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function listColumns() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'transactions';
    `);
    console.log("Columns in transactions table:");
    res.rows.forEach((row) => {
      console.log(`${row.column_name} (${row.data_type})`);
    });
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

listColumns();
