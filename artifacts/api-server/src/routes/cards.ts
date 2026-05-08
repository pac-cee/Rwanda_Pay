import { addCardSchema, cardsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// Strip sensitive fields before sending to client
function publicCard(card: typeof cardsTable.$inferSelect) {
  const { cardNumber: _cn, cvv: _cvv, ...rest } = card;
  return rest;
}

// GET /api/cards
router.get("/", requireAuth, async (req, res) => {
  try {
    const cards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.userId, req.user!.userId))
      .orderBy(cardsTable.createdAt);
    res.json({ cards: cards.map(publicCard) });
  } catch (err) {
    req.log.error({ err }, "list cards error");
    res.status(500).json({ error: "Failed to fetch cards" });
  }
});

// POST /api/cards
router.post("/", requireAuth, async (req, res) => {
  try {
    const parsed = addCardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { cardNumber, expiryDate, cvv, holderName, network, label, color } = parsed.data;

    const last4 = cardNumber.slice(-4);

    const NETWORK_COLORS: Record<string, string> = {
      visa: "#1B5E20",
      mastercard: "#E65100",
      amex: "#0D47A1",
    };

    const existingCards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.userId, req.user!.userId));
    const isFirst = existingCards.length === 0;

    const [card] = await db
      .insert(cardsTable)
      .values({
        userId: req.user!.userId,
        cardNumber,
        cvv,
        last4,
        expiryDate,
        holderName,
        network,
        label: label ?? `My ${network.charAt(0).toUpperCase() + network.slice(1)} Card`,
        color: color ?? NETWORK_COLORS[network] ?? "#1B5E20",
        isDefault: isFirst,
      })
      .returning();

    res.status(201).json({ card: publicCard(card) });
  } catch (err) {
    req.log.error({ err }, "add card error");
    res.status(500).json({ error: "Failed to add card" });
  }
});

// DELETE /api/cards/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const [card] = await db
      .select()
      .from(cardsTable)
      .where(and(eq(cardsTable.id, id!), eq(cardsTable.userId, userId)))
      .limit(1);
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    await db
      .delete(cardsTable)
      .where(and(eq(cardsTable.id, id!), eq(cardsTable.userId, userId)));

    // If deleted card was default, promote the next card
    if (card.isDefault) {
      const [next] = await db
        .select()
        .from(cardsTable)
        .where(eq(cardsTable.userId, userId))
        .limit(1);
      if (next) {
        await db
          .update(cardsTable)
          .set({ isDefault: true })
          .where(eq(cardsTable.id, next.id));
      }
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "delete card error");
    res.status(500).json({ error: "Failed to delete card" });
  }
});

// PUT /api/cards/:id/default
router.put("/:id/default", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const [card] = await db
      .select()
      .from(cardsTable)
      .where(and(eq(cardsTable.id, id!), eq(cardsTable.userId, userId)))
      .limit(1);
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }

    await db
      .update(cardsTable)
      .set({ isDefault: false })
      .where(eq(cardsTable.userId, userId));

    const [updated] = await db
      .update(cardsTable)
      .set({ isDefault: true })
      .where(eq(cardsTable.id, id!))
      .returning();

    res.json({ card: publicCard(updated) });
  } catch (err) {
    req.log.error({ err }, "set default card error");
    res.status(500).json({ error: "Failed to set default card" });
  }
});

export default router;
