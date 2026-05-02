import {
  cardsTable,
  loginSchema,
  registerSchema,
  transactionsTable,
  usersTable,
  walletsTable,
} from "@workspace/db";
import { db } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { Router } from "express";
import { signToken } from "../lib/jwt.js";
import { requireAuth } from "../middlewares/requireAuth.js";

const router = Router();

function makeInitials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0]?.toUpperCase() ?? "")
    .slice(0, 2)
    .join("");
}

function publicUser(u: typeof usersTable.$inferSelect) {
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

// POST /api/auth/register
router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const { email, password, name, phone } = parsed.data;

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existing.length > 0) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const initials = makeInitials(name);

    const [user] = await db
      .insert(usersTable)
      .values({ email, passwordHash, name, phone, initials })
      .returning();

    // Create wallet with 50,000 RWF welcome balance
    const [wallet] = await db
      .insert(walletsTable)
      .values({ userId: user.id, balance: 50000 })
      .returning();

    // Seed 3 demo cards
    const seedCards = [
      { userId: user.id, last4: "8842", cardType: "visa", holderName: name, cardName: "Bank of Kigali", color: "#1B5E20", isDefault: true },
      { userId: user.id, last4: "2210", cardType: "mastercard", holderName: name, cardName: "MTN MoMo", color: "#E65100", isDefault: false },
      { userId: user.id, last4: "4471", cardType: "mastercard", holderName: name, cardName: "I&M Bank", color: "#0D47A1", isDefault: false },
    ];
    const cards = await db.insert(cardsTable).values(seedCards).returning();

    // Seed demo transactions
    const now = new Date();
    const seedTx = [
      { userId: user.id, type: "receive", amount: 50000, description: "Welcome bonus", status: "success", category: "other", recipientName: "Rwanda Pay", createdAt: new Date(now.getTime() - 1000) },
      { userId: user.id, type: "payment", amount: 12500, description: "Simba Supermarket", status: "success", category: "food", cardId: cards[0].id, createdAt: new Date(now.getTime() - 3600000) },
      { userId: user.id, type: "payment", amount: 500, description: "Nyabugogo Bus", status: "success", category: "transport", cardId: cards[1].id, createdAt: new Date(now.getTime() - 7200000) },
      { userId: user.id, type: "payment", amount: 35000, description: "Heaven Restaurant", status: "success", category: "food", cardId: cards[0].id, createdAt: new Date(now.getTime() - 86400000) },
      { userId: user.id, type: "payment", amount: 45000, description: "Kigali City Tower", status: "success", category: "shopping", cardId: cards[2].id, createdAt: new Date(now.getTime() - 172800000) },
    ];
    await db.insert(transactionsTable).values(seedTx);

    const token = signToken({ userId: user.id, email: user.email });
    res.status(201).json({ user: publicUser(user), wallet: { balance: wallet.balance }, token });
  } catch (err) {
    req.log.error({ err }, "register error");
    res.status(500).json({ error: "Registration failed" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input" });
      return;
    }
    const { email, password } = parsed.data;

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const [wallet] = await db.select().from(walletsTable).where(eq(walletsTable.userId, user.id)).limit(1);

    const token = signToken({ userId: user.id, email: user.email });
    res.json({ user: publicUser(user), wallet: { balance: wallet?.balance ?? 0 }, token });
  } catch (err) {
    req.log.error({ err }, "login error");
    res.status(500).json({ error: "Login failed" });
  }
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req, res) => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.userId))
      .limit(1);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    const [wallet] = await db
      .select()
      .from(walletsTable)
      .where(eq(walletsTable.userId, user.id))
      .limit(1);
    res.json({ user: publicUser(user), wallet: { balance: wallet?.balance ?? 0 } });
  } catch (err) {
    req.log.error({ err }, "me error");
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// PUT /api/auth/profile
router.put("/profile", requireAuth, async (req, res) => {
  try {
    const { name, phone } = req.body as { name?: string; phone?: string };
    const updates: Partial<typeof usersTable.$inferInsert> = { updatedAt: new Date() };
    if (name) {
      updates.name = name;
      updates.initials = makeInitials(name);
    }
    if (phone !== undefined) updates.phone = phone;

    const [user] = await db
      .update(usersTable)
      .set(updates)
      .where(eq(usersTable.id, req.user!.userId))
      .returning();
    res.json({ user: publicUser(user) });
  } catch (err) {
    req.log.error({ err }, "profile update error");
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// POST /api/auth/logout
router.post("/logout", requireAuth, (_req, res) => {
  res.json({ success: true });
});

export default router;
