import { transactionsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// GET /api/transactions?limit=20&offset=0&type=
router.get("/", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const limit = Math.min(parseInt(String(req.query.limit ?? "20")), 100);
    const offset = parseInt(String(req.query.offset ?? "0"));
    const type = req.query.type as string | undefined;

    const conditions = [eq(transactionsTable.userId, userId)];
    if (type) conditions.push(eq(transactionsTable.type, type));

    const [{ value: total }] = await db
      .select({ value: count() })
      .from(transactionsTable)
      .where(and(...conditions));

    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(and(...conditions))
      .orderBy(desc(transactionsTable.createdAt))
      .limit(limit)
      .offset(offset);

    res.json({ transactions, total });
  } catch (err) {
    req.log.error({ err }, "list transactions error");
    res.status(500).json({ error: "Failed to fetch transactions" });
  }
});

// GET /api/transactions/analytics?period=30
router.get("/analytics", requireAuth, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const days = parseInt(String(req.query.period ?? "30"));
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const transactions = await db
      .select()
      .from(transactionsTable)
      .where(
        and(
          eq(transactionsTable.userId, userId),
          gte(transactionsTable.createdAt, since)
        )
      )
      .orderBy(desc(transactionsTable.createdAt));

    let totalIn = 0;
    let totalOut = 0;
    const byCategory: Record<string, number> = {};
    const byMonthMap: Record<string, { in: number; out: number }> = {};

    for (const tx of transactions) {
      const month = tx.createdAt.toISOString().slice(0, 7);
      if (!byMonthMap[month]) byMonthMap[month] = { in: 0, out: 0 };

      if (tx.type === "topup" || tx.type === "receive") {
        totalIn += tx.amount;
        byMonthMap[month].in += tx.amount;
      } else {
        totalOut += tx.amount;
        byMonthMap[month].out += tx.amount;
        byCategory[tx.category] = (byCategory[tx.category] ?? 0) + tx.amount;
      }
    }

    const monthly = Object.entries(byMonthMap)
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));

    res.json({ byCategory, monthly, totalIn, totalOut, days });
  } catch (err) {
    req.log.error({ err }, "analytics error");
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

export default router;
