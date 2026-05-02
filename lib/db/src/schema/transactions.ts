import { integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { cardsTable } from "./cards";
import { usersTable } from "./users";

export const transactionsTable = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  amount: integer("amount").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("success"),
  cardId: uuid("card_id").references(() => cardsTable.id, { onDelete: "set null" }),
  recipientId: uuid("recipient_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  recipientName: text("recipient_name"),
  category: text("category").notNull().default("other"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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
