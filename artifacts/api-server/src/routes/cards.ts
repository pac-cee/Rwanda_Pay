import { addCardSchema, cardsTable } from "@workspace/db";
import { db } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

// GET /api/cards
router.get("/", requireAuth, async (req, res) => {
  try {
    const cards = await db
      .select()
      .from(cardsTable)
      .where(eq(cardsTable.userId, req.user!.userId))
      .orderBy(cardsTable.createdAt);
    res.json({ cards });
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
    const { last4, cardType, holderName, cardName, color } = parsed.data;

    const CARD_COLORS: Record<string, string> = {
      visa: "#1B5E20",
      mastercard: "#00AEEF",
      amex: "#FFD600",
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
        last4,
        cardType,
        holderName,
        cardName: cardName ?? `My ${cardType.charAt(0).toUpperCase() + cardType.slice(1)} Card`,
        color: color ?? CARD_COLORS[cardType] ?? "#1B5E20",
        isDefault: isFirst,
      })
      .returning();
    res.status(201).json({ card });
  } catch (err) {
    req.log.error({ err }, "add card error");
    res.status(500).json({ error: "Failed to add card" });
  }
});

// DELETE /api/cards/:id
router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const [card] = await db
      .select()
      .from(cardsTable)
      .where(and(eq(cardsTable.id, id!), eq(cardsTable.userId, req.user!.userId)))
      .limit(1);
    if (!card) {
      res.status(404).json({ error: "Card not found" });
      return;
    }
    await db
      .delete(cardsTable)
      .where(and(eq(cardsTable.id, id!), eq(cardsTable.userId, req.user!.userId)));
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

    // Unset all defaults for this user
    await db
      .update(cardsTable)
      .set({ isDefault: false })
      .where(eq(cardsTable.userId, userId));

    // Set this card as default
    const [updated] = await db
      .update(cardsTable)
      .set({ isDefault: true })
      .where(eq(cardsTable.id, id!))
      .returning();

    res.json({ card: updated });
  } catch (err) {
    req.log.error({ err }, "set default card error");
    res.status(500).json({ error: "Failed to set default card" });
  }
});

export default router;
