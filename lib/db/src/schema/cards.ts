import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";
import { z } from "zod";
import { usersTable } from "./users";

export const cardsTable = sqliteTable("cards", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  last4: text("last4").notNull(),
  cardType: text("card_type").notNull().default("visa"),
  holderName: text("holder_name").notNull(),
  cardName: text("card_name").notNull().default("My Card"),
  color: text("color").notNull().default("#1B5E20"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const addCardSchema = z.object({
  last4: z.string().length(4),
  cardType: z.enum(["visa", "mastercard", "amex"]).default("visa"),
  holderName: z.string().min(1),
  cardName: z.string().optional(),
  color: z.string().optional(),
});

export type Card = typeof cardsTable.$inferSelect;
