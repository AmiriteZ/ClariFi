// server/src/app.ts
import express, { Request, Response } from "express";
import cors from "cors";
import { pool } from "./db";
import dashboardRouter from "./routes/dashboard";
import usersRouter from "./routes/users";
import goalsRouter from "./routes/goals";
import budgetsRouter from "./routes/budgets";
import accountsRouter from "./routes/accounts";
import institutionsRouter from "./routes/institutions";
import mlRouter from "./routes/ml";
import aiRouter from "./routes/ai";
import transactionsRouter from "./routes/transactions";
import categoriesRouter from "./routes/categories";
import householdsRouter from "./routes/households";

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Debug route to test DB connection
app.get("/api/debug/db", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({
      ok: true,
      serverTime: result.rows[0].now,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Internal server error";
    console.error("DB test error:", message);
    res.status(500).json({
      ok: false,
      error: message,
    });
  }
});

app.use("/api", dashboardRouter);

app.use("/api/users", usersRouter);

app.use("/api/goals", goalsRouter);
app.use("/api/budgets", budgetsRouter);
app.use("/api/accounts", accountsRouter);
app.use("/api/institutions", institutionsRouter);
app.use("/api/transactions", transactionsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/ml", mlRouter);

app.use("/api/ai", aiRouter);
app.use("/api/households", householdsRouter);

export default app;
