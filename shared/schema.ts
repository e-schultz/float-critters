import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
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

// Admin sessions for authentication
export const adminSessions = pgTable("admin_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("admin_sessions_user_id_idx").on(table.userId),
  tokenIdx: index("admin_sessions_token_idx").on(table.token),
}));

// Issues table for storing zine content
export const issues = pgTable("issues", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  subtitle: text("subtitle"),
  version: text("version").notNull(),
  tagline: text("tagline"),
  intro: text("intro"),
  sections: jsonb("sections").notNull(), // JSON array of sections
  metadata: jsonb("metadata"),
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  slugIdx: index("issues_slug_idx").on(table.slug),
  publishedAtIdx: index("issues_published_at_idx").on(table.publishedAt),
}));

// Content import history
export const contentImports = pgTable("content_imports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  originalContent: text("original_content").notNull(),
  transformedContent: jsonb("transformed_content"),
  importType: text("import_type").notNull(), // 'text', 'file', 'artifact'
  status: text("status").notNull().default('pending'), // 'pending', 'transformed', 'published', 'failed'
  issueSlug: text("issue_slug"), // References issues.slug if published
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("content_imports_user_id_idx").on(table.userId),
  statusIdx: index("content_imports_status_idx").on(table.status),
  issueSlugIdx: index("content_imports_issue_slug_idx").on(table.issueSlug),
}));

export const insertAdminSessionSchema = createInsertSchema(adminSessions).omit({
  id: true,
  createdAt: true,
});

export const insertIssueSchema = createInsertSchema(issues).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertContentImportSchema = createInsertSchema(contentImports).omit({
  id: true,
  createdAt: true,
});

export type InsertSearchIndex = z.infer<typeof insertSearchIndexSchema>;
export type SearchIndex = typeof searchIndex.$inferSelect;
export type InsertBookmark = z.infer<typeof insertBookmarkSchema>;
export type Bookmark = typeof bookmarks.$inferSelect;
export type InsertAdminSession = z.infer<typeof insertAdminSessionSchema>;
export type AdminSession = typeof adminSessions.$inferSelect;
export type InsertIssue = z.infer<typeof insertIssueSchema>;
export type Issue = typeof issues.$inferSelect;
export type InsertContentImport = z.infer<typeof insertContentImportSchema>;
export type ContentImport = typeof contentImports.$inferSelect;
