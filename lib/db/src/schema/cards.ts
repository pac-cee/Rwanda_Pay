import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { z } from "zod";
import { usersTable } from "./users";

export const cardsTable = pgTable("cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  last4: text("last4").notNull(),
  cardType: text("card_type").notNull().default("visa"),
  holderName: text("holder_name").notNull(),
  cardName: text("card_name").notNull().default("My Card"),
  color: text("color").notNull().default("#1B5E20"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const addCardSchema = z.object({
  last4: z.string().length(4),
  cardType: z.enum(["visa", "mastercard", "amex"]).default("visa"),
  holderName: z.string().min(1),
  cardName: z.string().optional(),
  color: z.string().optional(),
});

export type Card = typeof cardsTable.$inferSelect;
