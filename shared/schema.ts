import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, jsonb, index, boolean, integer } from "drizzle-orm/pg-core";
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
  isAdmin: true,
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

// Agentic Workspaces Tables

// Workspaces table for collaborative content creation
export const workspaces = pgTable("workspaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  goal: text("goal").notNull(),
  status: text("status").notNull().default('active'), // 'active', 'paused', 'completed'
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("workspaces_user_id_idx").on(table.userId),
  statusIdx: index("workspaces_status_idx").on(table.status),
}));

// Drafts table for evolving content within workspaces
export const drafts = pgTable("drafts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  content: jsonb("content").notNull(),
  outline: jsonb("outline").notNull(),
  currentRevision: integer("current_revision").notNull().default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index("drafts_workspace_id_idx").on(table.workspaceId),
}));

// Revisions table for tracking content changes
export const revisions = pgTable("revisions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  draftId: varchar("draft_id").notNull().references(() => drafts.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  content: jsonb("content").notNull(),
  metadata: jsonb("metadata").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index("revisions_workspace_id_idx").on(table.workspaceId),
  draftIdIdx: index("revisions_draft_id_idx").on(table.draftId),
}));

// Messages table for workspace conversations
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user', 'assistant'
  content: text("content").notNull(),
  sectionPath: text("section_path"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index("messages_workspace_id_idx").on(table.workspaceId),
  roleIdx: index("messages_role_idx").on(table.role),
}));

// Suggestions table for AI-generated content suggestions
export const suggestions = pgTable("suggestions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  draftId: varchar("draft_id").notNull().references(() => drafts.id, { onDelete: "cascade" }),
  sectionPath: text("section_path"),
  diff: jsonb("diff").notNull(),
  rationale: text("rationale").notNull(),
  status: text("status").notNull().default('proposed'), // 'proposed', 'applied', 'rejected'
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index("suggestions_workspace_id_idx").on(table.workspaceId),
  draftIdIdx: index("suggestions_draft_id_idx").on(table.draftId),
  statusIdx: index("suggestions_status_idx").on(table.status),
}));

// Activities table for workspace event tracking
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'message_sent', 'suggestion_applied', 'revision_created', etc.
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index("activities_workspace_id_idx").on(table.workspaceId),
  typeIdx: index("activities_type_idx").on(table.type),
}));

// Workspace resources table for file uploads and text resources
export const workspaceResources = pgTable("workspace_resources", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  workspaceId: varchar("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'file', 'text', 'url'
  content: text("content"), // File path/URL for files, actual content for text
  mimeType: text("mime_type"), // For files
  size: integer("size"), // File size in bytes
  metadata: jsonb("metadata"), // Additional metadata like original filename, description, etc.
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  workspaceIdIdx: index("workspace_resources_workspace_id_idx").on(table.workspaceId),
  typeIdx: index("workspace_resources_type_idx").on(table.type),
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

export const insertWorkspaceSchema = createInsertSchema(workspaces).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDraftSchema = createInsertSchema(drafts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertRevisionSchema = createInsertSchema(revisions).omit({
  id: true,
  createdAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertSuggestionSchema = createInsertSchema(suggestions).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertWorkspaceResourceSchema = createInsertSchema(workspaceResources).omit({
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
export type InsertWorkspace = z.infer<typeof insertWorkspaceSchema>;
export type Workspace = typeof workspaces.$inferSelect;
export type InsertDraft = z.infer<typeof insertDraftSchema>;
export type Draft = typeof drafts.$inferSelect;
export type InsertRevision = z.infer<typeof insertRevisionSchema>;
export type Revision = typeof revisions.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activities.$inferSelect;
export type InsertWorkspaceResource = z.infer<typeof insertWorkspaceResourceSchema>;
export type WorkspaceResource = typeof workspaceResources.$inferSelect;
