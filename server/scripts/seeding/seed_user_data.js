const { Pool } = require("pg");
require("dotenv").config({ path: "./server/.env" });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const USER_ID = "200bec91-f562-4b51-ab6a-9dc963880983";
const ACCOUNT_ID = "b776920f-44f7-4a9d-8a08-ca4b52c90124";
const START_DATE = new Date("2024-11-22");
const END_DATE = new Date("2025-11-22");

// Irish Merchants & Categories
const MERCHANTS = {
  groceries: ["Tesco Ireland", "Dunnes Stores", "SuperValu", "Lidl", "Aldi"],
  transport: [
    "Leap Card",
    "Dublin Bus",
    "Irish Rail",
    "Circle K",
    "Applegreen",
  ],
  eating_out: ["Boojum", "Nandos", "McDonalds", "Starbucks", "Insomnia Coffee"],
  entertainment: ["Netflix", "Spotify", "Omniplex Cinemas", "Ticketmaster"],
  utilities: ["Electric Ireland", "Virgin Media", "Bord Gais", "Vodafone"],
  shopping: ["Amazon", "Penneys", "Zara", "H&M", "Boots"],
};

// Fixed Bills
const BILLS = [
  { name: "Electric Ireland", amount: -120, day: 15, category: "Utilities" },
  { name: "Virgin Media", amount: -65, day: 20, category: "Internet" },
  { name: "Vodafone", amount: -45, day: 25, category: "Mobile" },
  { name: "Spotify", amount: -10.99, day: 1, category: "Entertainment" },
  { name: "Netflix", amount: -15.99, day: 5, category: "Entertainment" },
  { name: "Rent/Mortgage", amount: -1500, day: 1, category: "Housing" },
];

// Salary
const SALARY = { name: "Ocuco", amount: 4300, day: 28, category: "Income" };

async function seedData() {
  try {
    console.error("🌱 Starting data seed...");

    // 1. Fetch Category IDs
    const catRes = await pool.query("SELECT id, name FROM categories");
    console.error(`Found ${catRes.rows.length} categories`);
    const categories = {};
    catRes.rows.forEach((c) => (categories[c.name.toLowerCase()] = c.id));

    // Helper to find category ID by exact name
    const getCatId = (name) => {
      // Map merchant types to specific subcategories
      const categoryMap = {
        groceries: "Groceries",
        transport: "Public Transport",
        eating_out: "Eating Out",
        entertainment: "Streaming Services",
        utilities: "Electricity",
        shopping: "Clothing & Shoes",
        Income: "Primary Salary",
        Salary: "Primary Salary",
        Utilities: "Electricity",
        Internet: "Internet",
        Mobile: "Mobile Phone",
        Entertainment: "Streaming Services",
        Housing: "Rent / Mortgage",
      };

      const mappedName = categoryMap[name] || name;
      const key = Object.keys(categories).find(
        (k) => k.toLowerCase() === mappedName.toLowerCase()
      );
      return categories[key] || null;
    };

    const transactions = [];
    let currentDate = new Date(START_DATE);

    while (currentDate <= END_DATE) {
      const day = currentDate.getDate();
      const isWeekend =
        currentDate.getDay() === 0 || currentDate.getDay() === 6;

      // 1. Salary
      if (day === SALARY.day) {
        transactions.push({
          date: new Date(currentDate),
          amount: SALARY.amount,
          merchant: SALARY.name,
          category_id: getCatId("Primary Salary"),
          description: "Monthly Salary",
        });
      }

      // 2. Bills
      BILLS.forEach((bill) => {
        if (day === bill.day) {
          transactions.push({
            date: new Date(currentDate),
            amount: bill.amount,
            merchant: bill.name,
            category_id: getCatId(bill.category),
            description: "Monthly Bill",
          });
        }
      });

      // 3. Variable Spending (Random 10-20 per month -> ~0.5 per day)
      if (Math.random() > 0.5) {
        const type =
          Object.keys(MERCHANTS)[
            Math.floor(Math.random() * Object.keys(MERCHANTS).length)
          ];
        const merchant =
          MERCHANTS[type][Math.floor(Math.random() * MERCHANTS[type].length)];

        let amount = -(Math.floor(Math.random() * 80) + 5); // €5 - €85
        if (type === "groceries")
          amount = -(Math.floor(Math.random() * 150) + 20);
        if (type === "transport")
          amount = -(Math.floor(Math.random() * 30) + 2);
        if (type === "eating_out")
          amount = -(Math.floor(Math.random() * 50) + 10);

        transactions.push({
          date: new Date(currentDate),
          amount: amount,
          merchant: merchant,
          category_id: getCatId(type),
          description: "Card Payment",
        });
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    console.log(
      `📝 Generated ${transactions.length} transactions. Inserting...`
    );

    // Insert in batches
    for (const tx of transactions) {
      await pool.query(
        `INSERT INTO transactions (
          account_id, 
          posted_at, 
          amount, 
          currency_code, 
          direction, 
          description, 
          merchant_name, 
          status, 
          category_id,
          external_transaction_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          ACCOUNT_ID,
          tx.date.toISOString(),
          Math.abs(tx.amount),
          "EUR",
          tx.amount < 0 ? "debit" : "credit",
          tx.description,
          tx.merchant,
          "BOOKED",
          tx.category_id,
          `seed-${Math.random().toString(36).substring(7)}`, // Fake external ID
        ]
      );
    }

    // Update Account Balance
    const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
    // Assuming starting balance was 0, or we just add to it.
    // Let's set it to a realistic ending balance (e.g., saved 500/month)
    // But for now, let's just update it to reflect the net change + maybe a buffer

    await pool.query(
      `UPDATE accounts SET current_balance = current_balance + $1, last_synced_at = now() WHERE id = $2`,
      [totalBalance, ACCOUNT_ID]
    );

    console.log("✅ Data seed complete!");
    console.log(`💰 Net change: €${totalBalance.toFixed(2)}`);
  } catch (err) {
    console.error("❌ Error seeding data:", err);
  } finally {
    await pool.end();
  }
}

seedData();
