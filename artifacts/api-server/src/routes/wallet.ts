import {
  cardsTable,
  paySchema,
  topupSchema,
  transactionsTable,
  transferSchema,
  usersTable,
  walletsTable,
} from "@workspace/db";
import { db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// GET /api/wallet
router.get("/", requireAuth, async (req, res) => {
  try {
    const [wallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, req.user!.userId))
      .limit(1);
    res.json({ balance: wallet?.balance ?? 0 });
  } catch (err) {
    req.log.error({ err }, "get wallet error");
    res.status(500).json({ error: "Failed to fetch wallet" });
  }
});

// POST /api/wallet/topup
router.post("/topup", requireAuth, async (req, res) => {
  try {
    const parsed = topupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { cardId, amount } = parsed.data;
    const userId = req.user!.userId;

    const [card] = await db
      .select()
      .from(cardsTable)
      .where(and(eq(cardsTable.id, cardId), eq(cardsTable.userId, userId)))
      .limit(1);
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    const [wallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .limit(1);
    const currentBalance = wallet?.balance ?? 0;
    const newBalance = currentBalance + amount;

    await db
      .update(walletsTable)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(walletsTable.userId, userId));

    const [transaction] = await db
      .insert(transactionsTable)
      .values({
        userId,
        type: "topup",
        amount,
        description: `Top up from ${card.cardName} ••••${card.last4}`,
        status: "success",
        cardId: card.id,
        category: "other",
      })
      .returning();

    res.json({ transaction, balance: newBalance });
  } catch (err) {
    req.log.error({ err }, "topup error");
    res.status(500).json({ error: "Top up failed" });
  }
});

// POST /api/wallet/transfer
router.post("/transfer", requireAuth, async (req, res) => {
  try {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { recipientEmail, amount, description } = parsed.data;
    const senderId = req.user!.userId;

    if (req.user!.email === recipientEmail) {
      res.status(400).json({ error: "Cannot transfer to yourself" });
      return;
    }

    const [senderWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, senderId))
      .limit(1);

    if ((senderWallet?.balance ?? 0) < amount) {
      res.status(400).json({ error: "Insufficient balance" });
      return;
    }

    const [recipient] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, recipientEmail))
      .limit(1);
    if (!recipient) {
      res.status(404).json({ error: "Recipient not found" });
      return;
    }

    const newSenderBalance = (senderWallet?.balance ?? 0) - amount;
    await db
      .update(walletsTable)
      .set({ balance: newSenderBalance, updatedAt: new Date() })
      .where(eq(walletsTable.userId, senderId));

    const [recipientWallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, recipient.id))
      .limit(1);

    if (recipientWallet) {
      await db
        .update(walletsTable)
        .set({ balance: recipientWallet.balance + amount, updatedAt: new Date() })
        .where(eq(walletsTable.userId, recipient.id));
    } else {
      await db.insert(walletsTable).values({ userId: recipient.id, balance: amount });
    }

    const [senderTx] = await db
      .insert(transactionsTable)
      .values({
        userId: senderId,
        type: "send",
        amount,
        description: description || `Sent to ${recipient.name}`,
        status: "success",
        recipientId: recipient.id,
        recipientName: recipient.name,
        category: "other",
      })
      .returning();

    await db.insert(transactionsTable).values({
      userId: recipient.id,
      type: "receive",
      amount,
      description: description || `Received from ${req.user!.email}`,
      status: "success",
      recipientName: req.user!.email,
      category: "other",
    });

    res.json({ transaction: senderTx, balance: newSenderBalance });
  } catch (err) {
    req.log.error({ err }, "transfer error");
    res.status(500).json({ error: "Transfer failed" });
  }
});

// POST /api/wallet/pay (NFC / tap-to-pay simulation)
router.post("/pay", requireAuth, async (req, res) => {
  try {
    const parsed = paySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { amount, description, category } = parsed.data;
    const userId = req.user!.userId;

    const [wallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, userId))
      .limit(1);

    if ((wallet?.balance ?? 0) < amount) {
      res.status(400).json({ error: "Insufficient wallet balance" });
      return;
    }

    const newBalance = (wallet?.balance ?? 0) - amount;
    await db
      .update(walletsTable)
      .set({ balance: newBalance, updatedAt: new Date() })
      .where(eq(walletsTable.userId, userId));

    const [transaction] = await db
      .insert(transactionsTable)
      .values({
        userId,
        type: "payment",
        amount,
        description,
        status: "success",
        category,
      })
      .returning();

    res.json({ transaction, balance: newBalance });
  } catch (err) {
    req.log.error({ err }, "pay error");
    res.status(500).json({ error: "Payment failed" });
  }
});

export default router;
