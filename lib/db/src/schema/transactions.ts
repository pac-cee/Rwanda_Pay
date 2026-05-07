import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";
import { z } from "zod";
import { cardsTable } from "./cards";
import { usersTable } from "./users";

export const transactionsTable = sqliteTable("transactions", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("success"),
  cardId: text("card_id").references(() => cardsTable.id, { onDelete: "set null" }),
  recipientId: text("recipient_id").references(() => usersTable.id, { onDelete: "set null" }),
  recipientName: text("recipient_name"),
  category: text("category").notNull().default("other"),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const topupSchema = z.object({
  cardId: z.string().uuid(),
  amount: z.number().int().min(500).max(5_000_000),
});

export const transferSchema = z.object({
  recipientEmail: z.string().email(),
  amount: z.number().int().min(100),
  description: z.string().min(1),
});

export const paySchema = z.object({
  amount: z.number().int().min(1),
  description: z.string().min(1),
  category: z
    .enum(["food", "transport", "shopping", "entertainment", "health", "other"])
    .default("other"),
});

export type Transaction = typeof transactionsTable.$inferSelect;
