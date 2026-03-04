import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = Router();

// Only allow demo setup if feature flag is enabled
const ENABLE_DEMO_MODE = process.env.ENABLE_DEMO_MODE === "true";

router.post(
  "/setup",
  verifyFirebaseToken,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!ENABLE_DEMO_MODE) {
      res.status(403).json({ error: "Demo mode is disabled" });
      return;
    }

    try {
      const authUser = req.user;
      if (!authUser) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { persona } = req.body;
      if (!["student", "professional"].includes(persona)) {
        res.status(400).json({ error: "Invalid persona" });
        return;
      }

      // 1. Resolve internal user ID
      const userRes = await pool.query(
        "SELECT id FROM users WHERE firebase_uid = $1",
        [authUser.uid],
      );
      if (userRes.rowCount === 0) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      const userId = userRes.rows[0].id;

      console.log(`[Demo] Seeding for user ${userId} (${persona})`);

      // 2. Ensure "Demo Bank" institution exists
      const instRes = await pool.query(
        "SELECT id FROM institutions WHERE provider_code = $1",
        ["demo_bank"],
      );
      let institutionId;
      if (instRes.rowCount === 0) {
        const newInst = await pool.query(
          "INSERT INTO institutions (name, country_code, provider_code) VALUES ($1, $2, $3) RETURNING id",
          ["Demo Bank", "IE", "demo_bank"],
        );
        institutionId = newInst.rows[0].id;
      } else {
        institutionId = instRes.rows[0].id;
      }

      // 3. Create Bank Connection
      const connRes = await pool.query(
        "INSERT INTO bank_connections (user_id, institution_id, provider, external_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING id",
        [userId, institutionId, "demo", `demo-conn-${Date.now()}`, "active"],
      );
      const connectionId = connRes.rows[0].id;

      // 4. Create Account
      const accountName =
        persona === "student" ? "Student Checking" : "Professional Rewards";
      const startBalance = persona === "student" ? 1200 : 5000;
      const accountRes = await pool.query(
        `INSERT INTO accounts (
          bank_connection_id, household_id, external_account_id, name,
          account_type, currency_code, current_balance, available_balance, 
          last_synced_at
        ) VALUES ($1, NULL, $2, $3, $4, $5, $6, $7, now()) RETURNING id`,
        [
          connectionId,
          userId, // Dashboard expects userId as external_account_id for simple filtering
          accountName,
          "current",
          "EUR",
          startBalance,
          startBalance,
        ],
      );
      const accountId = accountRes.rows[0].id;
      console.log(`[Demo] Created account ${accountId} (ext: ${userId})`);

      // 5. Seed Transactions
      const catRes = await pool.query("SELECT id, name FROM categories");
      const categories: Record<string, string> = {};
      catRes.rows.forEach((c) => (categories[c.name.toLowerCase()] = c.id));

      const getCatId = (name: string) => categories[name.toLowerCase()] || null;

      const transactions = [];
      const now = new Date();

      // Recurring Bills Schedule
      const weeklySchedule = [
        {
          day: 1,
          name: "Rent Payment",
          cat: "Rent / Mortgage",
          student: 650,
          pro: 2100,
        },
        {
          day: 28,
          name: "Salary",
          cat: "Primary Salary",
          student: 0,
          pro: 3500,
          type: "credit",
        },
        {
          day: 15,
          name: "Gym Membership",
          cat: "Weight & Yoga",
          student: 30,
          pro: 50,
        },
        { day: 20, name: "Broadband", cat: "Internet", student: 40, pro: 65 },
        {
          day: 5,
          name: "Netflix",
          cat: "Streaming Services",
          student: 10,
          pro: 15,
        },
        {
          day: 10,
          name: "ESB / Electric Ireland",
          cat: "Electricity",
          student: 60,
          pro: 120,
        },
      ];

      // Student irregular income schedule (weekly)
      if (persona === "student") {
        for (let i = 0; i < 9; i++) {
          const incDate = new Date(now);
          incDate.setDate(now.getDate() - (i * 7 + 2));
          transactions.push({
            date: incDate,
            amount: 80 + Math.floor(Math.random() * 40),
            direction: "credit",
            merchant: "Private Tutoring",
            category: getCatId("Other Income") || getCatId("Income"),
            description: "Weekly Tutoring",
          });
        }
      }

      // Variable merchants
      const studentMerchants = [
        { name: "Uni Bar", cat: "Eating Out", min: 5, max: 25 },
        { name: "Cheap Pizza", cat: "Eating Out", min: 10, max: 20 },
        { name: "Lidl", cat: "Groceries", min: 15, max: 45 },
        { name: "Tesco", cat: "Groceries", min: 10, max: 35 },
        { name: "Leap Card", cat: "Public Transport", min: 10, max: 20 },
        { name: "Amazon", cat: "Leisure & Hobbies", min: 15, max: 50 },
      ];

      const proMerchants = [
        { name: "Organic Market", cat: "Groceries", min: 40, max: 130 },
        { name: "High-end Bistro", cat: "Eating Out", min: 40, max: 120 },
        { name: "Uber", cat: "Public Transport", min: 15, max: 45 },
        { name: "Amazon", cat: "Clothing & Shoes", min: 30, max: 250 },
        { name: "Wine Shop", cat: "Eating Out", min: 20, max: 70 },
      ];

      const merchants = persona === "student" ? studentMerchants : proMerchants;

      // Seed over 60 days
      for (let i = 0; i < 60; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dayOfMonth = d.getDate();

        // 1. Check for recurring bills
        weeklySchedule.forEach((bill) => {
          if (dayOfMonth === bill.day) {
            const amount = persona === "student" ? bill.student : bill.pro;
            if (amount > 0) {
              transactions.push({
                date: new Date(d),
                amount: amount,
                direction: bill.type === "credit" ? "credit" : "debit",
                merchant: bill.name,
                category: getCatId(bill.cat),
                description:
                  bill.type === "credit" ? "Monthly Salary" : "Monthly Bill",
              });
            }
          }
        });

        // 2. Add variable spending (approx 1-2 per day)
        if (Math.random() > 0.3) {
          const m = merchants[Math.floor(Math.random() * merchants.length)];
          transactions.push({
            date: new Date(d),
            amount: Math.floor(Math.random() * (m.max - m.min + 1)) + m.min,
            direction: "debit",
            merchant: m.name,
            category: getCatId(m.cat),
            description: "Card Payment",
          });
        }
      }

      // Insert all
      console.log(`[Demo] Inserting ${transactions.length} transactions...`);
      for (const tx of transactions) {
        await pool.query(
          `INSERT INTO transactions (
            account_id, posted_at, amount, currency_code, direction, 
            description, merchant_name, status, category_id, external_transaction_id,
            is_hidden_from_household
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            accountId,
            tx.date.toISOString(),
            tx.amount,
            "EUR",
            tx.direction || "debit",
            tx.description,
            tx.merchant,
            "BOOKED",
            tx.category,
            `demo-tx-${Math.random().toString(36).substring(7)}`,
            false, // Explicitly visible
          ],
        );
      }

      // Update final balance
      const netChange = transactions.reduce((acc, tx) => {
        return acc + (tx.direction === "credit" ? tx.amount : -tx.amount);
      }, 0);

      await pool.query(
        "UPDATE accounts SET current_balance = current_balance + $1, available_balance = available_balance + $1 WHERE id = $2",
        [netChange, accountId],
      );

      console.log(`[Demo] Setup complete for account ${accountId}`);
      res.json({ success: true, accountId });
    } catch (err) {
      console.error("Error setting up demo persona:", err);
      res.status(500).json({ error: "Failed to setup demo persona" });
    }
  },
);

export default router;
