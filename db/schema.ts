import { sqliteTable, text } from "drizzle-orm/sqlite-core";

export const compositions = sqliteTable("compositions", {
  map: text("map").primaryKey(),
  picks: text("picks").notNull().default("{}"),
  notes: text("notes").notNull().default(""),
  updatedAt: text("updated_at").notNull(),
});
