import {
  loginSchema,
  registerSchema,
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

    const [wallet] = await db
      .insert(walletsTable)
      .values({ userId: user.id, balance: 0 })
      .returning();

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
