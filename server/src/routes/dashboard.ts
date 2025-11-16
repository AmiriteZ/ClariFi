import { Router, Response } from "express";
import {
  verifyFirebaseToken,
  type AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";

const router = Router();

router.get(
  "/dashboard",
  verifyFirebaseToken,
  (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user;
    console.log("Dashboard requested by user:", userId);

    const data = {
      summary: {
        totalBalance: 2314.52,
        monthIncome: 3400,
        monthExpenses: 1840.35,
      },
      spendingByCategory: [
        { category: "Food", amount: 320 },
        { category: "Rent", amount: 1200 },
        { category: "Transport", amount: 120 },
      ],
      recentTransactions: [
        {
          id: 1,
          date: "10/11/2025",
          merchant: "Tesco",
          category: "Groceries",
          amount: -42.5,
        },
        {
          id: 2,
          date: "09/11/2025",
          merchant: "Netflix",
          category: "Subscription",
          amount: -12.99,
        },
      ],
      mainGoal: {
        name: "Holiday Fund",
        currentAmount: 450,
        targetAmount: 2000,
      },
      insights: [
        "You’ve spent 48% of your monthly budget so far.",
        "Your Transport spending is 15% lower than last month.",
        "At your current saving rate, you’ll reach your Holiday Fund in ~5 months.",
      ],
    };

    res.json(data);
  }
);

export default router;
