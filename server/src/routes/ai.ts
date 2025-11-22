import { Router, Response } from "express";
import { pool } from "../db";
import {
  verifyFirebaseToken,
  AuthenticatedRequest,
} from "../middleware/verifyFirebaseToken";
import { getOpenAIClient } from "../ai/client";
import { buildConversationPrompt } from "../ai/prompts";
import { formatFinancialContext } from "../ai/context";
import { Analyzer } from "../ml/analyzer";
import { FinancialProfile } from "../ml/types";

const router = Router();

// All routes require auth
router.use(verifyFirebaseToken);

/**
 * Helper: resolve the DB user.id for the current request.
 */
async function resolveUserId(
  req: AuthenticatedRequest
): Promise<string | null> {
  const authUser = req.user;
  if (!authUser) return null;

  const firebaseUid = authUser.uid;
  if (!firebaseUid) return null;

  const result = await pool.query(
    `SELECT id, display_name, email FROM users WHERE firebase_uid = $1 LIMIT 1`,
    [firebaseUid]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0].id;
}

/**
 * POST /api/ai/chat
 * Send a message to the AI assistant
 */
router.post(
  "/chat",
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const userId = await resolveUserId(req);
      if (!userId) {
        res.status(401).json({ error: "Unauthenticated" });
        return;
      }

      const { message, conversationHistory = [] } = req.body;

      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "Message is required" });
        return;
      }

      // 1. Get user info
      const userRes = await pool.query(
        "SELECT display_name, email FROM users WHERE id = $1",
        [userId]
      );
      const userName =
        userRes.rows[0]?.display_name ||
        userRes.rows[0]?.email?.split("@")[0] ||
        "User";

      // 2. Detect timeframe from user message (default: 90 days)
      let daysLookback = 90;
      const messageLower = message.toLowerCase();

      // Check for specific timeframe requests
      if (
        messageLower.includes("last year") ||
        messageLower.includes("past year")
      ) {
        daysLookback = 365;
      } else if (
        messageLower.includes("last 6 months") ||
        messageLower.includes("past 6 months")
      ) {
        daysLookback = 180;
      } else if (
        messageLower.includes("last 3 months") ||
        messageLower.includes("past 3 months")
      ) {
        daysLookback = 90;
      } else if (
        messageLower.includes("last month") ||
        messageLower.includes("this month")
      ) {
        daysLookback = 30;
      } else if (messageLower.match(/last (\d+) months?/)) {
        const match = messageLower.match(/last (\d+) months?/);
        if (match) {
          daysLookback = parseInt(match[1]) * 30;
        }
      }

      // 3. Fetch financial profile from ML layer
      // Fetch transactions based on detected timeframe
      const txQuery = await pool.query(
        `SELECT t.*, c.name as category_name
         FROM transactions t
         JOIN accounts a ON t.account_id = a.id
         JOIN bank_connections bc ON a.bank_connection_id = bc.id
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE bc.user_id = $1
           AND t.posted_at >= NOW() - INTERVAL '${daysLookback} days'
         ORDER BY t.posted_at DESC`,
        [userId]
      );
      // Convert amounts to signed values based on direction
      // debit = expense (negative), credit = income (positive)
      const transactions = txQuery.rows.map((tx: any) => ({
        ...tx,
        amount:
          tx.direction === "debit"
            ? -Math.abs(Number(tx.amount))
            : Math.abs(Number(tx.amount)),
      }));

      // Fetch categories map
      const catQuery = await pool.query("SELECT id, name FROM categories");
      const categories = new Map<number, string>();
      catQuery.rows.forEach((c: { id: number; name: string }) =>
        categories.set(c.id, c.name)
      );

      // Run Analysis
      const recurring = Analyzer.detectRecurring(transactions);
      const spendingPatterns = Analyzer.analyzeSpending(
        transactions,
        categories
      );
      const cashFlow = Analyzer.analyzeCashFlow(transactions);

      const profile: FinancialProfile = {
        userId,
        traits: {
          plannerType: "balanced",
          incomeStability: recurring.some((t) => t.type === "income")
            ? "stable"
            : "irregular",
          spendVelocity: "steady",
        },
        cashFlow,
        recurring,
        spendingPatterns,
        insights: [],
      };

      // 3. Format financial context with timeframe info
      const timeframeDescription =
        daysLookback === 30
          ? "the last month"
          : daysLookback === 90
          ? "the last 90 days (3 months)"
          : daysLookback === 180
          ? "the last 6 months"
          : daysLookback === 365
          ? "the last year"
          : `the last ${Math.round(daysLookback / 30)} months`;

      const financialContext =
        `Analysis Period: ${timeframeDescription}\n\n` +
        formatFinancialContext(profile);

      // 4. Build conversation prompt
      const messages = buildConversationPrompt(
        userName,
        financialContext,
        conversationHistory
      );

      // Add current user message
      messages.push({
        role: "user",
        content: message,
      });

      // 5. Call OpenAI
      const openai = getOpenAIClient();
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages,
        temperature: 0.7,
        max_tokens: 500,
      });

      const assistantMessage = completion.choices[0].message.content;

      res.json({
        message: assistantMessage,
        usage: completion.usage,
      });
    } catch (error) {
      console.error("Error in AI chat:", error);

      // Handle specific OpenAI errors
      if (error instanceof Error && error.message.includes("API key")) {
        res.status(500).json({
          error:
            "OpenAI API key not configured. Please set OPENAI_API_KEY in your .env file.",
        });
        return;
      }

      res.status(500).json({ error: "Failed to generate response" });
    }
  }
);

export default router;
