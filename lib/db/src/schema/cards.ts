import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { randomUUID } from "crypto";
import { z } from "zod";
import { usersTable } from "./users";

export const cardsTable = sqliteTable("cards", {
  id: text("id").primaryKey().$defaultFn(() => randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),

  // Sensitive — stored but NEVER returned in API responses
  cardNumber: text("card_number").notNull(),   // full 16-digit number
  cvv: text("cvv").notNull(),                  // 3 or 4 digits

  // Safe to return
  last4: text("last4").notNull(),              // last 4 digits of cardNumber (derived)
  expiryDate: text("expiry_date").notNull(),   // MM/YY
  holderName: text("holder_name").notNull(),   // name printed on card
  network: text("network").notNull().default("visa"),  // visa | mastercard | amex
  label: text("label").notNull().default("My Card"),   // user's nickname
  color: text("color").notNull().default("#1B5E20"),
  isDefault: integer("is_default", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(() => new Date()).notNull(),
});

export const addCardSchema = z.object({
  cardNumber: z.string().regex(/^\d{16}$/, "Card number must be exactly 16 digits"),
  expiryDate: z.string().regex(/^(0[1-9]|1[0-2])\/\d{2}$/, "Expiry must be MM/YY"),
  cvv: z.string().regex(/^\d{3,4}$/, "CVV must be 3 or 4 digits"),
  holderName: z.string().min(1),
  network: z.enum(["visa", "mastercard", "amex"]).default("visa"),
  label: z.string().optional(),
  color: z.string().optional(),
});

export type Card = typeof cardsTable.$inferSelect;

// What we return to the client — sensitive fields stripped
export type PublicCard = Omit<Card, "cardNumber" | "cvv">;
