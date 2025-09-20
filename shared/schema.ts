import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Search index for patterns and content
export const searchIndex = pgTable("search_index", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  issueSlug: text("issue_slug").notNull(),
  sectionId: text("section_id").notNull(),
  patternName: text("pattern_name").notNull(),
  content: text("content").notNull(),
  contentType: text("content_type").notNull(), // 'pattern', 'description', 'signal', 'protocol'
  searchVector: text("search_vector"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  issueSlugIdx: index("search_index_issue_slug_idx").on(table.issueSlug),
  contentTypeIdx: index("search_index_content_type_idx").on(table.contentType),
  patternNameIdx: index("search_index_pattern_name_idx").on(table.patternName),
}));

// User bookmarks
export const bookmarks = pgTable("bookmarks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  issueSlug: text("issue_slug").notNull(),
  sectionId: text("section_id"),
  patternName: text("pattern_name"),
  bookmarkType: text("bookmark_type").notNull(), // 'issue', 'section', 'pattern'
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("bookmarks_user_id_idx").on(table.userId),
  issueSlugIdx: index("bookmarks_issue_slug_idx").on(table.issueSlug),
}));

export const insertSearchIndexSchema = createInsertSchema(searchIndex).omit({
  id: true,
  createdAt: true,
});

export const insertBookmarkSchema = createInsertSchema(bookmarks).omit({
  id: true,
  createdAt: true,
});

export type InsertSearchIndex = z.infer<typeof insertSearchIndexSchema>;
export type SearchIndex = typeof searchIndex.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
